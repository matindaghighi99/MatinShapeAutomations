/* MATINSHAPE — The Workshop (CEO dashboard)
   Front-end demo: all data lives in localStorage. */
(function () {
  'use strict';

  /* ================= Session guard (MSAuth: expiring token) ================= */
  var session = window.MSAuth ? MSAuth.renewSession() : null;
  if (!session) {
    window.location.replace('login.html');
    return;
  }

  /* ================= Storage helpers ================= */
  var K = { calls: 'aureon_calls', clients: 'aureon_clients', tasks: 'aureon_tasks', notes: 'aureon_notes' };

  function load(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
  function uid() { return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7); }

  function dstr(d) { // local YYYY-MM-DD
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function addDays(base, n) { var d = new Date(base); d.setDate(d.getDate() + n); return d; }
  var today = new Date();
  var todayStr = dstr(today);

  /* ================= Seed data (first run) ================= */
  if (!localStorage.getItem(K.clients)) {
    save(K.clients, [
      { id: uid(), name: 'Sofia Martinez', company: 'Meridian Health', status: 'Active', value: 6500 },
      { id: uid(), name: 'James Whitfield', company: 'Voltaic Energy', status: 'Active', value: 4800 },
      { id: uid(), name: 'Aisha Khan', company: 'Alpine Dental Group', status: 'Active', value: 3900 },
      { id: uid(), name: 'Léa Bernard', company: 'Orbita', status: 'Paused', value: 5200 },
      { id: uid(), name: 'Daniel Okafor', company: 'Northwind Logistics', status: 'Lead', value: 7000 },
      { id: uid(), name: 'Elena Rossi', company: 'Grandeur Hotels', status: 'Lead', value: 5500 }
    ]);
  }
  if (!localStorage.getItem(K.calls)) {
    save(K.calls, [
      { id: uid(), client: 'Sofia Martinez — Meridian Health', date: todayStr, time: '10:30', dur: 30, type: 'Check-in', notes: 'Review intake pipeline metrics for June.' },
      { id: uid(), client: 'Daniel Okafor — Northwind Logistics', date: todayStr, time: '15:00', dur: 45, type: 'Strategy', notes: 'Proposal walkthrough — control tower phase 2.' },
      { id: uid(), client: 'Elena Rossi — Grandeur Hotels', date: dstr(addDays(today, 1)), time: '11:00', dur: 30, type: 'Demo', notes: 'Show the concierge suite live on WhatsApp.' },
      { id: uid(), client: 'James Whitfield — Voltaic Energy', date: dstr(addDays(today, 2)), time: '14:30', dur: 30, type: 'Review', notes: 'Quarterly ROI review.' },
      { id: uid(), client: 'Aisha Khan — Alpine Dental', date: dstr(addDays(today, 4)), time: '09:00', dur: 60, type: 'Onboarding', notes: 'Kick off voice agent for the 6th location.' }
    ]);
  }
  if (!localStorage.getItem(K.tasks)) {
    save(K.tasks, [
      { id: uid(), text: 'Send Northwind the phase-2 proposal', done: false },
      { id: uid(), text: 'Review Q3 client capacity (4 slots)', done: false },
      { id: uid(), text: 'Record welcome video for new onboarding flow', done: false },
      { id: uid(), text: 'Approve Meridian June report', done: true }
    ]);
  }

  var calls   = load(K.calls, []);
  var clients = load(K.clients, []);
  var tasks   = load(K.tasks, []);

  /* ---- validate stored data (defense against tampered localStorage) ---- */
  function cleanStr(v, max) { return String(v == null ? '' : v).slice(0, max); }
  var CALL_TYPES = ['Strategy', 'Check-in', 'Demo', 'Onboarding', 'Review'];
  var CLIENT_STATUSES = ['Active', 'Lead', 'Paused'];
  calls = (Array.isArray(calls) ? calls : []).filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
    return {
      id: /^[\w-]{1,40}$/.test(c.id) ? c.id : uid(),
      client: cleanStr(c.client, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(c.date) ? c.date : todayStr,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(c.time) ? c.time : '09:00',
      dur: [15, 30, 45, 60].indexOf(Number(c.dur)) > -1 ? Number(c.dur) : 30,
      type: CALL_TYPES.indexOf(c.type) > -1 ? c.type : 'Check-in',
      notes: cleanStr(c.notes, 300)
    };
  });
  clients = (Array.isArray(clients) ? clients : []).filter(function (c) { return c && typeof c === 'object'; }).map(function (c) {
    return {
      id: /^[\w-]{1,40}$/.test(c.id) ? c.id : uid(),
      name: cleanStr(c.name, 80),
      company: cleanStr(c.company, 80),
      status: CLIENT_STATUSES.indexOf(c.status) > -1 ? c.status : 'Lead',
      value: Math.min(Math.max(Number(c.value) || 0, 0), 10000000)
    };
  });
  tasks = (Array.isArray(tasks) ? tasks : []).filter(function (t) { return t && typeof t === 'object'; }).map(function (t) {
    return { id: /^[\w-]{1,40}$/.test(t.id) ? t.id : uid(), text: cleanStr(t.text, 200), done: !!t.done };
  });

  /* ================= Shared DOM helpers ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var toastTimer = null;
  function toast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').classList.remove('show'); }, 2600);
  }

  function fmtMoney(n) { return '$' + Number(n || 0).toLocaleString('en-US'); }
  function fmtTime(t) {
    var parts = t.split(':');
    var h = parseInt(parts[0], 10);
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    return h12 + ':' + parts[1] + ' ' + ampm;
  }
  function fmtDateNice(iso) {
    var p = iso.split('-');
    var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function typeClass(type) {
    return 'ct-' + String(type || 'checkin').toLowerCase().replace(/[^a-z]/g, '');
  }
  function sortCalls(list) {
    return list.slice().sort(function (a, b) {
      return (a.date + a.time).localeCompare(b.date + b.time);
    });
  }

  /* ================= Header ================= */
  var name = (session.name || 'Boss').split(' ')[0];
  var hour = today.getHours();
  var salut = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('greeting').innerHTML = salut + ', <em>' + esc(name) + '</em>.';
  $('userName').textContent = session.name || 'CEO';
  $('userAvatar').textContent = (session.name || 'C').charAt(0).toUpperCase();
  $('todayDate').textContent = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  $('logoutBtn').addEventListener('click', function () {
    MSAuth.destroySession();
    if (window.MSObserve) MSObserve.log('auth', { event: 'logout' });
    window.location.href = 'login.html';
  });

  /* ================= View switching ================= */
  var navBtns = document.querySelectorAll('.dash-nav button');
  function showView(id) {
    navBtns.forEach(function (b) { b.classList.toggle('active', b.dataset.view === id); });
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    $('view-' + id).classList.add('active');
    if (id === 'health') renderHealth();
  }
  navBtns.forEach(function (btn) {
    btn.addEventListener('click', function () { showView(btn.dataset.view); });
  });
  document.querySelectorAll('[data-goto]').forEach(function (el) {
    el.addEventListener('click', function () { showView(el.dataset.goto); });
  });

  /* ================= Overview ================= */
  function callItemHTML(c, withDate) {
    return (
      '<div class="call-item" data-id="' + c.id + '">' +
        '<div class="call-time">' + fmtTime(c.time) +
          (withDate ? '<small>' + esc(fmtDateNice(c.date).replace(/^[A-Za-z]+, /, '')) + '</small>' : '<small>' + c.dur + ' min</small>') +
        '</div>' +
        '<div class="call-info">' +
          '<div class="call-client">' + esc(c.client) + '</div>' +
          (c.notes ? '<div class="call-meta">' + esc(c.notes) + '</div>' : '') +
        '</div>' +
        '<span class="call-type ' + typeClass(c.type) + '">' + esc(c.type) + '</span>' +
        '<div class="call-actions">' +
          '<button class="icon-btn" data-edit="' + c.id + '" title="Edit" aria-label="Edit call">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>' +
          '</button>' +
          '<button class="icon-btn danger" data-del="' + c.id + '" title="Delete" aria-label="Delete call">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }
  function emptyHTML(msg) {
    return (
      '<div class="empty-msg">' +
        '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="5" width="16" height="16" rx="3"/><path d="M8 3v4M16 3v4M4 11h16"/></svg>' +
        msg +
      '</div>'
    );
  }

  function renderOverview() {
    var sorted = sortCalls(calls);
    var todayCalls = sorted.filter(function (c) { return c.date === todayStr; });

    var weekEnd = dstr(addDays(today, 7));
    var weekCalls = sorted.filter(function (c) { return c.date >= todayStr && c.date < weekEnd; });

    $('statToday').textContent = todayCalls.length;
    var now = String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
    var next = todayCalls.filter(function (c) { return c.time >= now; })[0];
    $('statTodayNext').textContent = next ? 'next at ' + fmtTime(next.time) : (todayCalls.length ? 'all done for today' : 'clear schedule');

    $('statWeek').textContent = weekCalls.length;

    var active = clients.filter(function (c) { return c.status === 'Active'; }).length;
    var leads = clients.filter(function (c) { return c.status === 'Lead'; }).length;
    $('statClients').textContent = active;
    $('statLeads').textContent = leads + ' lead' + (leads === 1 ? '' : 's') + ' in pipeline';

    var open = tasks.filter(function (t) { return !t.done; }).length;
    $('statTasks').textContent = open;
    $('statTasksDone').textContent = (tasks.length - open) + ' completed';

    var upcoming = sorted.filter(function (c) { return c.date >= todayStr; }).slice(0, 5);
    $('upcomingList').innerHTML = upcoming.length
      ? upcoming.map(function (c) { return callItemHTML(c, true); }).join('')
      : emptyHTML('No upcoming calls. Enjoy the quiet — or schedule one.');
  }

  /* ================= Notes (autosave) ================= */
  var notesArea = $('notesArea');
  notesArea.value = load(K.notes, '');
  var notesTimer = null;
  notesArea.addEventListener('input', function () {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(function () {
      save(K.notes, notesArea.value);
      var badge = $('notesSaved');
      badge.classList.add('show');
      setTimeout(function () { badge.classList.remove('show'); }, 1500);
    }, 600);
  });

  /* ================= Calendar ================= */
  var calCursor = new Date(today.getFullYear(), today.getMonth(), 1);
  var selectedDate = todayStr;

  function renderCalendar() {
    $('calMonth').textContent = calCursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    var year = calCursor.getFullYear();
    var month = calCursor.getMonth();
    var firstDow = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
    var start = addDays(new Date(year, month, 1), -firstDow);

    var byDate = {};
    calls.forEach(function (c) { (byDate[c.date] = byDate[c.date] || []).push(c); });

    var html = '';
    for (var i = 0; i < 42; i++) {
      var d = addDays(start, i);
      var ds = dstr(d);
      var inMonth = d.getMonth() === month;
      var dayCalls = sortCalls(byDate[ds] || []);
      var cls = 'cal-day' + (inMonth ? '' : ' other') + (ds === todayStr ? ' today' : '') + (ds === selectedDate ? ' selected' : '');
      html += '<div class="' + cls + '" data-date="' + ds + '" role="button" tabindex="0" aria-label="' + fmtDateNice(ds) + ', ' + dayCalls.length + ' calls">';
      html += '<span class="cal-day-num">' + d.getDate() + '</span>';
      dayCalls.slice(0, 2).forEach(function (c) {
        html += '<span class="cal-chip">' + fmtTime(c.time).replace(' ', '') + ' ' + esc(c.client.split(' — ')[0].split(' ')[0]) + '</span>';
      });
      if (dayCalls.length > 2) html += '<span class="cal-more">+' + (dayCalls.length - 2) + ' more</span>';
      if (dayCalls.length) html += '<span class="cal-dot" aria-hidden="true"></span>';
      html += '</div>';
    }
    $('calGrid').innerHTML = html;

    $('calGrid').querySelectorAll('.cal-day').forEach(function (cell) {
      function pick() {
        selectedDate = cell.dataset.date;
        renderCalendar();
        renderDayPanel();
      }
      cell.addEventListener('click', pick);
      cell.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } });
    });
  }

  function renderDayPanel() {
    $('dayPanelDate').textContent = fmtDateNice(selectedDate);
    var dayCalls = sortCalls(calls.filter(function (c) { return c.date === selectedDate; }));
    $('dayCallList').innerHTML = dayCalls.length
      ? dayCalls.map(function (c) { return callItemHTML(c, false); }).join('')
      : emptyHTML('Nothing booked this day.');
  }

  $('calPrev').addEventListener('click', function () { calCursor.setMonth(calCursor.getMonth() - 1); renderCalendar(); });
  $('calNext').addEventListener('click', function () { calCursor.setMonth(calCursor.getMonth() + 1); renderCalendar(); });
  $('calToday').addEventListener('click', function () {
    calCursor = new Date(today.getFullYear(), today.getMonth(), 1);
    selectedDate = todayStr;
    renderCalendar();
    renderDayPanel();
  });

  /* ================= Call modal ================= */
  var callOverlay = $('callModalOverlay');

  function openCallModal(call, presetDate) {
    $('callModalTitle').textContent = call ? 'Edit call' : 'Schedule a call';
    $('callSubmitLabel').textContent = call ? 'Update call' : 'Save call';
    $('callId').value = call ? call.id : '';
    $('callClient').value = call ? call.client : '';
    $('callDate').value = call ? call.date : (presetDate || todayStr);
    $('callTime').value = call ? call.time : '10:00';
    $('callDur').value = call ? call.dur : '30';
    $('callType').value = call ? call.type : 'Strategy';
    $('callNotes').value = call ? (call.notes || '') : '';
    $('clientOptions').innerHTML = clients.map(function (c) {
      return '<option value="' + esc(c.name + (c.company ? ' — ' + c.company : '')) + '"></option>';
    }).join('');
    callOverlay.classList.add('open');
    setTimeout(function () { $('callClient').focus(); }, 250);
  }
  function closeCallModal() { callOverlay.classList.remove('open'); }

  $('newCallBtn').addEventListener('click', function () { openCallModal(null, selectedDate); });
  $('dayAddBtn').addEventListener('click', function () { openCallModal(null, selectedDate); });
  $('callCancel').addEventListener('click', closeCallModal);
  callOverlay.addEventListener('click', function (e) { if (e.target === callOverlay) closeCallModal(); });

  $('callForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var id = $('callId').value;
    var data = {
      client: $('callClient').value.trim(),
      date: $('callDate').value,
      time: $('callTime').value,
      dur: parseInt($('callDur').value, 10),
      type: $('callType').value,
      notes: $('callNotes').value.trim()
    };
    if (!data.client || !data.date || !data.time) return;

    if (id) {
      var idx = calls.findIndex(function (c) { return c.id === id; });
      if (idx > -1) calls[idx] = Object.assign({ id: id }, data);
      toast('Call updated');
    } else {
      calls.push(Object.assign({ id: uid() }, data));
      toast('Call scheduled — ' + fmtDateNice(data.date));
    }
    save(K.calls, calls);
    closeCallModal();
    renderAll();
  });

  /* Edit/delete via event delegation */
  document.addEventListener('click', function (e) {
    var editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      var call = calls.find(function (c) { return c.id === editBtn.dataset.edit; });
      if (call) openCallModal(call);
      return;
    }
    var delBtn = e.target.closest('[data-del]');
    if (delBtn) {
      calls = calls.filter(function (c) { return c.id !== delBtn.dataset.del; });
      save(K.calls, calls);
      toast('Call removed');
      renderAll();
      return;
    }
    var delClient = e.target.closest('[data-delclient]');
    if (delClient) {
      clients = clients.filter(function (c) { return c.id !== delClient.dataset.delclient; });
      save(K.clients, clients);
      toast('Client removed');
      renderAll();
    }
  });

  /* ================= Clients ================= */
  function initials(n) {
    return n.split(' ').map(function (w) { return w.charAt(0); }).slice(0, 2).join('').toUpperCase();
  }
  function renderClients() {
    var order = { Active: 0, Lead: 1, Paused: 2 };
    var rows = clients.slice().sort(function (a, b) { return (order[a.status] || 9) - (order[b.status] || 9); });
    $('clientRows').innerHTML = rows.map(function (c) {
      var stCls = c.status === 'Active' ? 'st-active' : c.status === 'Lead' ? 'st-lead' : 'st-paused';
      return (
        '<tr>' +
          '<td><div class="client-cell">' +
            '<div class="client-avatar">' + esc(initials(c.name)) + '</div>' +
            '<div><div class="client-name">' + esc(c.name) + '</div>' +
            '<div class="client-company">' + esc(c.company || '—') + '</div></div>' +
          '</div></td>' +
          '<td><span class="status-pill ' + stCls + '"><i></i>' + esc(c.status) + '</span></td>' +
          '<td class="client-value">' + fmtMoney(c.value) + '/mo</td>' +
          '<td><button class="icon-btn danger" data-delclient="' + c.id + '" title="Remove client" aria-label="Remove client">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>' +
          '</button></td>' +
        '</tr>'
      );
    }).join('') || '<tr><td colspan="4">' + emptyHTML('No clients yet. Add your first one.') + '</td></tr>';

    /* Pipeline snapshot (Tools view) */
    var mrr = clients.filter(function (c) { return c.status === 'Active'; })
      .reduce(function (s, c) { return s + (Number(c.value) || 0); }, 0);
    var potential = clients.filter(function (c) { return c.status === 'Lead'; })
      .reduce(function (s, c) { return s + (Number(c.value) || 0); }, 0);
    $('pipeMRR').textContent = fmtMoney(mrr);
    $('pipePotential').textContent = fmtMoney(potential);
  }

  var clientOverlay = $('clientModalOverlay');
  $('addClientBtn').addEventListener('click', function () {
    $('clientForm').reset();
    clientOverlay.classList.add('open');
    setTimeout(function () { $('clName').focus(); }, 250);
  });
  $('clientCancel').addEventListener('click', function () { clientOverlay.classList.remove('open'); });
  clientOverlay.addEventListener('click', function (e) { if (e.target === clientOverlay) clientOverlay.classList.remove('open'); });

  $('clientForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('clName').value.trim();
    if (!name) return;
    clients.push({
      id: uid(),
      name: name,
      company: $('clCompany').value.trim(),
      status: $('clStatus').value,
      value: Number($('clValue').value) || 0
    });
    save(K.clients, clients);
    clientOverlay.classList.remove('open');
    toast('Client added');
    renderAll();
  });

  /* ================= Tasks ================= */
  function renderTasks() {
    var doneCount = tasks.filter(function (t) { return t.done; }).length;
    $('taskCount').textContent = ' · ' + doneCount + '/' + tasks.length;
    $('taskProgress').style.width = (tasks.length ? Math.round(doneCount / tasks.length * 100) : 0) + '%';

    $('taskList').innerHTML = tasks.map(function (t) {
      return (
        '<div class="task-row' + (t.done ? ' done' : '') + '">' +
          '<button class="task-check" data-toggle="' + t.id + '" aria-label="' + (t.done ? 'Mark as not done' : 'Mark as done') + '">' +
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>' +
          '</button>' +
          '<span class="task-text">' + esc(t.text) + '</span>' +
          '<button class="icon-btn danger" data-deltask="' + t.id + '" title="Delete task" aria-label="Delete task">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>'
      );
    }).join('') || emptyHTML('All clear. Add a task above.');
  }
  function addTask() {
    var input = $('taskInput');
    var text = input.value.trim();
    if (!text) return;
    tasks.unshift({ id: uid(), text: text, done: false });
    save(K.tasks, tasks);
    input.value = '';
    renderAll();
  }
  $('taskAddBtn').addEventListener('click', addTask);
  $('taskInput').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); addTask(); } });

  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle]');
    if (toggle) {
      var t = tasks.find(function (x) { return x.id === toggle.dataset.toggle; });
      if (t) { t.done = !t.done; save(K.tasks, tasks); renderAll(); }
      return;
    }
    var del = e.target.closest('[data-deltask]');
    if (del) {
      tasks = tasks.filter(function (x) { return x.id !== del.dataset.deltask; });
      save(K.tasks, tasks);
      renderAll();
    }
  });

  /* ================= ROI calculator ================= */
  function renderROI() {
    var hours = Number($('roiHours').value) || 0;
    var rate = Number($('roiRate').value) || 0;
    var pct = Number($('roiPct').value) / 100;
    $('roiPctOut').textContent = Math.round(pct * 100) + '%';
    var weekly = hours * pct;
    var annual = weekly * rate * 52;
    $('roiWeekly').innerHTML = (Math.round(weekly * 10) / 10) + '<em> hrs</em>';
    $('roiAnnual').textContent = '$' + Math.round(annual).toLocaleString('en-US');
  }
  ['roiHours', 'roiRate', 'roiPct'].forEach(function (id) {
    $(id).addEventListener('input', renderROI);
  });

  /* ================= Escape closes modals ================= */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeCallModal();
      clientOverlay.classList.remove('open');
    }
  });

  /* ================= Site Health (observability) ================= */
  function timeAgo(t) {
    var m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return m + 'm ago';
    if (m < 1440) return Math.round(m / 60) + 'h ago';
    return Math.round(m / 1440) + 'd ago';
  }
  function barRows(counts, emptyMsg) {
    var entries = Object.keys(counts).map(function (k) { return [k, counts[k]]; })
      .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 6);
    if (!entries.length) return '<div class="empty-msg">' + emptyMsg + '</div>';
    var max = entries[0][1];
    return entries.map(function (en) {
      return '<div class="ob-row"><span class="ob-name">' + esc(en[0]) + '</span>' +
        '<span class="ob-bar"><i style="width:' + Math.round(en[1] / max * 100) + '%"></i></span>' +
        '<span class="ob-count">' + en[1] + '</span></div>';
    }).join('');
  }
  function renderHealth() {
    if (!window.MSObserve) return;
    var week = Date.now() - 7 * 86400000;
    var ev = MSObserve.getAll().filter(function (e) { return e && e.t >= week; });

    var views = ev.filter(function (e) { return e.type === 'pageview'; });
    var sids = {};
    views.forEach(function (e) { sids[e.sid] = 1; });
    $('obViews').textContent = views.length;
    $('obSessions').textContent = Object.keys(sids).length + ' session' + (Object.keys(sids).length === 1 ? '' : 's');

    var errors = ev.filter(function (e) { return e.type === 'error'; });
    $('obErrors').textContent = errors.length;
    $('obErrSub').textContent = errors.length ? 'latest: ' + timeAgo(errors[errors.length - 1].t) : 'all clear';

    var perfs = ev.filter(function (e) { return e.type === 'perf' && e.data && e.data.load > 0; });
    var avg = perfs.length ? Math.round(perfs.reduce(function (s, e) { return s + e.data.load; }, 0) / perfs.length) : 0;
    $('obLoad').textContent = avg ? (avg >= 1000 ? (avg / 1000).toFixed(1) + 's' : avg + 'ms') : '\u2014';

    var vit = ev.filter(function (e) { return e.type === 'vitals'; }).pop();
    if (vit && vit.data) {
      $('obLCP').textContent = vit.data.lcp ? (vit.data.lcp >= 1000 ? (vit.data.lcp / 1000).toFixed(1) + 's' : vit.data.lcp + 'ms') : '\u2014';
      $('obCLS').textContent = 'CLS ' + (vit.data.cls != null ? vit.data.cls : '\u2014') + ' \u00B7 INP ' + (vit.data.inp || 0) + 'ms';
    }

    var pageCounts = {};
    views.forEach(function (e) { pageCounts[e.page || '?'] = (pageCounts[e.page || '?'] || 0) + 1; });
    $('obPages').innerHTML = barRows(pageCounts, 'No traffic recorded yet. Browse the site and check back.');

    var clickCounts = {};
    ev.filter(function (e) { return e.type === 'click'; }).forEach(function (e) {
      var label = (e.data && e.data.label) || 'unlabeled';
      clickCounts[label] = (clickCounts[label] || 0) + 1;
    });
    $('obClicks').innerHTML = barRows(clickCounts, 'No clicks tracked yet.');

    $('obErrList').innerHTML = errors.slice(-6).reverse().map(function (e) {
      return '<div class="ob-err"><b>' + esc(e.data.msg || 'Error') + '</b>' +
        '<span>' + esc(e.page || '') + (e.data.src ? ' \u00B7 ' + esc(e.data.src) + ':' + (e.data.line || 0) : '') +
        ' \u00B7 ' + timeAgo(e.t) + '</span></div>';
    }).join('') || '<div class="empty-msg">No JS errors in the past 7 days.</div>';

    var expIn = Math.max(0, Math.round((session.exp - Date.now()) / 3600000));
    $('obSession').innerHTML =
      'Signed in as <strong>' + esc(session.name) + '</strong> \u00B7 session expires in ~' + expIn + 'h' +
      (session.remember ? ' (30-day mode)' : '') + '<br/>' +
      'Login protected by PBKDF2 (210k iterations) + attempt lockout.';
  }
  $('obClear').addEventListener('click', function () {
    MSObserve.clear();
    toast('Telemetry cleared');
    renderHealth();
  });
  $('pwForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var cur = $('pwCur').value, nw = $('pwNew').value, msg = $('pwMsg');
    msg.style.color = '';
    MSAuth.changePassword('matin', cur, nw).then(function (hex) {
      $('pwForm').reset();
      msg.style.color = 'var(--gold)';
      msg.textContent = 'Password updated for this browser. To make it permanent everywhere, replace EXPECTED_HASH in assets/auth.js with: ' + hex;
      toast('Password updated');
    }).catch(function (err) {
      msg.style.color = '#B91C1C';
      msg.textContent = err.message || 'Could not update password.';
    });
  });

  /* ================= Render all ================= */
  function renderAll() {
    renderOverview();
    renderCalendar();
    renderDayPanel();
    renderClients();
    renderTasks();
  }
  renderAll();
  renderROI();
})();
