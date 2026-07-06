/* MATINSHAPE — System Vault behaviors
   (schematic activation, 3D tilt, filter a11y, preview modal,
    choose-your-bottleneck recommender) */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Schematics (hero command center + featured map): activate on scroll ---------- */
  document.querySelectorAll('.schematic').forEach(function (svg) {
    if (reduceMotion) {
      svg.classList.add('active');
      return;
    }
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          svg.classList.add('active');
          obs.disconnect();
        }
      });
    }, { threshold: 0.3 });
    obs.observe(svg);
  });

  /* ---------- 3D tilt + glare on system capsules ---------- */
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

  /* ---------- System preview modal ---------- */
  var modal = document.getElementById('sysModal');
  var modalBody = document.getElementById('sysModalBody');
  var lastFocus = null;

  function openModal(sysId) {
    if (!modal || !modalBody) return;
    var tpl = document.querySelector('template[data-sys-tpl="' + sysId + '"]');
    if (!tpl) return;

    modalBody.innerHTML = '';
    modalBody.appendChild(tpl.content.cloneNode(true));

    var title = modalBody.querySelector('.smx-title');
    if (title) {
      title.id = 'sysModalTitle';
      modal.setAttribute('aria-labelledby', 'sysModalTitle');
      modal.removeAttribute('aria-label');
    } else {
      modal.removeAttribute('aria-labelledby');
      modal.setAttribute('aria-label', 'System preview');
    }

    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.classList.add('no-scroll');
    var closeBtn = modal.querySelector('.sys-modal-close');
    if (closeBtn) closeBtn.focus();
    if (window.MSObserve) MSObserve.log('click', { label: 'preview_system:' + sysId });
  }

  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove('no-scroll');
    modalBody.innerHTML = '';
    if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    lastFocus = null;
  }

  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-modal-close]')) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (modal.hidden) return;
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab') {
        var focusables = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables.length) return;
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* capsule "Preview System" buttons */
  document.querySelectorAll('.sys-card .sys-cta').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var card = btn.closest('.sys-card');
      if (card && card.dataset.sys) openModal(card.dataset.sys);
    });
  });

  /* ---------- Choose-your-bottleneck recommender ---------- */
  var recPanel = document.getElementById('recPanel');
  var recChips = document.querySelectorAll('.rec-chip');

  function renderRecommendation(chip) {
    var sysId = chip.dataset.rec;
    var wrap = document.createElement('div');
    wrap.className = 'rec-result';

    var code = document.createElement('span');
    code.className = 'rec-code';
    code.textContent = chip.dataset.recCode + ' — recommended system';
    wrap.appendChild(code);

    var h3 = document.createElement('h3');
    var em = document.createElement('em');
    em.textContent = chip.dataset.recName;
    h3.appendChild(em);
    h3.appendChild(document.createTextNode(' is built for this.'));
    wrap.appendChild(h3);

    var why = document.createElement('p');
    why.className = 'rec-why';
    why.textContent = chip.dataset.recWhy;
    wrap.appendChild(why);

    var actions = document.createElement('div');
    actions.className = 'rec-actions';

    var previewBtn = document.createElement('button');
    previewBtn.type = 'button';
    previewBtn.className = 'rec-preview-btn';
    previewBtn.textContent = 'Preview this system';
    previewBtn.addEventListener('click', function () { openModal(sysId); });
    actions.appendChild(previewBtn);

    var call = document.createElement('a');
    call.className = 'link-arrow';
    call.href = 'contact.html';
    call.textContent = 'or book a strategy call';
    actions.appendChild(call);

    wrap.appendChild(actions);

    recPanel.innerHTML = '';
    recPanel.appendChild(wrap);
  }

  if (recPanel && recChips.length) {
    recChips.forEach(function (chip) {
      chip.setAttribute('aria-pressed', 'false');
      chip.addEventListener('click', function () {
        recChips.forEach(function (o) { o.setAttribute('aria-pressed', 'false'); });
        chip.setAttribute('aria-pressed', 'true');
        renderRecommendation(chip);
        if (window.MSObserve) MSObserve.log('click', { label: 'recommend:' + chip.dataset.rec });
      });
    });
  }
})();
