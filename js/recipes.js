/* ==========================================================================
   Josh & Jordan's Kitchen — /recipes/ hub filter, Wake Lock, and print bar
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Hub category filter ---------- */
  var filterBar = document.querySelector('[data-recipe-filters]');
  if (filterBar) {
    var buttons = Array.prototype.slice.call(filterBar.querySelectorAll('[data-recipe-filter]'));
    var cards = Array.prototype.slice.call(document.querySelectorAll('[data-recipe-card]'));
    var countEl = document.querySelector('[data-recipe-count]');

    var applyFilter = function (filter) {
      var shown = 0;
      buttons.forEach(function (btn) {
        var active = btn.getAttribute('data-recipe-filter') === filter;
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      cards.forEach(function (card) {
        var match = filter === 'all' || card.getAttribute('data-category') === filter;
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (countEl) {
        if (filter === 'one-pan-dinners') {
          countEl.textContent = 'Showing ' + shown + (shown === 1 ? ' One-Pan Dinner' : ' One-Pan Dinners');
        } else if (filter === 'dips-and-sides') {
          countEl.textContent = 'Showing ' + shown + (shown === 1 ? ' Dip & Side' : ' Dips & Sides');
        } else {
          countEl.textContent = 'Showing ' + shown + (shown === 1 ? ' playbook' : ' playbooks');
        }
      }
    };

    filterBar.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-recipe-filter]');
      if (!btn) return;
      var filter = btn.getAttribute('data-recipe-filter') || 'all';
      applyFilter(filter);
      if (typeof gtag === 'function') {
        gtag('event', 'recipe_filter', { filter_category: filter });
      }
    });
  }

  /* ---------- Counter Mode (Screen Wake Lock) ---------- */
  var wakeBtn = document.querySelector('[data-wake-lock]');
  var wakeStatus = document.querySelector('[data-wake-status]');
  if (wakeBtn) {
    var supported = typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      navigator.wakeLock &&
      typeof navigator.wakeLock.request === 'function';

    if (!supported) {
      wakeBtn.hidden = true;
    } else {
      var sentinel = null;
      var wantAwake = false;

      var setStatus = function (msg) {
        if (wakeStatus) wakeStatus.textContent = msg;
      };

      var syncWakeUI = function (active) {
        wakeBtn.setAttribute('aria-pressed', active ? 'true' : 'false');
        wakeBtn.textContent = active ? 'Screen Awake: On' : 'Keep Screen Awake';
      };

      var requestLock = function (fromToggle) {
        return navigator.wakeLock.request('screen').then(function (lock) {
          sentinel = lock;
          syncWakeUI(true);
          setStatus('Screen will stay awake while you cook.');
          if (fromToggle && typeof gtag === 'function') {
            gtag('event', 'recipe_wake_lock', { enabled: true });
          }
          lock.addEventListener('release', function () {
            sentinel = null;
            if (!wantAwake) {
              syncWakeUI(false);
            }
          });
        }).catch(function () {
          wantAwake = false;
          sentinel = null;
          syncWakeUI(false);
          setStatus('Could not lock screen — check browser or battery settings.');
        });
      };

      wakeBtn.addEventListener('click', function () {
        if (wantAwake) {
          wantAwake = false;
          if (sentinel) {
            sentinel.release().catch(function () {});
            sentinel = null;
          }
          syncWakeUI(false);
          setStatus('Screen wake lock off.');
          if (typeof gtag === 'function') {
            gtag('event', 'recipe_wake_lock', { enabled: false });
          }
        } else {
          wantAwake = true;
          requestLock(true);
        }
      });

      document.addEventListener('visibilitychange', function () {
        if (wantAwake && !sentinel && document.visibilityState === 'visible') {
          requestLock(false);
        }
      });
    }
  }

  /* ---------- Print Playbook ---------- */
  var printBtn = document.querySelector('[data-print-recipe]');
  if (printBtn) {
    printBtn.addEventListener('click', function () {
      if (typeof gtag === 'function') {
        gtag('event', 'recipe_print', { page_path: window.location.pathname });
      }
      window.print();
    });
  }
})();
