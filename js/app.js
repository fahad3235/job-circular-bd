// Job Circular BD - UI wiring (DOM only; logic lives in js/logic.js).
(function () {
  'use strict';

  var L = window.JCBLogic;
  var BN = window.JCB_I18N_BN || {};

  var EN = {
    appTitle: 'Job Circular BD',
    appTagline: 'Track Bangladesh job circulars \u2014 deadlines, fees and exams in one place.',
    tabDash: 'Dashboard', tabList: 'Circulars', tabAdd: 'Add', tabData: 'Data',
    dashTitle: 'Dashboard',
    dashEmpty: 'No circulars added yet. Add your first circular to start tracking.',
    statTotal: 'Total circulars', statActive: 'Active', statClosingSoon: 'Closing soon',
    statApplied: 'Applied', statFeesPaid: 'Total fees paid', statExams: 'Upcoming exams',
    closingSoonTitle: 'Closing soon',
    closingToday: 'Closes today', closingTomorrow: 'Closes tomorrow',
    daysLeft: 'days left', closed: 'Closed',
    listTitle: 'All circulars',
    listEmpty: 'No circulars found. Change the filters or add a new circular.',
    searchPh: 'Search organisation or post\u2026',
    filterSector: 'All sectors', filterStatus: 'All statuses',
    filterClosingSoon: 'Closing soon only',
    sortDeadline: 'By deadline', sortNewest: 'Newest first', sortFee: 'By fee',
    formTitleAdd: 'Add a new circular', formTitleEdit: 'Edit circular',
    fOrg: 'Organisation name', fPost: 'Post name', fSector: 'Sector', fGrade: 'Grade',
    fVacancies: 'Number of vacancies', fDeadline: 'Application deadline',
    fFee: 'Application fee (\u09f3)', fFeePaid: 'Fee paid',
    fSource: 'Circular link (optional)', fExamDate: 'Exam date (optional)',
    fVenue: 'Exam centre (optional)', fStatus: 'Status', fNotes: 'Notes (optional)',
    saveBtn: 'Save', cancelBtn: 'Cancel',
    savedMsg: 'Circular saved.', updatedMsg: 'Circular updated.', deletedMsg: 'Circular deleted.',
    errRequired: 'This field is required.',
    errTooLong: 'Too long \u2014 maximum {n} characters.',
    errVacancies: 'Enter a number from 1 to 99,999.',
    errFee: 'Enter a fee from 0 to 5,000.',
    errDate: 'Enter a valid date.',
    errUrl: 'Enter a valid link (starting with http:// or https://).',
    errExamBeforeDeadline: 'Exam date cannot be before the deadline.',
    editBtn: 'Edit', deleteBtn: 'Delete', advanceBtn: 'Next step',
    sourceLink: 'View circular',
    dataTitle: 'Data management',
    exportBtn: 'Download backup (JSON)', importBtn: 'Import backup',
    importOk: 'Backup imported successfully.',
    importBad: 'Invalid backup file \u2014 nothing changed.',
    eraseBtn: 'Erase all data', eraseOk: 'All data erased.', eraseKeep: 'Wrong word \u2014 data unchanged.',
    statusSaved: 'Saved', statusApplied: 'Applied', statusFeePaid: 'Fee paid',
    statusAdmit: 'Admit card received', statusExam: 'Exam done', statusResult: 'Result out',
    statusSelected: 'Selected', statusRejected: 'Rejected',
    sectorGovt: 'Government', sectorBank: 'Bank', sectorPrivate: 'Private',
    sectorNgo: 'NGO', sectorEdu: 'Education',
    gradeCadre: 'BCS Cadre', grade9: '9th Grade', grade10: '10th Grade',
    grade11: '11th\u201313th Grade', grade14: '14th\u201316th Grade', grade17: '17th\u201320th Grade',
    gradeNa: 'Not applicable',
    vacanciesLabel: 'Vacancies', feeLabel: 'Fee', paidLabel: 'Paid', unpaidLabel: 'Unpaid',
    examLabel: 'Exam', deadlineLabel: 'Deadline',
    confirmDelete: 'Delete this circular?',
    noExams: 'No exams in the next 30 days.',
    footerNote: 'This app ships with no circular data \u2014 you enter everything yourself. Always verify deadlines and fees against the official circular.',
  };

  var state = window.JCBData.load() || L.blankState();
  var lang = window.JCBData.loadLang();
  var editingId = null;

  var BN_DIGITS = ['\u09e6', '\u09e7', '\u09e8', '\u09e9', '\u09ea', '\u09eb', '\u09ec', '\u09ed', '\u09ee', '\u09ef'];
  function digits(s) {
    s = String(s);
    if (lang !== 'bn') return s;
    return s.replace(/[0-9]/g, function (d) { return BN_DIGITS[+d]; });
  }
  function t(key) {
    if (lang === 'bn' && BN[key]) return BN[key];
    return EN[key] || key;
  }
  function fmtNum(n) {
    return digits(Number(n).toLocaleString('en-US'));
  }
  function fmtMoney(n) {
    return '\u09f3' + fmtNum(n);
  }
  function statusLabel(s) {
    var map = { saved: 'statusSaved', applied: 'statusApplied', 'fee-paid': 'statusFeePaid', admit: 'statusAdmit', exam: 'statusExam', result: 'statusResult', selected: 'statusSelected', rejected: 'statusRejected' };
    return t(map[s] || 'statusSaved');
  }
  function sectorLabel(s) {
    return t({ govt: 'sectorGovt', bank: 'sectorBank', private: 'sectorPrivate', ngo: 'sectorNgo', edu: 'sectorEdu' }[s]);
  }
  function gradeLabel(g) {
    return t({ cadre: 'gradeCadre', '9': 'grade9', '10': 'grade10', '11-13': 'grade11', '14-16': 'grade14', '17-20': 'grade17', na: 'gradeNa' }[g]);
  }
  function daysLabel(dl) {
    if (dl === null) return '';
    if (dl < 0) return t('closed');
    if (dl === 0) return t('closingToday');
    if (dl === 1) return t('closingTomorrow');
    return digits(dl) + ' ' + t('daysLeft');
  }
  function todayStr() { return new Date().toISOString().slice(0, 10); }

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  // ---- i18n ----
  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(function (n) { n.setAttribute('placeholder', t(n.dataset.i18nPh)); });
    $('app-title').textContent = t('appTitle');
    $('lang-toggle').textContent = lang === 'bn' ? 'English' : '\u09ac\u09be\u0982\u09b2\u09be';
    document.documentElement.lang = lang === 'bn' ? 'bn' : 'en';
    buildSelectOptions();
    renderAll();
  }
  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'bn' ? 'en' : 'bn';
    window.JCBData.saveLang(lang);
    applyLang();
  });

  // ---- selects ----
  function buildSelectOptions() {
    var fs = $('filter-sector');
    var keepFs = fs.value;
    fs.innerHTML = '';
    fs.appendChild(new Option(t('filterSector'), ''));
    L.SECTORS.forEach(function (s) { fs.appendChild(new Option(sectorLabel(s), s)); });
    fs.value = keepFs;

    var fst = $('filter-status');
    var keepFst = fst.value;
    fst.innerHTML = '';
    fst.appendChild(new Option(t('filterStatus'), ''));
    L.STATUSES.forEach(function (s) { fst.appendChild(new Option(statusLabel(s), s)); });
    fst.value = keepFst;

    var fsec = $('f-sector');
    var keepSec = fsec.value;
    fsec.innerHTML = '';
    fsec.appendChild(new Option('\u2014', ''));
    L.SECTORS.forEach(function (s) { fsec.appendChild(new Option(sectorLabel(s), s)); });
    fsec.value = keepSec;

    var fg = $('f-grade');
    var keepG = fg.value;
    fg.innerHTML = '';
    fg.appendChild(new Option('\u2014', ''));
    L.GRADES.forEach(function (g) { fg.appendChild(new Option(gradeLabel(g), g)); });
    fg.value = keepG;

    var fst2 = $('f-status');
    var keepSt = fst2.value || 'saved';
    fst2.innerHTML = '';
    L.STATUSES.forEach(function (s) { fst2.appendChild(new Option(statusLabel(s), s)); });
    fst2.value = keepSt;
  }

  // ---- tabs ----
  function showTab(name) {
    document.querySelectorAll('.tab-btn').forEach(function (b) {
      b.classList.toggle('active', b.dataset.tab === name);
    });
    document.querySelectorAll('.tab-panel').forEach(function (p) {
      p.hidden = p.id !== 'tab-' + name;
    });
  }
  document.querySelectorAll('.tab-btn').forEach(function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });

  // ---- dashboard ----
  function renderDash() {
    var s = L.stats(state.circulars, todayStr());
    var box = $('dash-stats');
    $('dash-empty').hidden = state.circulars.length > 0;
    box.hidden = state.circulars.length === 0;
    if (state.circulars.length === 0) { $('closing-list').innerHTML = ''; $('closing-title').hidden = true; return; }
    var items = [
      [s.total, t('statTotal'), false],
      [s.active, t('statActive'), false],
      [s.closingSoon, t('statClosingSoon'), s.closingSoon > 0],
      [s.applied, t('statApplied'), false],
      [fmtMoney(s.feesPaid), t('statFeesPaid'), false],
      [s.exams, t('statExams'), false],
    ];
    box.innerHTML = '';
    items.forEach(function (it) {
      var d = el('div', 'stat' + (it[2] ? ' warn' : ''));
      d.appendChild(el('span', 'num', String(it[0])));
      d.appendChild(el('span', 'lbl', it[1]));
      box.appendChild(d);
    });
    var soon = L.closingSoonList(state.circulars, todayStr());
    $('closing-title').hidden = soon.length === 0;
    var ul = $('closing-list');
    ul.innerHTML = '';
    soon.forEach(function (c) {
      var dl = L.daysLeft(c.deadline, todayStr());
      var li = el('li');
      li.appendChild(el('span', null, c.org + ' \u2014 ' + c.post));
      var b = el('span', dl === 0 ? 'urgent' : 'soon', daysLabel(dl));
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  // ---- list ----
  function renderList() {
    var opts = {
      q: $('search').value,
      sector: $('filter-sector').value || null,
      status: $('filter-status').value || null,
      closingSoon: $('filter-closing').checked,
      todayStr: todayStr(),
    };
    var list = L.sortCirculars(L.filterCirculars(state.circulars, opts), $('sort-select').value);
    $('list-empty').hidden = list.length > 0;
    var box = $('circ-list');
    box.innerHTML = '';
    list.forEach(function (c) {
      var dl = L.daysLeft(c.deadline, todayStr());
      var card = el('div', 'card' + (dl !== null && dl < 0 ? ' closed' : ''));
      card.appendChild(el('h3', null, c.post));
      card.appendChild(el('p', 'org', c.org));

      var pills = el('div');
      var sp = el('span', 'pill status-' + c.status, statusLabel(c.status));
      pills.appendChild(sp);
      var dp = el('span', 'pill ' + (dl === 0 ? 'deadline-today' : dl !== null && dl >= 0 && dl <= 7 ? 'deadline-soon' : dl !== null && dl < 0 ? 'deadline-closed' : ''), daysLabel(dl));
      pills.appendChild(dp);
      card.appendChild(pills);

      var meta = el('div', 'meta');
      meta.appendChild(el('span', null, sectorLabel(c.sector) + ' \u00b7 ' + gradeLabel(c.grade)));
      meta.appendChild(el('span', null, t('vacanciesLabel') + ': ' + fmtNum(c.vacancies)));
      meta.appendChild(el('span', null, t('deadlineLabel') + ': ' + digits(c.deadline)));
      meta.appendChild(el('span', null, t('feeLabel') + ': ' + fmtMoney(c.fee) + ' (' + (c.feePaid ? t('paidLabel') : t('unpaidLabel')) + ')'));
      if (c.examDate) meta.appendChild(el('span', null, t('examLabel') + ': ' + digits(c.examDate) + (c.venue ? ' \u00b7 ' + c.venue : '')));
      card.appendChild(meta);

      if (c.source) {
        var a = el('a', null, t('sourceLink'));
        a.href = c.source;
        a.target = '_blank';
        a.rel = 'noopener';
        card.appendChild(a);
      }
      if (c.notes) card.appendChild(el('p', 'notes', c.notes));

      var actions = el('div', 'card-actions');
      var next = L.NEXT_STATUS[c.status];
      if (next) {
        var adv = el('button', 'btn small primary', t('advanceBtn') + ': ' + statusLabel(next));
        adv.type = 'button';
        adv.dataset.advance = c.id;
        actions.appendChild(adv);
      }
      var edit = el('button', 'btn small', t('editBtn'));
      edit.type = 'button';
      edit.dataset.edit = c.id;
      actions.appendChild(edit);
      var del = el('button', 'btn small danger', t('deleteBtn'));
      del.type = 'button';
      del.dataset.delete = c.id;
      actions.appendChild(del);
      card.appendChild(actions);
      box.appendChild(card);
    });
  }

  $('circ-list').addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.edit) { startEdit(b.dataset.edit); return; }
    if (b.dataset.delete) {
      if (!window.confirm(t('confirmDelete'))) return;
      state.circulars = state.circulars.filter(function (c) { return c.id !== b.dataset.delete; });
      window.JCBData.save(state);
      setMsg($('form-msg'), t('deletedMsg'), true);
      renderAll();
      return;
    }
    if (b.dataset.advance) {
      var c = state.circulars.find(function (x) { return x.id === b.dataset.advance; });
      if (c && L.NEXT_STATUS[c.status]) {
        c.status = L.NEXT_STATUS[c.status];
        if (c.status === 'fee-paid') c.feePaid = true;
        window.JCBData.save(state);
        renderAll();
      }
    }
  });

  ['search', 'filter-sector', 'filter-status', 'filter-closing', 'sort-select'].forEach(function (id) {
    $(id).addEventListener('input', renderList);
    $(id).addEventListener('change', renderList);
  });

  // ---- form ----
  function setMsg(node, text, ok) {
    node.textContent = text;
    node.className = 'msg ' + (ok ? 'ok' : 'bad');
  }
  function clearErrors() {
    document.querySelectorAll('#circ-form .err').forEach(function (n) { n.textContent = ''; });
  }
  function errText(code, field) {
    if (code === 'too-long') return t('errTooLong').replace('{n}', String(L.MAX[field] || ''));
    if (code === 'vacancies') return t('errVacancies');
    if (code === 'fee') return t('errFee');
    if (code === 'date') return t('errDate');
    if (code === 'url') return t('errUrl');
    if (code === 'exam-order') return t('errExamBeforeDeadline');
    return t('errRequired');
  }
  function readForm() {
    return {
      id: editingId || L.newId(),
      org: $('f-org').value,
      post: $('f-post').value,
      sector: $('f-sector').value,
      grade: $('f-grade').value,
      vacancies: $('f-vacancies').value === '' ? NaN : Number($('f-vacancies').value),
      deadline: $('f-deadline').value,
      fee: $('f-fee').value === '' ? NaN : Number($('f-fee').value),
      feePaid: $('f-feepaid').checked,
      source: $('f-source').value,
      examDate: $('f-examdate').value,
      venue: $('f-venue').value,
      status: $('f-status').value,
      notes: $('f-notes').value,
      createdAt: editingId ? (state.circulars.find(function (c) { return c.id === editingId; }) || {}).createdAt : new Date().toISOString(),
    };
  }
  function startEdit(id) {
    var c = state.circulars.find(function (x) { return x.id === id; });
    if (!c) return;
    editingId = id;
    $('f-org').value = c.org;
    $('f-post').value = c.post;
    $('f-sector').value = c.sector;
    $('f-grade').value = c.grade;
    $('f-vacancies').value = String(c.vacancies);
    $('f-deadline').value = c.deadline;
    $('f-fee').value = String(c.fee);
    $('f-feepaid').checked = c.feePaid;
    $('f-source').value = c.source;
    $('f-examdate').value = c.examDate;
    $('f-venue').value = c.venue;
    $('f-status').value = c.status;
    $('f-notes').value = c.notes;
    $('form-title').textContent = t('formTitleEdit');
    $('cancel-edit').hidden = false;
    setMsg($('form-msg'), '', true);
    clearErrors();
    showTab('add');
    $('f-org').focus();
  }
  function resetForm() {
    editingId = null;
    $('circ-form').reset();
    $('f-fee').value = '0';
    $('f-status').value = 'saved';
    $('form-title').textContent = t('formTitleAdd');
    $('cancel-edit').hidden = true;
    clearErrors();
  }
  $('cancel-edit').addEventListener('click', function () {
    resetForm();
    setMsg($('form-msg'), '', true);
  });
  $('circ-form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    clearErrors();
    var c = readForm();
    var errors = L.validateCircular(c);
    var keys = Object.keys(errors);
    if (keys.length > 0) {
      keys.forEach(function (k) {
        var node = $('err-' + (k === 'examDate' ? 'examdate' : k));
        if (node) node.textContent = errText(errors[k], k);
      });
      setMsg($('form-msg'), '', true);
      return;
    }
    var norm = L.normalizeCircular(c);
    if (editingId) {
      var idx = state.circulars.findIndex(function (x) { return x.id === editingId; });
      if (idx >= 0) state.circulars[idx] = norm;
      setMsg($('form-msg'), t('updatedMsg'), true);
    } else {
      state.circulars.push(norm);
      setMsg($('form-msg'), t('savedMsg'), true);
    }
    window.JCBData.save(state);
    resetForm();
    renderAll();
  });

  // ---- data tab ----
  function renderData() {
    $('data-count').textContent = state.circulars.length === 0
      ? t('dashEmpty')
      : fmtNum(state.circulars.length) + ' ' + t('statTotal').toLowerCase() + '.';
  }
  $('export-btn').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'job-circular-bd-backup.json';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('import-file').addEventListener('change', function (ev) {
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      var ok = importText(String(reader.result || ''));
      setMsg($('data-msg'), ok ? t('importOk') : t('importBad'), ok);
      ev.target.value = '';
    };
    reader.readAsText(file);
  });
  $('erase-btn').addEventListener('click', function () {
    var answer = window.prompt('Type DELETE to erase all data');
    if (answer !== 'DELETE') { setMsg($('data-msg'), t('eraseKeep'), false); return; }
    state = L.blankState();
    window.JCBData.save(state);
    resetForm();
    setMsg($('data-msg'), t('eraseOk'), true);
    renderAll();
  });

  function importText(text) {
    var res = L.parseImport(text);
    if (!res.ok) return false;
    state = res.state;
    window.JCBData.save(state);
    renderAll();
    return true;
  }

  function renderAll() {
    renderDash();
    renderList();
    renderData();
  }

  // Test hook (used by the smoke harness; not a public API).
  window.JCB = {
    importText: importText,
    exportText: function () { return JSON.stringify(state); },
    getState: function () { return state; },
  };

  applyLang();
})();
