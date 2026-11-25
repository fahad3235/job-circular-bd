// Node unit tests for js/logic.js - run: node tests/test.js
const L = require('../js/logic.js');

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra !== undefined ? ' :: ' + JSON.stringify(extra) : '')); }
}

const TODAY = '2026-11-25';
function circ(over) {
  return Object.assign({
    id: 'c1', org: 'Bangladesh Bank', post: 'Assistant Director', sector: 'bank',
    grade: '9', vacancies: 100, deadline: '2026-12-20', fee: 500, feePaid: false,
    source: '', examDate: '', venue: '', status: 'saved', notes: '',
    createdAt: '2026-11-25T00:00:00.000Z',
  }, over || {});
}

// --- isDateStr / daysLeft ---
check('valid date', L.isDateStr('2026-12-20') === true);
check('rejects 2026-13-01', L.isDateStr('2026-13-01') === false);
check('rejects 2026-02-30', L.isDateStr('2026-02-30') === false);
check('rejects garbage', L.isDateStr('tomorrow') === false);
check('daysLeft today=0', L.daysLeft('2026-11-25', TODAY) === 0);
check('daysLeft +7', L.daysLeft('2026-12-02', TODAY) === 7);
check('daysLeft past=-5', L.daysLeft('2026-11-20', TODAY) === -5);
check('daysLeft bad date=null', L.daysLeft('nope', TODAY) === null);

// --- validateCircular ---
check('valid circular has no errors', Object.keys(L.validateCircular(circ())).length === 0);
check('missing org', L.validateCircular(circ({ org: '  ' })).org === 'required');
check('missing post', L.validateCircular(circ({ post: '' })).post === 'required');
check('org too long', L.validateCircular(circ({ org: 'x'.repeat(81) })).org === 'too-long');
check('post too long', L.validateCircular(circ({ post: 'x'.repeat(101) })).post === 'too-long');
check('bad sector', L.validateCircular(circ({ sector: 'mars' })).sector === 'required');
check('bad grade', L.validateCircular(circ({ grade: '99' })).grade === 'required');
check('vacancies 0', L.validateCircular(circ({ vacancies: 0 })).vacancies === 'vacancies');
check('vacancies 100000', L.validateCircular(circ({ vacancies: 100000 })).vacancies === 'vacancies');
check('vacancies 1 ok', !L.validateCircular(circ({ vacancies: 1 })).vacancies);
check('fee -1', L.validateCircular(circ({ fee: -1 })).fee === 'fee');
check('fee 5001', L.validateCircular(circ({ fee: 5001 })).fee === 'fee');
check('fee 5000 ok', !L.validateCircular(circ({ fee: 5000 })).fee);
check('bad deadline', L.validateCircular(circ({ deadline: '2026-02-30' })).deadline === 'date');
check('bad source url', L.validateCircular(circ({ source: 'not-a-url' })).source === 'url');
check('ftp source rejected', L.validateCircular(circ({ source: 'ftp://x.com/a' })).source === 'url');
check('https source ok', !L.validateCircular(circ({ source: 'https://example.com/c' })).source);
check('exam before deadline', L.validateCircular(circ({ examDate: '2026-12-01' })).examDate === 'exam-order');
check('exam after deadline ok', !L.validateCircular(circ({ examDate: '2027-01-10' })).examDate);
check('exam same day as deadline ok', !L.validateCircular(circ({ examDate: '2026-12-20' })).examDate);
check('bad status', L.validateCircular(circ({ status: 'maybe' })).status === 'required');
check('notes too long', L.validateCircular(circ({ notes: 'x'.repeat(301) })).notes === 'too-long');

// --- stats ---
const list = [
  circ({ id: 'a', deadline: '2026-11-25', fee: 500, feePaid: true, status: 'applied', examDate: '2026-12-05' }),
  circ({ id: 'b', deadline: '2026-11-30', fee: 700, feePaid: false, status: 'saved', examDate: '2027-02-01' }),
  circ({ id: 'c', deadline: '2026-11-20', fee: 200, feePaid: true, status: 'rejected' }),
  circ({ id: 'd', deadline: '2026-12-25', fee: 0, feePaid: false, status: 'saved' }),
];
const s = L.stats(list, TODAY);
check('stats total 4', s.total === 4);
check('stats active 3 (one past)', s.active === 3);
check('stats closingSoon 2 (today + 5d)', s.closingSoon === 2);
check('stats applied 2', s.applied === 2);
check('stats feesPaid 700 (500+200)', s.feesPaid === 700);
check('stats exams 1 (Dec 5 within 30d; Feb 1 not)', s.exams === 1);
check('stats byStatus applied=1', s.byStatus.applied === 1);
check('stats byStatus saved=2', s.byStatus.saved === 2);

// --- closingSoonList ---
const soon = L.closingSoonList(list, TODAY);
check('closingSoon length 2', soon.length === 2);
check('closingSoon soonest first (a then b)', soon[0].id === 'a' && soon[1].id === 'b');

// --- filter / sort ---
check('filter sector bank=4', L.filterCirculars(list, { sector: 'bank' }).length === 4);
check('filter status saved=2', L.filterCirculars(list, { status: 'saved' }).length === 2);
check('filter q assistant=4', L.filterCirculars(list, { q: 'assistant' }).length === 4);
check('filter q bangladesh=4', L.filterCirculars(list, { q: 'BANGLADESH' }).length === 4);
check('filter q zzz=0', L.filterCirculars(list, { q: 'zzz' }).length === 0);
check('filter closingSoon=2', L.filterCirculars(list, { closingSoon: true, todayStr: TODAY }).length === 2);
const sortedFee = L.sortCirculars(list, 'fee');
check('sort fee desc first=700', sortedFee[0].fee === 700 && sortedFee[3].fee === 0);
const sortedDl = L.sortCirculars(list, 'deadline');
check('sort deadline first=2026-11-20', sortedDl[0].deadline === '2026-11-20');

// --- NEXT_STATUS pipeline ---
check('next saved->applied', L.NEXT_STATUS.saved === 'applied');
check('next applied->fee-paid', L.NEXT_STATUS.applied === 'fee-paid');
check('next result->selected', L.NEXT_STATUS.result === 'selected');
check('next selected=null', L.NEXT_STATUS.selected === null);
check('next rejected=null', L.NEXT_STATUS.rejected === null);

// --- parseImport ---
const good = JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [circ({ id: 'x1' }), circ({ id: 'x2', org: 'CAG' })] });
const imp = L.parseImport(good);
check('import good ok', imp.ok === true);
check('import good count 2', imp.ok && imp.state.circulars.length === 2);
check('import bad json', L.parseImport('{bad').ok === false);
check('import wrong app', L.parseImport(JSON.stringify({ app: 'other', v: 1, circulars: [] })).ok === false);
check('import wrong version', L.parseImport(JSON.stringify({ app: 'job-circular-bd', v: 2, circulars: [] })).ok === false);
check('import dup id', L.parseImport(JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [circ({ id: 'd' }), circ({ id: 'd' })] })).ok === false);
check('import invalid circular', L.parseImport(JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [circ({ vacancies: 0 })] })).ok === false);
check('import missing id', L.parseImport(JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [circ({ id: '' })] })).ok === false);
check('import empty list ok', L.parseImport(JSON.stringify({ app: 'job-circular-bd', v: 1, circulars: [] })).ok === true);

// --- normalize ---
const n = L.normalizeCircular(circ({ org: '  CAG  ', feePaid: 1, source: ' https://x.bd ' }));
check('normalize trims org', n.org === 'CAG');
check('normalize feePaid coerces to bool', n.feePaid === false);
check('normalize trims source', n.source === 'https://x.bd');

console.log(`\nunit: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
