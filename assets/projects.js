/* MATIN SHAPE — Projects page behaviors
   (hero automation map, expandable system cards, 3D tilt, filter a11y) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Featured automation map: activate on scroll ---------- */
  var autoMap = document.getElementById('autoMap');
  if (autoMap) {
    if (reduceMotion) {
      autoMap.classList.add('active');
    } else {
      var mapObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            autoMap.classList.add('active');
            mapObserver.disconnect();
          }
        });
      }, { threshold: 0.35 });
      mapObserver.observe(autoMap);
    }
  }

  /* ---------- Expandable "View System" panels ---------- */
  document.querySelectorAll('.sys-cta[aria-controls]').forEach(function (btn) {
    var card = btn.closest('.sys-card');
    var panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (!card || !panel) return;

    btn.addEventListener('click', function () {
      var opening = !card.classList.contains('open');
      card.classList.toggle('open', opening);
      btn.setAttribute('aria-expanded', String(opening));
      btn.querySelector('.sys-cta-label').textContent = opening ? 'Close System' : 'View System';
      if (opening) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
        if (window.MSObserve) MSObserve.log('click', { label: 'view_system:' + (card.dataset.sys || 'unknown') });
      } else {
        panel.style.maxHeight = '0px';
      }
    });
  });
  /* keep expanded panels sized correctly if the viewport changes */
  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      document.querySelectorAll('.sys-card.open .sys-detail').forEach(function (panel) {
        panel.style.maxHeight = panel.scrollHeight + 'px';
      });
    }, 150);
  });

  /* ---------- 3D tilt + glare on system cards ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.sys-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.transform =
          'translateY(-6px) perspective(1100px)' +
          ' rotateX(' + ((0.5 - py) * 3.2).toFixed(2) + 'deg)' +
          ' rotateY(' + ((px - 0.5) * 3.2).toFixed(2) + 'deg)';
        card.style.setProperty('--mx', (px * 100) + '%');
        card.style.setProperty('--my', (py * 100) + '%');
      });
      card.addEventListener('mouseleave', function () { card.style.transform = ''; });
    });
  }

  /* ---------- Filter buttons: aria-pressed sync ---------- */
  var filterBar = document.getElementById('filterBar');
  if (filterBar) {
    var btns = filterBar.querySelectorAll('.filter-btn');
    btns.forEach(function (b) {
      b.setAttribute('aria-pressed', b.classList.contains('active') ? 'true' : 'false');
      b.addEventListener('click', function () {
        btns.forEach(function (o) {
          o.setAttribute('aria-pressed', o.classList.contains('active') ? 'true' : 'false');
        });
      });
    });
  }
})();
