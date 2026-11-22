/* ==========================================================================
   Josh & Jordan's Kitchen — theme switcher
   --------------------------------------------------------------------------
   Load this in <head> as a plain (non-deferred, non-module) script so the
   theme is applied BEFORE first paint — no flash of the wrong theme.

     <script src="/js/theme.js"></script>

   API (window.JJKTheme):
     JJKTheme.themes            -> [{ id, label }]
     JJKTheme.get()             -> 'cream' | 'mint' | 'rust' | 'cast-iron'
     JJKTheme.set('mint')       -> applies + persists; returns the id
     JJKTheme.cycle()           -> next theme in order
     JJKTheme.reset()           -> forget the stored choice, follow system
     JJKTheme.onChange(fn)      -> fn(id) on every change; returns unsubscribe

   Markup hooks (auto-wired on DOMContentLoaded):
     <button data-theme-set="mint">…</button>  -> sets that theme
     <button data-theme-cycle>…</button>       -> cycles
     Buttons inside .theme-switch get aria-pressed kept in sync.

   Per-section override needs no JS: <section data-theme="rust"> just works.
   ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'jjk-theme';
  var DEFAULT_LIGHT = 'cream';
  var DEFAULT_DARK = 'cast-iron';          // used when no stored choice and OS prefers dark
  var THEMES = [
    { id: 'cream',     label: 'Cream' },
    { id: 'mint',      label: 'Mint' },
    { id: 'rust',      label: 'Rust' },
    { id: 'cast-iron', label: 'Cast iron' }
  ];
  var IDS = THEMES.map(function (t) { return t.id; });
  var root = document.documentElement;
  var listeners = [];

  function valid(id) { return IDS.indexOf(id) !== -1; }

  function stored() {
    try { var v = localStorage.getItem(STORAGE_KEY); return valid(v) ? v : null; } catch (e) { return null; }
  }
  function store(id) {
    try { if (id) localStorage.setItem(STORAGE_KEY, id); else localStorage.removeItem(STORAGE_KEY); } catch (e) { /* private mode etc. */ }
  }
  function systemPrefersDark() {
    try { return window.matchMedia('(prefers-color-scheme: dark)').matches; } catch (e) { return false; }
  }
  function resolveInitial() {
    var s = stored(); if (s) return s;
    var attr = root.getAttribute('data-theme'); if (valid(attr)) return attr;   // server-rendered default
    return systemPrefersDark() ? DEFAULT_DARK : DEFAULT_LIGHT;
  }

  function apply(id, opts) {
    if (!valid(id)) id = DEFAULT_LIGHT;
    var prev = root.getAttribute('data-theme');
    root.setAttribute('data-theme', id);

    // keep the browser chrome (mobile address bar) in step. The colour comes from
    // the stylesheet (--bg of the active theme) so no hex lives in this file;
    // tokens.css must be linked BEFORE this script for that to resolve.
    try {
      var bgc = getComputedStyle(root).getPropertyValue('--bg').trim();
      if (bgc) {
        var meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) { meta = document.createElement('meta'); meta.name = 'theme-color'; document.head.appendChild(meta); }
        meta.content = bgc;
      }
    } catch (e) {}

    if (!opts || opts.persist !== false) store(id);
    syncButtons(id);
    if (prev !== id) {
      for (var j = 0; j < listeners.length; j++) { try { listeners[j](id, prev); } catch (e) {} }
      try { root.dispatchEvent(new CustomEvent('jjk:themechange', { detail: { theme: id, previous: prev } })); } catch (e) {}
    }
    return id;
  }

  function syncButtons(id) {
    if (!document.body) return;
    var btns = document.querySelectorAll('[data-theme-set]');
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i], on = b.getAttribute('data-theme-set') === id;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  // ---- apply immediately (before paint) ----
  apply(resolveInitial(), { persist: false });

  // follow the OS only while the user hasn't chosen
  try {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onMq = function (e) { if (!stored()) apply(e.matches ? DEFAULT_DARK : DEFAULT_LIGHT, { persist: false }); };
    if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
  } catch (e) {}

  // cross-tab sync
  window.addEventListener('storage', function (e) {
    if (e.key === STORAGE_KEY && valid(e.newValue)) apply(e.newValue, { persist: false });
  });

  // wire buttons
  function wire() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest ? e.target.closest('[data-theme-set],[data-theme-cycle]') : null;
      if (!t) return;
      if (t.hasAttribute('data-theme-cycle')) { api.cycle(); return; }
      api.set(t.getAttribute('data-theme-set'));
    });
    syncButtons(root.getAttribute('data-theme'));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire); else wire();

  var api = {
    themes: THEMES.map(function (t) { return { id: t.id, label: t.label }; }),
    get: function () { return root.getAttribute('data-theme'); },
    set: function (id) { return apply(id); },
    cycle: function () { var i = IDS.indexOf(api.get()); return apply(IDS[(i + 1) % IDS.length]); },
    reset: function () { store(null); return apply(systemPrefersDark() ? DEFAULT_DARK : DEFAULT_LIGHT, { persist: false }); },
    onChange: function (fn) { listeners.push(fn); return function () { var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }; }
  };
  window.JJKTheme = api;
})();
