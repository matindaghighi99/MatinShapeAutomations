/* MATINSHAPE — portal authentication (client-side)
   - Credentials are verified against a PBKDF2-SHA256 hash (210k iterations).
     The password itself is never stored anywhere in this codebase.
   - Sessions are random tokens with an expiry, renewed on activity.
   - 5 failed attempts locks the form with exponential backoff.
   LIMITATION: with no backend, this protects the login flow and keeps the
   password secret, but cannot make served files private. Portal data lives
   only in this browser's localStorage. */
(function () {
  'use strict';

  var SALT = 'matinshape-portal-v1';
  var ITERATIONS = 210000;
  /* PBKDF2-SHA256("username:password", SALT). Regenerate from the dashboard's
     Security card when changing the password. */
  var EXPECTED_HASH = '4f7a265175ac55b8c20b7b50b86e650d9b950983f3278a3540f27902a1c31c9a';
  var DISPLAY_NAME = 'Matin';

  var K_SESSION = 'ms_session';
  var K_LOCK = 'ms_lock';
  var K_OVERRIDE = 'ms_auth_local'; // per-browser password override hash

  var SHORT_TTL = 12 * 60 * 60 * 1000;      // 12 hours
  var LONG_TTL  = 30 * 24 * 60 * 60 * 1000; // 30 days ("keep me signed in")

  var enc = new TextEncoder();

  function toHex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function deriveHash(username, password) {
    var msg = username.trim().toLowerCase() + ':' + password;
    return crypto.subtle.importKey('raw', enc.encode(msg), 'PBKDF2', false, ['deriveBits'])
      .then(function (key) {
        return crypto.subtle.deriveBits(
          { name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
          key, 256
        );
      })
      .then(toHex);
  }

  function expectedHash() {
    return localStorage.getItem(K_OVERRIDE) || EXPECTED_HASH;
  }

  /* ---- lockout ---- */
  function getLock() {
    try { return JSON.parse(localStorage.getItem(K_LOCK)) || { fails: 0, until: 0 }; }
    catch (e) { return { fails: 0, until: 0 }; }
  }
  function saveLock(l) { localStorage.setItem(K_LOCK, JSON.stringify(l)); }
  function lockedFor() {
    var l = getLock();
    return Math.max(0, l.until - Date.now());
  }
  function registerFail() {
    var l = getLock();
    l.fails += 1;
    if (l.fails >= 5) {
      var wait = Math.min(30 * 60000, 60000 * Math.pow(2, l.fails - 5)); // 1m,2m,4m… cap 30m
      l.until = Date.now() + wait;
    }
    saveLock(l);
    return l;
  }
  function clearLock() { localStorage.removeItem(K_LOCK); }

  /* ---- session ---- */
  function randomToken() {
    var a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return toHex(a.buffer);
  }
  function createSession(remember) {
    var s = {
      token: randomToken(),
      name: DISPLAY_NAME,
      exp: Date.now() + (remember ? LONG_TTL : SHORT_TTL),
      remember: !!remember,
      loginAt: new Date().toISOString()
    };
    localStorage.setItem(K_SESSION, JSON.stringify(s));
    return s;
  }
  function getSession() {
    var s;
    try { s = JSON.parse(localStorage.getItem(K_SESSION)); } catch (e) { s = null; }
    if (!s || typeof s.exp !== 'number' || !s.token) return null;
    if (Date.now() > s.exp) { localStorage.removeItem(K_SESSION); return null; }
    return s;
  }
  function renewSession() {
    var s = getSession();
    if (s) {
      s.exp = Date.now() + (s.remember ? LONG_TTL : SHORT_TTL);
      localStorage.setItem(K_SESSION, JSON.stringify(s));
    }
    return s;
  }
  function destroySession() { localStorage.removeItem(K_SESSION); }

  /* ---- public API ---- */
  window.MSAuth = {
    verify: function (username, password) {
      if (!window.isSecureContext || !crypto.subtle) {
        return Promise.reject(new Error('Secure context required (use https or localhost).'));
      }
      var wait = lockedFor();
      if (wait > 0) {
        return Promise.reject(new Error('Too many attempts. Try again in ' + Math.ceil(wait / 60000) + ' min.'));
      }
      return deriveHash(username, password).then(function (hex) {
        if (hex === expectedHash()) { clearLock(); return true; }
        var l = registerFail();
        var left = Math.max(0, 5 - l.fails);
        throw new Error(l.until > Date.now()
          ? 'Too many attempts. Locked for ' + Math.ceil((l.until - Date.now()) / 60000) + ' min.'
          : 'Wrong username or password.' + (left ? ' ' + left + ' attempt' + (left === 1 ? '' : 's') + ' left.' : ''));
      });
    },
    createSession: createSession,
    getSession: getSession,
    renewSession: renewSession,
    destroySession: destroySession,
    /* change password: verifies current, stores per-browser override,
       returns the new hash so it can be baked into auth.js permanently */
    changePassword: function (username, currentPass, newPass) {
      return window.MSAuth.verify(username, currentPass).then(function () {
        if (String(newPass).length < 10) throw new Error('New password must be at least 10 characters.');
        return deriveHash(username, newPass);
      }).then(function (hex) {
        localStorage.setItem(K_OVERRIDE, hex);
        return hex;
      });
    }
  };

  /* ---- password visibility toggle ---- */
  document.querySelectorAll('.password-field').forEach(function (field) {
    var input = field.querySelector('input');
    var toggle = field.querySelector('.password-toggle');
    if (!input || !toggle) return;
    toggle.addEventListener('click', function () {
      var shown = input.type === 'text';
      input.type = shown ? 'password' : 'text';
      toggle.setAttribute('aria-pressed', String(!shown));
      toggle.setAttribute('aria-label', shown ? 'Show password' : 'Hide password');
      toggle.setAttribute('title', shown ? 'Show password' : 'Hide password');
      toggle.querySelector('.icon-eye').hidden = !shown;
      toggle.querySelector('.icon-eye-off').hidden = shown;
      if (window.MSObserve) MSObserve.log('auth', { event: 'password_toggle', action: shown ? 'hide' : 'show', field: input.id || null });
    });
  });

  /* ---- login page wiring ---- */
  var form = document.getElementById('loginForm');
  if (form) {
    if (getSession()) { window.location.replace('dashboard.html'); return; }

    var errBox = document.getElementById('loginError');
    var btn = form.querySelector('button[type="submit"]');

    function showError(msg) {
      errBox.textContent = msg;
      errBox.classList.add('show');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var user = document.getElementById('lg-user').value.trim();
      var pass = document.getElementById('lg-pass').value;
      var remember = document.getElementById('lg-remember').checked;
      if (!user || !pass) { showError('Enter both your username and password.'); return; }

      errBox.classList.remove('show');
      btn.disabled = true;
      btn.style.opacity = '.6';
      btn.querySelector('span').textContent = 'Verifying…';

      MSAuth.verify(user, pass).then(function () {
        createSession(remember);
        if (window.MSObserve) MSObserve.log('auth', { event: 'login_ok' });
        window.location.href = 'dashboard.html';
      }).catch(function (err) {
        if (window.MSObserve) MSObserve.log('auth', { event: 'login_fail' });
        showError(err.message || 'Login failed.');
        btn.disabled = false;
        btn.style.opacity = '';
        btn.querySelector('span').textContent = 'Enter the Workshop';
      });
    });
  }
})();
