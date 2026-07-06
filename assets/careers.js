/* MATINSHAPE — Careers page behaviour
   - "Apply for this role" buttons preselect the role and scroll to the form
   - Hero role-node visual reveals on load
   - Application form submits to the same intake webhook, tagged as a
     careers application, then shows the success state.
   NOTE FOR MAINTAINER: submissions post to the shared Make webhook with
   _form:"careers-application". Route on that field in the Make scenario, or
   swap CAREERS_ENDPOINT below for a dedicated endpoint / Pages Function. */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var CAREERS_ENDPOINT = 'https://hook.us2.make.com/nd8i1gosfvy4uvx2vr4cm3b3v9hikahk';

  /* ---- hero visual reveal ---- */
  var vis = document.getElementById('crVisual');
  if (vis) {
    if (reduceMotion) {
      vis.classList.add('in');
    } else {
      var visObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { vis.classList.add('in'); visObs.disconnect(); }
        });
      }, { threshold: 0.3 });
      visObs.observe(vis);
    }
  }

  /* ---- role visuals: run only while in view (perf) ---- */
  var roleCards = document.querySelectorAll('.role-card');
  if (roleCards.length) {
    if (reduceMotion) {
      roleCards.forEach(function (c) { c.classList.add('viz-on'); });
    } else {
      var vizObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          e.target.classList.toggle('viz-on', e.isIntersecting);
        });
      }, { threshold: 0.01 });
      roleCards.forEach(function (c) { vizObs.observe(c); });
    }
  }

  /* ---- apply buttons preselect role + scroll to form ---- */
  var roleSelect = document.getElementById('cr-role');
  document.querySelectorAll('[data-apply-role]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var role = btn.getAttribute('data-apply-role');
      if (roleSelect && role) {
        for (var i = 0; i < roleSelect.options.length; i++) {
          if (roleSelect.options[i].value === role) { roleSelect.selectedIndex = i; break; }
        }
      }
      var target = document.getElementById('apply');
      if (target) target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      var firstField = document.getElementById('cr-name');
      if (firstField) setTimeout(function () { firstField.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      if (window.MSObserve) MSObserve.log('click', { label: 'careers_apply:' + (role || 'general') });
    });
  });

  /* ---- application form submission ---- */
  var form = document.getElementById('careersForm');
  if (!form) return;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var fields = form.querySelector('.form-fields');
  var success = form.querySelector('.form-success');
  var errBox = document.getElementById('careersError');
  var submitBtn = form.querySelector('button[type="submit"]');

  function showError(msg) {
    if (!errBox) return;
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (errBox) errBox.hidden = true;

    var name = form.elements['name'].value.trim();
    var email = form.elements['email'].value.trim();
    if (!name) { showError('Please add your name so we know who built the work.'); form.elements['name'].focus(); return; }
    if (!EMAIL_RE.test(email)) { showError('Please enter a valid email so we can reply.'); form.elements['email'].focus(); return; }

    var data = { _form: 'careers-application' };
    new FormData(form).forEach(function (v, k) { data[k] = v; });

    submitBtn.disabled = true;
    submitBtn.style.opacity = '.6';
    submitBtn.querySelector('span').textContent = 'Submitting…';

    fetch(CAREERS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Something went wrong. Please try again, or email us directly.');
        fields.style.display = 'none';
        success.classList.add('show');
        success.setAttribute('tabindex', '-1');
        success.focus();
        if (window.MSObserve) MSObserve.log('click', { label: 'careers_submitted' });
      })
      .catch(function (err) {
        showError(err.message || 'Submission failed. Please retry or email hello@matinshape.com.');
        submitBtn.disabled = false;
        submitBtn.style.opacity = '';
        submitBtn.querySelector('span').textContent = 'Submit Application';
        if (window.MSObserve) MSObserve.log('click', { label: 'careers_failed' });
      });
  });
})();
