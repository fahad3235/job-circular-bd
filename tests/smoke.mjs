// Headless-Chrome smoke test for Job Circular BD.
// Drives the Playwright-cached headless_shell over CDP with Node's built-in
// WebSocket (no npm deps). Run from the project root:
//   node tests/smoke.mjs [1280|390]
// Exits 0 only if every check passes.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = path.join(process.env.HOME, '.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell');
const PORT = 9233;
const WIDTH = parseInt(process.argv[2] || '1280', 10);
const HEIGHT = WIDTH <= 480 ? 844 : 800;
const URL = 'file://' + path.join(ROOT, 'index.html');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? ' :: ' + extra : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout = 15000, label = 'condition') {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    try { if (await fn()) return true; } catch { /* retry */ }
    await sleep(150);
  }
  throw new Error('timeout waiting for ' + label);
}

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--disable-gpu',
  '--remote-debugging-port=' + PORT,
  '--window-size=' + WIDTH + ',' + HEIGHT,
  'about:blank',
], { stdio: 'ignore' });

let ws;
try {
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      targets = await res.json();
      break;
    } catch { await sleep(250); }
  }
  if (!targets) throw new Error('DevTools endpoint never came up');

  const pageTarget = targets.find((t) => t.type === 'page');
  ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const consoleErrors = [];
  const failedReqs = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleErrors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value || a.description || '').join(' '));
    }
    if (msg.method === 'Network.loadingFailed') {
      failedReqs.push(msg.params.errorText);
    }
  };
  const send = (method, params = {}) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, resolve);
    ws.send(JSON.stringify({ id: mid, method, params }));
  });
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result?.exceptionDetails) throw new Error('page JS error: ' + JSON.stringify(r.result.exceptionDetails));
    return r.result?.result?.value;
  };
  const setVal = async (elId, value) => {
    await evalJs(`document.getElementById("${elId}").value = ${JSON.stringify(value)}`);
    await evalJs(`document.getElementById("${elId}").dispatchEvent(new Event("input", { bubbles: true }))`);
  };
  const setSelect = async (elId, value) => {
    await evalJs(`document.getElementById("${elId}").value = ${JSON.stringify(value)}`);
    await evalJs(`document.getElementById("${elId}").dispatchEvent(new Event("change", { bubbles: true }))`);
  };
  const setCheck = async (elId, checked) => {
    await evalJs(`document.getElementById("${elId}").checked = ${checked}`);
    await evalJs(`document.getElementById("${elId}").dispatchEvent(new Event("change", { bubbles: true }))`);
  };
  const circCount = () => evalJs('(JSON.parse(localStorage.getItem("job-circular-bd-v1") || "{}").circulars || []).length');
  const clickTab = async (name) => {
    await evalJs(`[...document.querySelectorAll(".tab-btn")].find(b => b.dataset.tab === "${name}").click()`);
    await sleep(250);
  };
  const fillForm = async (o) => {
    await setVal('f-org', o.org);
    await setVal('f-post', o.post);
    await setSelect('f-sector', o.sector);
    await setSelect('f-grade', o.grade);
    await setVal('f-vacancies', o.vacancies);
    await setVal('f-deadline', o.deadline);
    await setVal('f-fee', o.fee);
    await setCheck('f-feepaid', !!o.feePaid);
    await setVal('f-source', o.source || '');
    await setVal('f-examdate', o.examDate || '');
    await setVal('f-venue', o.venue || '');
    await setSelect('f-status', o.status || 'saved');
    await setVal('f-notes', o.notes || '');
  };

  await send('Runtime.enable');
  await send('Page.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: WIDTH, height: HEIGHT, deviceScaleFactor: 1, mobile: WIDTH <= 480 });
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'page load');
  await sleep(500);
  await evalJs('localStorage.clear()');
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'reload');
  await sleep(500);

  console.log(`smoke @ ${WIDTH}x${HEIGHT}: ${URL}`);
  check('page title', (await evalJs('document.title')).includes('Job Circular BD'));
  check('app heading rendered', (await evalJs('document.querySelector("h1").textContent')) === 'Job Circular BD');
  check('4 tabs rendered', (await evalJs('document.querySelectorAll(".tab-btn").length')) === 4);
  check('dashboard empty state visible', (await evalJs('getComputedStyle(document.getElementById("dash-empty")).display')) !== 'none');
  check('no console errors on load', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests on load', failedReqs.length === 0, failedReqs.join(' | '));

  // ---- Validation first: empty submit ----
  await clickTab('add');
  await evalJs('document.querySelector("#circ-form button[type=submit]").click()');
  await sleep(300);
  check('empty submit shows org error', (await evalJs('document.getElementById("err-org").textContent')).length > 0);
  check('empty submit shows post error', (await evalJs('document.getElementById("err-post").textContent')).length > 0);
  check('empty submit shows sector error', (await evalJs('document.getElementById("err-sector").textContent')).length > 0);
  check('empty submit shows vacancies error', (await evalJs('document.getElementById("err-vacancies").textContent')).length > 0);
  check('empty submit shows deadline error', (await evalJs('document.getElementById("err-deadline").textContent')).length > 0);
  check('empty submit adds nothing', (await circCount()) === 0);

  // ---- Bad URL + exam before deadline rejected ----
  await fillForm({ org: 'Test Org', post: 'Test Post', sector: 'govt', grade: 'na', vacancies: '5', deadline: '2026-12-10', fee: '100', source: 'not-a-url', examDate: '2026-12-01' });
  await evalJs('document.querySelector("#circ-form button[type=submit]").click()');
  await sleep(300);
  check('bad URL shows error', (await evalJs('document.getElementById("err-source").textContent')).length > 0);
  check('exam before deadline shows error', (await evalJs('document.getElementById("err-examdate").textContent')).length > 0);
  check('invalid form adds nothing', (await circCount()) === 0);

  // ---- Add circular 1: CAG Junior Auditor, deadline 2026-11-30 (5 days), fee 112 paid ----
  await fillForm({ org: 'Office of the Comptroller and Auditor General', post: 'Junior Auditor', sector: 'govt', grade: '14-16', vacancies: '70', deadline: '2026-11-30', fee: '112', feePaid: true, status: 'applied', notes: 'Apply via Teletalk' });
  await evalJs('document.querySelector("#circ-form button[type=submit]").click()');
  await sleep(400);
  check('circular 1 saved', (await circCount()) === 1);
  check('success message shown', (await evalJs('document.getElementById("form-msg").textContent')).includes('saved'));

  // ---- Add circular 2: Bangladesh Bank AD, deadline 2026-12-20, fee 500 unpaid ----
  await fillForm({ org: 'Bangladesh Bank', post: 'Assistant Director', sector: 'bank', grade: '9', vacancies: '100', deadline: '2026-12-20', fee: '500', feePaid: false, status: 'saved', source: 'https://www.bb.org.bd', examDate: '2027-01-10' });
  await evalJs('document.querySelector("#circ-form button[type=submit]").click()');
  await sleep(400);
  check('circular 2 saved', (await circCount()) === 2);

  // ---- Dashboard totals ----
  await clickTab('dash');
  const dashText = await evalJs('document.getElementById("dash-stats").textContent');
  check('dashboard total 2', dashText.includes('2'), dashText);
  check('dashboard fees paid \u09f3112', dashText.includes('112'), dashText);
  check('dashboard closing soon 1', (await evalJs('document.querySelectorAll("#closing-list li").length')) === 1);
  check('closing list names CAG', (await evalJs('document.getElementById("closing-list").textContent')).includes('Junior Auditor'));

  // ---- List: search + filters + sort ----
  await clickTab('list');
  check('list shows 2 cards', (await evalJs('document.querySelectorAll("#circ-list .card").length')) === 2);
  await setVal('search', 'bangladesh bank');
  await sleep(300);
  check('search bank -> 1 card', (await evalJs('document.querySelectorAll("#circ-list .card").length')) === 1);
  await setVal('search', '');
  await sleep(300);
  await setSelect('filter-sector', 'govt');
  await sleep(300);
  check('sector govt -> 1 card', (await evalJs('document.querySelectorAll("#circ-list .card").length')) === 1);
  await setSelect('filter-sector', '');
  await sleep(300);
  await setCheck('filter-closing', true);
  await sleep(300);
  check('closing-soon filter -> 1 card', (await evalJs('document.querySelectorAll("#circ-list .card").length')) === 1);
  await setCheck('filter-closing', false);
  await sleep(300);
  await setSelect('sort-select', 'fee');
  await sleep(300);
  check('sort fee desc first = Assistant Director', (await evalJs('document.querySelector("#circ-list .card h3").textContent')) === 'Assistant Director');

  // ---- Advance: Bangladesh Bank saved -> applied ----
  await evalJs('[...document.querySelectorAll("#circ-list [data-advance]")].find(b => b.closest(".card").textContent.includes("Bangladesh Bank")).click()');
  await sleep(300);
  check('advance moves BB to Applied', (await evalJs('[...document.querySelectorAll("#circ-list .card")].find(c => c.textContent.includes("Bangladesh Bank")).querySelector(".pill").textContent')) === 'Applied');

  // ---- Edit: CAG fee 112 -> 200 ----
  await evalJs('[...document.querySelectorAll("#circ-list [data-edit]")].find(b => b.closest(".card").textContent.includes("Junior Auditor")).click()');
  await sleep(300);
  check('edit mode title shown', (await evalJs('document.getElementById("form-title").textContent')).includes('Edit'));
  await setVal('f-fee', '200');
  await evalJs('document.querySelector("#circ-form button[type=submit]").click()');
  await sleep(400);
  check('edit saved, still 2 circulars', (await circCount()) === 2);
  await clickTab('dash');
  check('dashboard fees paid now \u09f3200', (await evalJs('document.getElementById("dash-stats").textContent')).includes('200'));

  // ---- Delete with confirm ----
  await clickTab('list');
  await evalJs('window.confirm = () => true');
  await evalJs('[...document.querySelectorAll("#circ-list [data-delete]")].find(b => b.closest(".card").textContent.includes("Bangladesh Bank")).click()');
  await sleep(400);
  check('delete leaves 1 circular', (await circCount()) === 1);

  // ---- Import / export via test hook ----
  const good = JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [
    { id: 'x1', org: 'BRAC', post: 'Programme Organiser', sector: 'ngo', grade: 'na', vacancies: 50, deadline: '2026-12-15', fee: 0, feePaid: false, source: '', examDate: '', venue: '', status: 'saved', notes: '', createdAt: '2026-11-25T00:00:00.000Z' },
    { id: 'x2', org: 'Sonali Bank', post: 'Officer', sector: 'bank', grade: '10', vacancies: 200, deadline: '2026-12-28', fee: 500, feePaid: true, source: '', examDate: '2027-01-20', venue: 'Dhaka', status: 'fee-paid', notes: '', createdAt: '2026-11-25T00:00:00.000Z' },
  ] });
  check('import good backup returns true', (await evalJs(`window.JCB.importText(${JSON.stringify(good)})`)) === true);
  check('import replaced with 2 circulars', (await circCount()) === 2);
  check('bad import returns false', (await evalJs('window.JCB.importText("{bad json")')) === false);
  check('bad import keeps 2 circulars', (await circCount()) === 2);

  // ---- XSS: markup in org renders inert ----
  const xss = JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [
    { id: 'x9', org: '<img src=x onerror=alert(1)>', post: 'Clerk', sector: 'govt', grade: 'na', vacancies: 1, deadline: '2026-12-15', fee: 0, feePaid: false, source: '', examDate: '', venue: '', status: 'saved', notes: '', createdAt: '2026-11-25T00:00:00.000Z' },
  ] });
  await evalJs(`window.JCB.importText(${JSON.stringify(xss)})`);
  await clickTab('list');
  await sleep(300);
  check('XSS org renders as text, no img element', (await evalJs('document.querySelectorAll("#circ-list img").length')) === 0);
  check('XSS org visible as text', (await evalJs('document.getElementById("circ-list").textContent')).includes('<img'));

  // ---- Erase-all: wrong text, then DELETE ----
  await clickTab('data');
  await evalJs('window.prompt = () => "delete"');
  await evalJs('document.getElementById("erase-btn").click()');
  await sleep(300);
  check('wrong erase text keeps items', (await circCount()) === 1);
  await evalJs('window.prompt = () => "DELETE"');
  await evalJs('document.getElementById("erase-btn").click()');
  await sleep(300);
  check('DELETE erases all', (await circCount()) === 0);

  // ---- Bangla toggle + persistence across reload ----
  await clickTab('dash');
  await evalJs('document.getElementById("lang-toggle").click()');
  await sleep(400);
  check('BN toggle: heading is Bengali', (await evalJs('document.querySelector("h1").textContent')).includes('\u099a\u09be\u0995\u09b0\u09bf\u09b0 \u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf'));
  await evalJs(`window.JCB.importText(${JSON.stringify(good)})`);
  await sleep(300);
  check('BN toggle: fees paid shows Bengali digits', (await evalJs('document.getElementById("dash-stats").textContent')).includes('\u09eb\u09e6\u09e6'));
  await send('Page.navigate', { url: URL });
  await waitFor(async () => (await evalJs('document.readyState')) === 'complete', 15000, 'reload after BN toggle');
  await sleep(500);
  check('BN persists across reload', (await evalJs('document.querySelector("h1").textContent')).includes('\u099a\u09be\u0995\u09b0\u09bf\u09b0 \u09ac\u09bf\u099c\u09cd\u099e\u09aa\u09cd\u09a4\u09bf'));
  check('circulars persist across reload', (await circCount()) === 2);

  check('no console errors at end', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('no failed requests at end', failedReqs.length === 0, failedReqs.join(' | '));
  check('no horizontal overflow', (await evalJs('document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1')) === true,
    'scrollWidth=' + (await evalJs('document.documentElement.scrollWidth')) + ' clientWidth=' + (await evalJs('document.documentElement.clientWidth')));

  // Screenshot for the run log.
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot.result?.data) {
    fs.writeFileSync(path.join(ROOT, 'tests', `smoke-${WIDTH}.png`), Buffer.from(shot.result.data, 'base64'));
    console.log('  screenshot saved: tests/smoke-' + WIDTH + '.png');
  }

  console.log(`\nsmoke @ ${WIDTH}: ${pass} passed, ${fail} failed`);
  chrome.kill();
  process.exit(fail ? 1 : 0);
} catch (err) {
  console.error('SMOKE ERROR:', err.message);
  try { chrome.kill(); } catch { /* already dead */ }
  process.exit(1);
}
