// Job Circular BD - pure logic (no DOM, no storage).
// Works in the browser (window.JCBLogic) and in Node (module.exports).
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.JCBLogic = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var APP = 'job-circular-bd';
  var VERSION = 1;

  var SECTORS = ['govt', 'bank', 'private', 'ngo', 'edu'];
  var GRADES = ['cadre', '9', '10', '11-13', '14-16', '17-20', 'na'];
  var STATUSES = ['saved', 'applied', 'fee-paid', 'admit', 'exam', 'result', 'selected', 'rejected'];
  // Linear pipeline; 'rejected' is a terminal side-state, 'selected' is the goal.
  var NEXT_STATUS = {
    saved: 'applied',
    applied: 'fee-paid',
    'fee-paid': 'admit',
    admit: 'exam',
    exam: 'result',
    result: 'selected',
    selected: null,
    rejected: null,
  };

  var MAX = { org: 80, post: 100, venue: 120, notes: 300, vacancies: 99999, fee: 5000 };

  function isDateStr(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    var d = new Date(s + 'T00:00:00Z');
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }

  // Whole days from today (date-only, UTC) to the given date string.
  // Negative = past. todayStr is 'YYYY-MM-DD' (defaults to real today).
  function daysLeft(dateStr, todayStr) {
    if (!isDateStr(dateStr)) return null;
    var today = todayStr || new Date().toISOString().slice(0, 10);
    var a = Date.parse(today + 'T00:00:00Z');
    var b = Date.parse(dateStr + 'T00:00:00Z');
    return Math.round((b - a) / 86400000);
  }

  function isInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  }

  // Validate a circular object. Returns an object of field -> error code.
  // Codes: 'required' | 'too-long' | 'vacancies' | 'fee' | 'date' | 'url' | 'exam-order'
  function validateCircular(c) {
    var e = {};
    if (!c || typeof c !== 'object') return { _form: 'required' };
    if (!c.org || !String(c.org).trim()) e.org = 'required';
    else if (String(c.org).trim().length > MAX.org) e.org = 'too-long';
    if (!c.post || !String(c.post).trim()) e.post = 'required';
    else if (String(c.post).trim().length > MAX.post) e.post = 'too-long';
    if (SECTORS.indexOf(c.sector) === -1) e.sector = 'required';
    if (GRADES.indexOf(c.grade) === -1) e.grade = 'required';
    if (!isInt(c.vacancies) || c.vacancies < 1 || c.vacancies > MAX.vacancies) e.vacancies = 'vacancies';
    if (!isDateStr(c.deadline)) e.deadline = 'date';
    if (!isInt(c.fee) || c.fee < 0 || c.fee > MAX.fee) e.fee = 'fee';
    if (c.source && String(c.source).trim() !== '') {
      if (!/^https?:\/\/\S+$/.test(String(c.source).trim())) e.source = 'url';
    }
    if (c.examDate && String(c.examDate).trim() !== '') {
      if (!isDateStr(c.examDate)) e.examDate = 'date';
      else if (isDateStr(c.deadline) && c.examDate < c.deadline) e.examDate = 'exam-order';
    }
    if (c.venue && String(c.venue).length > MAX.venue) e.venue = 'too-long';
    if (c.notes && String(c.notes).length > MAX.notes) e.notes = 'too-long';
    if (STATUSES.indexOf(c.status) === -1) e.status = 'required';
    return e;
  }

  function normalizeCircular(c) {
    return {
      id: String(c.id || ''),
      org: String(c.org || '').trim(),
      post: String(c.post || '').trim(),
      sector: c.sector,
      grade: c.grade,
      vacancies: c.vacancies,
      deadline: c.deadline,
      fee: c.fee,
      feePaid: c.feePaid === true,
      source: String(c.source || '').trim(),
      examDate: String(c.examDate || '').trim(),
      venue: String(c.venue || '').trim(),
      status: c.status,
      notes: String(c.notes || '').trim(),
      createdAt: c.createdAt || new Date().toISOString(),
    };
  }

  function blankState() {
    return { app: APP, v: VERSION, circulars: [] };
  }

  // Strict import validation: returns { ok: true, state } or { ok: false, error }.
  function parseImport(text) {
    var data;
    try { data = JSON.parse(text); } catch (err) { return { ok: false, error: 'bad-json' }; }
    if (!data || typeof data !== 'object' || data.app !== APP || data.v !== VERSION) {
      return { ok: false, error: 'bad-app' };
    }
    if (!Array.isArray(data.circulars)) return { ok: false, error: 'bad-shape' };
    var seen = {};
    for (var i = 0; i < data.circulars.length; i++) {
      var c = data.circulars[i];
      if (!c || typeof c !== 'object' || typeof c.id !== 'string' || !c.id) {
        return { ok: false, error: 'bad-id' };
      }
      if (seen[c.id]) return { ok: false, error: 'dup-id' };
      seen[c.id] = true;
      if (Object.keys(validateCircular(c)).length > 0) {
        return { ok: false, error: 'bad-circular' };
      }
    }
    return { ok: true, state: { app: APP, v: VERSION, circulars: data.circulars.map(normalizeCircular) } };
  }

  function stats(circulars, todayStr) {
    var total = circulars.length;
    var active = 0, closingSoon = 0, applied = 0, feesPaid = 0, exams = 0;
    var byStatus = {};
    STATUSES.forEach(function (s) { byStatus[s] = 0; });
    circulars.forEach(function (c) {
      var dl = daysLeft(c.deadline, todayStr);
      if (dl !== null && dl >= 0) active++;
      if (dl !== null && dl >= 0 && dl <= 7) closingSoon++;
      if (c.status !== 'saved') applied++;
      if (c.feePaid) feesPaid += c.fee;
      if (c.examDate) {
        var ed = daysLeft(c.examDate, todayStr);
        if (ed !== null && ed >= 0 && ed <= 30) exams++;
      }
      if (byStatus[c.status] !== undefined) byStatus[c.status]++;
    });
    return { total: total, active: active, closingSoon: closingSoon, applied: applied, feesPaid: feesPaid, exams: exams, byStatus: byStatus };
  }

  // Circulars closing within 7 days (incl. today), soonest first.
  function closingSoonList(circulars, todayStr) {
    return circulars
      .filter(function (c) {
        var dl = daysLeft(c.deadline, todayStr);
        return dl !== null && dl >= 0 && dl <= 7;
      })
      .sort(function (a, b) { return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0; });
  }

  function filterCirculars(circulars, opts) {
    var q = (opts.q || '').trim().toLowerCase();
    return circulars.filter(function (c) {
      if (opts.sector && c.sector !== opts.sector) return false;
      if (opts.status && c.status !== opts.status) return false;
      if (opts.closingSoon) {
        var dl = daysLeft(c.deadline, opts.todayStr);
        if (dl === null || dl < 0 || dl > 7) return false;
      }
      if (q) {
        var hay = (c.org + ' ' + c.post).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function sortCirculars(circulars, mode) {
    var arr = circulars.slice();
    if (mode === 'fee') {
      arr.sort(function (a, b) { return b.fee - a.fee; });
    } else if (mode === 'newest') {
      arr.sort(function (a, b) { return b.createdAt < a.createdAt ? -1 : b.createdAt > a.createdAt ? 1 : 0; });
    } else {
      arr.sort(function (a, b) { return a.deadline < b.deadline ? -1 : a.deadline > b.deadline ? 1 : 0; });
    }
    return arr;
  }

  function newId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  return {
    APP: APP, VERSION: VERSION, SECTORS: SECTORS, GRADES: GRADES, STATUSES: STATUSES,
    NEXT_STATUS: NEXT_STATUS, MAX: MAX,
    isDateStr: isDateStr, daysLeft: daysLeft, validateCircular: validateCircular,
    normalizeCircular: normalizeCircular, blankState: blankState, parseImport: parseImport,
    stats: stats, closingSoonList: closingSoonList, filterCirculars: filterCirculars,
    sortCirculars: sortCirculars, newId: newId,
  };
});
