/* MATIN SHAPE — shared front-end behaviors */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Preloader (home only) ---------- */
  const preloader = document.getElementById('preloader');
  if (preloader) {
    const loadBar = document.getElementById('loadBar');
    const loadPct = document.getElementById('loadPct');

    const finishLoad = () => {
      preloader.classList.add('done');
      document.body.classList.remove('locked');
      setTimeout(() => preloader.remove(), 1100);
    };

    if (reduceMotion) {
      preloader.remove();
      document.body.classList.remove('locked');
    } else {
      let pct = 0;
      const tick = setInterval(() => {
        pct = Math.min(100, pct + Math.random() * 16 + 5);
        loadBar.style.transform = 'scaleX(' + pct / 100 + ')';
        loadPct.textContent = String(Math.floor(pct)).padStart(2, '0');
        if (pct >= 100) {
          clearInterval(tick);
          setTimeout(finishLoad, 350);
        }
      }, 130);
      setTimeout(() => { if (document.body.classList.contains('locked')) finishLoad(); }, 4000);
    }
  }

  /* ---------- Custom cursor ---------- */
  const dot  = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (dot && ring) {
    if (finePointer && !reduceMotion) {
      let mx = -100, my = -100, rx = -100, ry = -100;
      window.addEventListener('mousemove', (e) => {
        mx = e.clientX; my = e.clientY;
        dot.style.left = mx + 'px';
        dot.style.top  = my + 'px';
      }, { passive: true });
      (function ringLoop() {
        rx += (mx - rx) * 0.16;
        ry += (my - ry) * 0.16;
        ring.style.left = rx + 'px';
        ring.style.top  = ry + 'px';
        requestAnimationFrame(ringLoop);
      })();
      document.querySelectorAll('a, button, .bento-card, .t-card, .project-card').forEach((el) => {
        el.addEventListener('mouseenter', () => ring.classList.add('grow'));
        el.addEventListener('mouseleave', () => ring.classList.remove('grow'));
      });
    } else {
      dot.remove();
      ring.remove();
    }
  }

  /* ---------- Scroll progress + nav state ---------- */
  const progressBar = document.getElementById('progressBar');
  const nav = document.getElementById('nav');
  let ticking = false;

  function onScroll() {
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (progressBar) progressBar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 40);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = mobileMenu.classList.toggle('open');
      burger.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', open);
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('locked', open);
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('locked');
      });
    });
  }

  /* ---------- Scroll reveal ---------- */
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

  /* Process line draw */
  const processTrack = document.getElementById('processTrack');
  if (processTrack) {
    const lineObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          processTrack.classList.add('in');
          lineObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    lineObserver.observe(processTrack);
  }

  /* ---------- Counters ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const decimal = el.dataset.decimal === 'true';
    const comma = el.dataset.comma === 'true';
    const dur = 1800;
    const start = performance.now();

    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 4);
      const val = target * eased;
      let text = decimal ? val.toFixed(1) : Math.round(val).toString();
      if (comma) text = Number(text).toLocaleString('en-US');
      el.textContent = text;
      if (p < 1) requestAnimationFrame(frame);
    }
    if (reduceMotion) {
      el.textContent = decimal ? target.toFixed(1) : (comma ? target.toLocaleString('en-US') : target);
    } else {
      requestAnimationFrame(frame);
    }
  }
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        btn.style.transform = 'translate(' + x * 0.22 + 'px,' + y * 0.28 + 'px)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform .6s cubic-bezier(0.22, 1, 0.36, 1)';
        btn.style.transform = 'translate(0,0)';
        setTimeout(() => { btn.style.transition = ''; }, 600);
      });
    });
  }

  /* ---------- Tactile ripple on textured buttons ---------- */
  if (!reduceMotion) {
    document.querySelectorAll('.btn-primary, .btn-gold, .btn-ghost, .nav-cta').forEach((btn) => {
      btn.addEventListener('pointerdown', (e) => {
        const r = btn.getBoundingClientRect();
        const size = Math.max(r.width, r.height) * 1.6;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - r.left) + 'px';
        ripple.style.top  = (e.clientY - r.top) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 750);
      });
    });
  }

  /* ---------- 3D tilt + glare tracking ---------- */
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.bento-card').forEach((card) => {
      const glare = card.querySelector('.bento-glare');
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.transform =
          'translateY(-8px) perspective(900px)' +
          ' rotateX(' + ((0.5 - py) * 5).toFixed(2) + 'deg)' +
          ' rotateY(' + ((px - 0.5) * 5).toFixed(2) + 'deg)';
        if (glare) {
          card.style.setProperty('--mx', (px * 100) + '%');
          card.style.setProperty('--my', (py * 100) + '%');
        }
      });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ---------- Hero orb parallax ---------- */
  if (finePointer && !reduceMotion) {
    const orbs = document.querySelectorAll('.hero .orb');
    if (orbs.length) {
      let px = 0, py = 0, tx = 0, ty = 0;
      window.addEventListener('mousemove', (e) => {
        tx = (e.clientX / window.innerWidth - 0.5);
        ty = (e.clientY / window.innerHeight - 0.5);
      }, { passive: true });
      (function orbLoop() {
        px += (tx - px) * 0.03;
        py += (ty - py) * 0.03;
        orbs.forEach((orb, i) => {
          const depth = (i + 1) * 14;
          orb.style.translate = (px * depth) + 'px ' + (py * depth) + 'px';
        });
        requestAnimationFrame(orbLoop);
      })();
    }
  }

  /* ---------- Project filters ---------- */
  const filterBar = document.getElementById('filterBar');
  if (filterBar) {
    const cards = document.querySelectorAll('.project-card[data-cat]');
    filterBar.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        cards.forEach((card) => {
          const show = cat === 'all' || card.dataset.cat === cat;
          card.classList.toggle('hidden', !show);
        });
      });
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = '0px';
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
        q.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Contact form ----------
     The contact page's intake console is handled in assets/contact.js. */
})();


/* ---------- Home hero: assembling system ---------- */
(function () {
  'use strict';
  var svg = document.getElementById('heroSystem');
  if (!svg) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var assemble = function () { svg.classList.add('hh-assembled'); };

  if (reduceMotion) {
    assemble();
  } else {
    /* wait for the preloader sweep when present, otherwise start quickly */
    var delay = document.getElementById('preloader') ? 2000 : 500;
    setTimeout(assemble, delay);
  }

  /* subtle scroll parallax on the whole assembly (container only, so
     inner SVG transitions/animations are never overridden) */
  var wrap = document.querySelector('.hh-visual-inner');
  if (wrap && !reduceMotion) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = Math.min(window.scrollY, 900);
        wrap.style.transform = 'translateY(' + (y * 0.08) + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }
})();


/* ---------- Workflow Simulator (lead journey) ---------- */
(function () {
  'use strict';
  var track = document.getElementById('simTrack');
  if (!track) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var steps = Array.prototype.slice.call(track.querySelectorAll('.sim-step'));
  var line = document.getElementById('simLine');
  var caption = document.getElementById('simCaption');
  var replayBtn = document.getElementById('simReplay');
  var resultEl = document.getElementById('simResult');
  var timer = null;
  var started = false;

  function setStep(i) {
    steps.forEach(function (s, idx) {
      s.classList.toggle('done', idx < i);
      s.classList.toggle('active', idx === i);
    });
    if (line) line.style.transform = 'scaleX(' + (i / (steps.length - 1)) + ')';
    caption.innerHTML = steps[i].dataset.caption;
  }

  function finish() {
    steps.forEach(function (s) { s.classList.add('done'); s.classList.remove('active'); });
    if (line) line.style.transform = 'scaleX(1)';
    caption.innerHTML = 'End to end, untouched by your team — <strong>this is what a MATIN SHAPE system does all day.</strong>';
    if (resultEl) resultEl.classList.add('show');
    var lbl = replayBtn.querySelector('span');
    if (lbl) lbl.textContent = 'Run Again';
  }

  function play() {
    clearTimeout(timer);
    if (resultEl) resultEl.classList.remove('show');
    var lbl = replayBtn.querySelector('span');
    if (lbl) lbl.textContent = 'Running\u2026';
    var i = 0;
    setStep(0);
    (function next() {
      timer = setTimeout(function () {
        i += 1;
        if (i < steps.length) { setStep(i); next(); }
        else { finish(); }
      }, 1700);
    })();
  }

  if (reduceMotion) {
    finish();
  } else {
    var simObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !started) {
          started = true;
          play();
          simObserver.disconnect();
        }
      });
    }, { threshold: 0.4 });
    simObserver.observe(track);
  }

  replayBtn.addEventListener('click', function () {
    if (window.MSObserve) MSObserve.log('click', { label: 'simulator_replay' });
    play();
  });
})();

/* ---------- Founder photo (activates when the file exists) ---------- */
(function () {
  'use strict';
  document.querySelectorAll('.founder-mark[data-photo]').forEach(function (mark) {
    var img = mark.querySelector('img');
    if (!img) return;
    var probe = new Image();
    probe.onload = function () {
      img.src = probe.src;
      mark.classList.add('has-photo');
    };
    probe.src = mark.dataset.photo;
  });
})();
