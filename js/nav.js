/* Site header: mobile disclosure menu.
   Markup: <header class="site-header" id="site-header">
             <button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">…</button>
             <nav class="site-nav" id="site-nav">…</nav>
   Toggles [data-nav-open] on the header; closes on Escape, outside click, resize past the breakpoint,
   and when a link inside is activated. Load with `defer`. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  if (!header) return;
  var toggle = header.querySelector('.nav-toggle');
  var nav = header.querySelector('.site-nav');
  if (!toggle || !nav) return;
  var mq = window.matchMedia('(min-width: 900px)');

  function setOpen(open) {
    header.toggleAttribute('data-nav-open', open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      var first = nav.querySelector('a, button');
      if (first) first.focus({ preventScroll: true });
    }
  }
  function isOpen() { return header.hasAttribute('data-nav-open'); }

  toggle.addEventListener('click', function () { setOpen(!isOpen()); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });
  var onMq = function (e) { if (e.matches) setOpen(false); };
  if (mq.addEventListener) mq.addEventListener('change', onMq); else mq.addListener(onMq);

  // mark the current page in the menu (static sites: compare pathname)
  var here = location.pathname.replace(/index\.html$/, '');
  nav.querySelectorAll('a[href]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href || /^(https?:|mailto:|#)/.test(href)) return;
    var path = new URL(href, location.href).pathname.replace(/index\.html$/, '');
    if (path !== '/' && here.indexOf(path) === 0) a.setAttribute('aria-current', 'page');
    else if (path === '/' && here === '/') a.setAttribute('aria-current', 'page');
  });
})();
