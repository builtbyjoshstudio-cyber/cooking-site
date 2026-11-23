/* Brings a returning visitor's saved tool data over from tools.builtbyjoshstudio.com, where these tools lived
   until 2026-11-22. Browser storage belongs to one origin, so the data stayed behind when the tools moved.

   How: if this page's own keys are missing here (or the nutrition recipe is still the untouched example), load
   tools.builtbyjoshstudio.com/migrate.html in a hidden frame and ask it for the old values. It answers only this
   origin, by exact origin. Give up after about 2 seconds; the tool has already started and never waits.
   Reload once if one of this page's own keys took the old site's data (in this tab or another), so the tool shows
   it. A change the visitor made meanwhile never causes a reload.

   Never overwrites a visitor's own data here:
   - most keys are written only when missing here;
   - savedNutritionRecipe also replaces the untouched example (the nutrition tool saves its example on load);
   - savedCustomIngredients merges: old entries whose names are not already here are added as clean, typed
     copies; nothing here is removed or changed.
   One answer (even an empty one) is remembered, so the frame is not loaded again.
   Only if the frame got no answer does the tool's example note offer "Bring my saved data from the old tools site",
   which opens the same page in a small window (a top-level window always sees the old data). */
(function () {
  'use strict';
  var OLD = 'https://tools.builtbyjoshstudio.com';
  var BRIDGE = OLD + '/migrate.html';
  var DONE = 'bbj-migrate-done-v1';            // set after one answer, from the frame or the window
  var RELOADED = 'bbj-migrate-reloaded';        // sessionStorage: reload at most once per tab
  var TIMEOUT = 2000;

  // Every key any cooking tool may bring over (one request brings them all), and the keys each page shows.
  var ALL_KEYS = ['tynkr-cost-per-serving-calculator-v1', 'savedNutritionRecipe', 'savedCustomIngredients', 'savedRecipe'];
  var PAGES = {
    '/tools/cost-per-serving-calculator/': ['tynkr-cost-per-serving-calculator-v1'],
    '/tools/recipe-nutrition-calculator/': ['savedNutritionRecipe', 'savedCustomIngredients'],
    '/tools/universal-recipe-scaler/': ['savedRecipe']
  };
  // The nutrition tool's untouched example (EXAMPLE_RECIPE in its script.js): length and FNV-1a hash.
  // site-tools/audit/migrate-test.js checks this still matches the tool.
  var EXAMPLES = { savedNutritionRecipe: { length: 124, fnv: '0a5f2768' } };

  function fnv(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return ('0000000' + h.toString(16)).slice(-8);
  }
  function isExample(key, value) {
    var ex = EXAMPLES[key];
    return !!ex && typeof value === 'string' && value.length === ex.length && fnv(value) === ex.fnv;
  }
  function get(key) { try { return localStorage.getItem(key); } catch (e) { return undefined; } }
  function set(key, value) { try { localStorage.setItem(key, value); return true; } catch (e) { return false; } }
  function newId() { return Date.now().toString(36) + Math.random().toString(36).substring(2, 5); }

  var page = location.pathname.replace(/index\.html$/, '');
  var mine = PAGES[page];
  if (!mine) return;
  if (get(DONE) === undefined) return;          // storage blocked: nothing can be saved here anyway

  // Does this page have nothing of the visitor's own yet?
  function needsData() {
    return mine.some(function (k) { var v = get(k); return v === null || isExample(k, v); });
  }
  function snapshot() { var s = {}; mine.forEach(function (k) { s[k] = get(k); }); return s; }
  // True when one of this page's keys took the old site's data since the snapshot (here, or in another tab):
  // a plain key now holds the old value; the custom ingredients now include an old name they lacked before.
  // A change the visitor made meanwhile matches neither, so it never causes a reload.
  function namesOf(raw) {
    var out = Object.create(null), list;
    try { list = raw ? JSON.parse(raw) : []; } catch (e) { return out; }
    if (Array.isArray(list)) list.forEach(function (x) { if (x && typeof x.name === 'string') out[x.name.trim().toLowerCase()] = true; });
    return out;
  }
  function imported(snap, data) {
    return mine.some(function (k) {
      var v = get(k);
      if (v === snap[k] || typeof data[k] !== 'string') return false;
      if (k !== 'savedCustomIngredients') return v === data[k];
      var before = namesOf(snap[k]), now = namesOf(v), old = namesOf(data[k]);
      return Object.keys(old).some(function (n) { return now[n] && !before[n]; });
    });
  }

  // A clean, typed copy of an old custom ingredient (the nutrition tool renders these fields)
  function cleanCustom(x) {
    if (!x || typeof x !== 'object' || typeof x.name !== 'string') return null;
    var name = x.name.trim().slice(0, 200);
    if (!name) return null;
    var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
    return { id: newId(), name: name, weight: num(x.weight), mode: x.mode === 'per-100g' ? 'per-100g' : 'total',
             cal: num(x.cal), protein: num(x.protein), carbs: num(x.carbs), fat: num(x.fat), fiber: num(x.fiber), sodium: num(x.sodium) };
  }

  // Merge custom ingredients by name; never change or drop what is here.
  function mergeCustoms(oldRaw) {
    var oldList, curList;
    try { oldList = JSON.parse(oldRaw); } catch (e) { return false; }
    if (!Array.isArray(oldList)) return false;
    var curRaw = get('savedCustomIngredients');
    try { curList = curRaw ? JSON.parse(curRaw) : []; } catch (e) { return false; }   // unreadable here: leave it
    if (!Array.isArray(curList)) return false;
    var norm = function (n) { return String(n).trim().toLowerCase(); };
    var names = Object.create(null);
    curList.forEach(function (x) { if (x && typeof x.name === 'string') names[norm(x.name)] = true; });
    var added = 0;
    oldList.forEach(function (x) {
      var item = cleanCustom(x);
      if (!item || names[norm(item.name)]) return;
      names[norm(item.name)] = true;
      curList.push(item); added++;
    });
    return added > 0 && set('savedCustomIngredients', JSON.stringify(curList));
  }

  // Write what came back; returns how many keys changed.
  function apply(data) {
    var changed = 0;
    ALL_KEYS.forEach(function (k) {
      if (!Object.prototype.hasOwnProperty.call(data, k) || typeof data[k] !== 'string') return;
      var old = data[k], cur = get(k);
      if (k === 'savedCustomIngredients') { if (mergeCustoms(old)) changed++; return; }
      if (old === cur || isExample(k, old)) return;                     // nothing to bring
      if (k === 'tynkr-cost-per-serving-calculator-v1') {
        try { JSON.parse(old); } catch (e) { return; }                  // the ledger must be readable JSON
      }
      if (cur === null || isExample(k, cur)) { if (set(k, old)) changed++; }
    });
    return changed;
  }

  // Record the answer; reload once if this page's own keys took the old site's data. Returns true when reloading.
  function settle(snap, data) {
    set(DONE, String(Date.now()));
    if (!imported(snap, data)) return false;
    var reloaded = null;
    try { reloaded = sessionStorage.getItem(RELOADED); sessionStorage.setItem(RELOADED, '1'); }
    catch (e) { reloaded = null; }              // sessionStorage blocked: reload anyway; DONE stops a second ask
    if (reloaded) return false;
    location.reload();
    return true;
  }

  // Ask a bridge window (hidden frame or small window) for the data. cb(data, or null on timeout).
  function ask(win, timeout, cb) {
    var id = Math.random().toString(36).slice(2), settled = false, timer;
    function done(data) {
      if (settled) return; settled = true;
      clearTimeout(timer); window.removeEventListener('message', onMessage); cb(data);
    }
    function onMessage(e) {
      if (e.origin !== OLD || !win() || e.source !== win() || !e.data) return;
      if (e.data.type === 'bbj-migrate-ready') {
        win().postMessage({ type: 'bbj-migrate-request', id: id, keys: ALL_KEYS }, OLD);
      } else if (e.data.type === 'bbj-migrate-data' && e.data.id === id && e.data.data && typeof e.data.data === 'object') {
        done(e.data.data);
      }
    }
    window.addEventListener('message', onMessage);
    timer = setTimeout(function () { done(null); }, timeout);
  }

  // The manual route, offered only when the hidden frame got no answer: a button in the tool's example note
  // (the note is shown only while the visitor has nothing of their own here).
  function offerButton() {
    var note = document.getElementById('example-note');
    if (!note || document.getElementById('bbj-migrate-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bbj-migrate-btn';
    btn.className = 'btn btn--ghost';
    btn.style.cssText = 'display:block;margin-top:8px;white-space:normal;max-width:100%;line-height:1.3;text-align:left';
    btn.textContent = 'Bring my saved data from the old tools site';
    var status = document.createElement('span');
    status.id = 'bbj-migrate-status';
    status.setAttribute('role', 'status');
    status.tabIndex = -1;
    status.style.cssText = 'display:block;margin-top:6px';
    function say(text, final) {
      status.textContent = text;
      if (final) { btn.remove(); status.focus(); }
    }
    btn.addEventListener('click', function () {
      var popup = window.open(BRIDGE, 'bbj-migrate', 'popup,width=420,height=240');
      if (!popup) { say('Your browser blocked the small window. Allow pop-ups for this site and try again.'); return; }
      btn.disabled = true;
      var snap = snapshot();
      ask(function () { return popup; }, 15000, function (data) {
        try { popup.close(); } catch (e) { /* already closed */ }
        btn.disabled = false;
        if (data === null) { say("Couldn't reach the old tools site. Please try again."); return; }
        var found = ALL_KEYS.some(function (k) { return typeof data[k] === 'string'; });
        var wrote = apply(data);
        if (settle(snap, data)) return;         // reloading to show the data
        if (!found) say('No saved data from the old tools site in this browser.', true);
        else if (wrote) say('Your data was brought over. Reload the page to see it.', true);
        else say('Nothing new to bring over.', true);
      });
    });
    note.appendChild(btn);
    note.appendChild(status);
  }

  function start() {
    if (get(DONE) !== null || !needsData()) return;    // asked once already, or nothing missing here
    var snap = snapshot();
    var frame = document.createElement('iframe');
    frame.src = BRIDGE;
    frame.title = 'Data bridge';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
    ask(function () { return frame.contentWindow; }, TIMEOUT, function (data) {
      frame.remove();
      if (data === null) { offerButton(); return; }      // blocked or slow: the tool carries on; offer the button
      apply(data);
      settle(snap, data);
    });
  }

  // Run after the tool has set itself up (its script is deferred too and comes first), so nothing waits on us.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
