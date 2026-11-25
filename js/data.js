// Job Circular BD - localStorage persistence (no network, no secrets).
(function (root) {
  'use strict';
  var KEY = 'job-circular-bd-v1';
  var LANG_KEY = 'job-circular-bd-lang';

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.app !== 'job-circular-bd' || data.v !== 1 || !Array.isArray(data.circulars)) return null;
      return data;
    } catch (e) { return null; }
  }

  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) { return false; }
  }

  function loadLang() {
    try {
      var l = localStorage.getItem(LANG_KEY);
      return l === 'bn' ? 'bn' : 'en';
    } catch (e) { return 'en'; }
  }

  function saveLang(lang) {
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) { /* ignore */ }
  }

  root.JCBData = { load: load, save: save, loadLang: loadLang, saveLang: saveLang };
})(typeof self !== 'undefined' ? self : this);
