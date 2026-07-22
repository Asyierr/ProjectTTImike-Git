(function () {
  /* =========================================================
     Konfigurasi per-brand — tinggal tambah entri baru di sini
     untuk brand lain (logo, font, palet ikut otomatis dipakai)
  ========================================================== */
  const BRANDS = {
    jetour: {
      name: 'Jetour',
      tagline: 'Konsol Keterlibatan Langsung',
      fontDisplay: "'DoubleTwo', sans-serif",
      fontBody: "'Manrope', sans-serif",
      fontData: "'Manrope', sans-serif"
    }
  };
  function applyBrand(key) {
    const b = BRANDS[key];
    const root = document.documentElement.style;
    root.setProperty('--font-display', b.fontDisplay);
    root.setProperty('--font-body', b.fontBody);
    root.setProperty('--font-data', b.fontData);
    const brandWord = document.getElementById('brandWord');
    const brandTagline = document.getElementById('brandTagline');
    if (brandWord) brandWord.textContent = b.name.toUpperCase();
    if (brandTagline) brandTagline.textContent = b.tagline;
  }
  applyBrand('jetour');

  /* ---------------- helpers ---------------- */
  const DOW = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  function pad2(n) { return String(n).padStart(2, '0'); }
  function dateKey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function isSameDay(a, b) { return dateKey(a) === dateKey(b); }
  function addDays(d, n) { const c = new Date(d); c.setDate(c.getDate() + n); return c; }

  const today = new Date();

  /* ---------------- state ---------------- */
  const state = {
    dayMode: 'today',        // today | yesterday | last7 | custom
    customDateStart: new Date(),
    customDateEnd: new Date(),
    weekOffset: 0,
    hourMode: 'all',         // all | morning | afternoon | evening | night | custom
    hourRange: [0, 23],
    liveCount: 0
  };

  const HOUR_PRESETS = {
    all: [0, 23], morning: [6, 11], afternoon: [12, 14], evening: [15, 17], night: [18, 23]
  };

  /* ---------------- theming ---------------- */
  function personaForHour(mid) {
    if (mid >= 6 && mid < 15) return 'teal';
    if (mid >= 15 && mid < 18) return 'gold';
    return 'ink';
  }
  function applyTheme() {
    let mid;
    if (state.hourMode === 'all') { mid = today.getHours(); }
    else { mid = (state.hourRange[0] + state.hourRange[1]) / 2; }
    const persona = personaForHour(mid);
    document.body.classList.remove('theme-teal', 'theme-gold', 'theme-ink');
    document.body.classList.add('theme-' + persona);
  }

  /* ---------------- custom date picker ---------------- */
  const customDateInputs = document.getElementById('customDateInputs');
  let calViewDate = new Date();
  let calTempStart = state.customDateStart;
  let calTempEnd = state.customDateEnd;
  let calIsDragging = false;

  const calMonthYear = document.getElementById('calMonthYear');
  const calendarGrid = document.getElementById('calendarGrid');
  const calSelectedText = document.getElementById('calSelectedText');
  const calApplyBtn = document.getElementById('calApplyBtn');

  document.querySelectorAll('#daySelectGroup .filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#daySelectGroup .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      state.dayMode = this.dataset.value;
      if (state.dayMode === 'custom') {
        customDateInputs.classList.remove('hidden');
        initCalendar();
      } else {
        customDateInputs.classList.add('hidden');
      }
      refreshAll();
    });
  });

  const calPrev = document.getElementById('calPrev');
  const calNext = document.getElementById('calNext');
  if (calPrev) calPrev.addEventListener('click', () => { calViewDate.setMonth(calViewDate.getMonth() - 1); initCalendar(); });
  if (calNext) calNext.addEventListener('click', () => { calViewDate.setMonth(calViewDate.getMonth() + 1); initCalendar(); });

  function initCalendar() {
    if (!calendarGrid) return;
    const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    calMonthYear.textContent = new Date(y, m).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    calendarGrid.innerHTML = '';

    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'cal-day empty';
      calendarGrid.appendChild(empty);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(y, m, i);
      const dayEl = document.createElement('div');
      dayEl.className = 'cal-day';
      dayEl.textContent = i;
      dayEl.dataset.date = d.getTime();

      dayEl.addEventListener('mousedown', () => {
        calTempStart = d;
        calTempEnd = null;
        calIsDragging = true;
        updateCalendarUI();
      });
      dayEl.addEventListener('mouseenter', () => {
        if (calIsDragging) {
          calTempEnd = d;
          updateCalendarUI();
        }
      });
      dayEl.addEventListener('mouseup', () => {
        if (calIsDragging) {
          calTempEnd = d;
          calIsDragging = false;
          updateCalendarUI();
        }
      });

      dayEl.addEventListener('touchstart', (e) => {
        calTempStart = d;
        calTempEnd = d;
        calIsDragging = true;
        updateCalendarUI();
      }, { passive: true });

      calendarGrid.appendChild(dayEl);
    }
    updateCalendarUI();
  }

  function updateDayElClass(el, d) {
    el.className = 'cal-day';
    const t = d.getTime();
    let s = calTempStart ? calTempStart.getTime() : null;
    let e = calTempEnd ? calTempEnd.getTime() : null;
    if (s && e && s > e) { let temp = s; s = e; e = temp; }

    if (s && t === s) el.classList.add('range-start');
    if (e && t === e) el.classList.add('range-end');
    if (s && !e && t === s) el.classList.add('range-end');
    if (s && e && t >= s && t <= e) el.classList.add('in-range');
  }

  function updateCalendarUI() {
    if (!calendarGrid) return;
    Array.from(calendarGrid.children).forEach(el => {
      if (!el.classList.contains('empty')) {
        updateDayElClass(el, new Date(parseInt(el.dataset.date)));
      }
    });

    let s = calTempStart, e = calTempEnd || calTempStart;
    if (s && e && s > e) { let temp = s; s = e; e = temp; }

    if (s && e) {
      if (isSameDay(s, e)) {
        calSelectedText.textContent = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      } else {
        calSelectedText.textContent = s.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ' - ' + e.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      }
      calApplyBtn.disabled = false;
    } else {
      calSelectedText.textContent = "Pilih tanggal mulai";
      calApplyBtn.disabled = true;
    }
  }

  document.addEventListener('mouseup', () => { if (calIsDragging) calIsDragging = false; });
  document.addEventListener('touchend', () => { if (calIsDragging) calIsDragging = false; });

  if (calendarGrid) {
    calendarGrid.addEventListener('touchmove', (e) => {
      if (!calIsDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains('cal-day') && !target.classList.contains('empty')) {
        const d = new Date(parseInt(target.dataset.date));
        calTempEnd = d;
        updateCalendarUI();
      }
    }, { passive: false });
  }

  if (calApplyBtn) {
    calApplyBtn.addEventListener('click', () => {
      let s = calTempStart, e = calTempEnd || calTempStart;
      if (s && e && s > e) { let temp = s; s = e; e = temp; }
      state.customDateStart = s;
      state.customDateEnd = e;
      customDateInputs.classList.add('hidden');
      refreshAll();
    });
  }

  /* ---------------- hour filter slider ---------------- */
  const customHourInputs = document.getElementById('customHourInputs');

  document.querySelectorAll('#hourSelectGroup .filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('#hourSelectGroup .filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      state.hourMode = this.dataset.value;
      if (state.hourMode === 'custom') {
        customHourInputs.classList.remove('hidden');
        initHourGrid();
      } else {
        customHourInputs.classList.add('hidden');
        state.hourRange = HOUR_PRESETS[state.hourMode].slice();
        refreshAll();
      }
    });
  });

  const hourGrid = document.getElementById('hourGrid');
  const hourSelectedText = document.getElementById('hourSelectedText');
  const hourApplyBtn = document.getElementById('hourApplyBtn');

  let hourTempStart = state.hourRange[0];
  let hourTempEnd = state.hourRange[1];
  let hourIsDragging = false;

  function initHourGrid() {
    if (hourGrid) hourGrid.innerHTML = '';
    for (let i = 0; i < 24; i++) {
      const box = document.createElement('div');
      box.className = 'hour-box';
      box.textContent = pad2(i);
      box.dataset.hour = i;

      box.addEventListener('mousedown', () => {
        hourTempStart = i; hourTempEnd = i; hourIsDragging = true; updateHourUI();
      });
      box.addEventListener('mouseenter', () => {
        if (hourIsDragging) { hourTempEnd = i; updateHourUI(); }
      });
      box.addEventListener('mouseup', () => {
        if (hourIsDragging) { hourTempEnd = i; hourIsDragging = false; updateHourUI(); }
      });
      box.addEventListener('touchstart', (e) => {
        hourTempStart = i; hourTempEnd = i; hourIsDragging = true; updateHourUI();
      }, { passive: true });

      if (hourGrid) hourGrid.appendChild(box);
    }
    updateHourUI();
  }

  function updateHourUI() {
    if (!hourGrid) return;
    Array.from(hourGrid.children).forEach(el => {
      el.className = 'hour-box';
      const h = parseInt(el.dataset.hour);
      let s = hourTempStart, e = hourTempEnd;
      if (s !== null && e !== null && s > e) { let temp = s; s = e; e = temp; }

      if (s !== null && h === s) el.classList.add('range-start');
      if (e !== null && h === e) el.classList.add('range-end');
      if (s !== null && e !== null && h >= s && h <= e) el.classList.add('in-range');
    });

    let s = hourTempStart, e = hourTempEnd;
    if (s !== null && e !== null && s > e) { let temp = s; s = e; e = temp; }

    if (s !== null && e !== null) {
      if (s === e) {
        hourSelectedText.textContent = pad2(s) + ':00 - ' + pad2(s) + ':59';
      } else {
        hourSelectedText.textContent = pad2(s) + ':00 - ' + pad2(e) + ':59';
      }
      hourApplyBtn.disabled = false;
    } else {
      hourSelectedText.textContent = "Pilih rentang jam";
      hourApplyBtn.disabled = true;
    }
  }

  document.addEventListener('mouseup', () => { if (hourIsDragging) hourIsDragging = false; });
  document.addEventListener('touchend', () => { if (hourIsDragging) hourIsDragging = false; });

  if (hourGrid) {
    hourGrid.addEventListener('touchmove', (e) => {
      if (!hourIsDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target && target.classList.contains('hour-box')) {
        const h = parseInt(target.dataset.hour);
        hourTempEnd = h;
        updateHourUI();
      }
    }, { passive: false });
  }

  if (hourApplyBtn) {
    hourApplyBtn.addEventListener('click', () => {
      let s = hourTempStart, e = hourTempEnd;
      if (s !== null && e !== null && s > e) { let temp = s; s = e; e = temp; }
      state.hourRange = [s, e];
      customHourInputs.classList.add('hidden');
      refreshAll();
    });
  }

  /* ---------------- INTEGRASI API REAL-TIME ---------------- */
  const BASE_URL = 'https://activity-tracker.abracodebra.com/api'; //[cite: 1]
  let rawRecords = [];

  // Fungsi Fetch Utama
  async function fetchActivityData() {
    try {
      const response = await fetch(`${BASE_URL}/activity-records`); //[cite: 1]
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      let newRecords = [];

      // Flatten semua record dari berbagai activity[cite: 1]
      if (result.data && result.data.records) {
        const activities = Object.keys(result.data.records);
        activities.forEach(activityName => {
          const records = result.data.records[activityName];
          records.forEach(record => {
            newRecords.push(record);
          });
        });
      }

      // Urutkan data berdasarkan waktu terbaru
      newRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      rawRecords = newRecords;

      // Update Tampilan Otomatis
      refreshAll(false);

      const livePageActive = document.getElementById('page-live-players');
      if (livePageActive && livePageActive.classList.contains('active')) {
        const searchInput = document.getElementById('liveSearchInput');
        renderLivePlayers(searchInput ? searchInput.value : '');
      }

    } catch (error) {
      console.error("Gagal mengambil data Jetour Live Tracker:", error);
    }
  }

  // Fungsi Filter Data
  function getFilteredRecords() {
    let startD, endD;
    const t = new Date();
    t.setHours(0, 0, 0, 0);

    if (state.dayMode === 'today') {
      startD = new Date(t);
      endD = new Date(t); endD.setHours(23, 59, 59, 999);
    } else if (state.dayMode === 'yesterday') {
      startD = addDays(t, -1);
      endD = addDays(t, -1); endD.setHours(23, 59, 59, 999);
    } else if (state.dayMode === 'last7') {
      startD = addDays(t, -7);
      endD = new Date(t); endD.setHours(23, 59, 59, 999);
    } else if (state.dayMode === 'custom') {
      startD = new Date(state.customDateStart); startD.setHours(0, 0, 0, 0);
      endD = new Date(state.customDateEnd || state.customDateStart); endD.setHours(23, 59, 59, 999);
    }

    const [startH, endH] = state.hourMode === 'all' ? [0, 23] : state.hourRange;

    return rawRecords.filter(r => {
      const d = new Date(r.created_at);
      if (d < startD || d > endD) return false;

      const h = d.getHours();
      if (h < startH || h > endH) return false;

      return true;
    });
  }

  // Odometer UI
  function renderOdometer(n) {
    const el = document.getElementById('odometer');
    if (!el) return;
    const digits = String(n).padStart(6, '0').split('');
    el.innerHTML = '';
    digits.forEach(function (d) {
      const box = document.createElement('div');
      box.className = 'digit';
      box.textContent = d;
      el.appendChild(box);
    });
    el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
  }

  // Bar Chart Distribusi Jam
  function renderBars(filteredRecords) {
    const wrap = document.getElementById('bars');
    if (!wrap) return;

    wrap.innerHTML = '';

    const [s, e] = state.hourMode === 'all' ? [0, 23] : state.hourRange;
    const counts = {};
    for (let h = s; h <= e; h++) counts[h] = 0;

    filteredRecords.forEach(r => {
      const h = new Date(r.created_at).getHours();
      if (counts[h] !== undefined) counts[h]++;
    });

    const maxVal = Math.max(...Object.values(counts), 1);

    for (let h = s; h <= e; h++) {
      const v = counts[h];
      const col = document.createElement('div');
      col.className = 'bar-col';
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = Math.round((v / maxVal) * 100) + '%';
      col.appendChild(bar);

      if (h % 3 === 0 || s === e) {
        const tick = document.createElement('div');
        tick.className = 'bar-tick';
        tick.textContent = h;
        col.appendChild(tick);
      }
      wrap.appendChild(col);
    }
  }

  // Tabel Daftar Pemain
  function populatePlayerTable(filteredRecords) {
    const tbody = document.getElementById('playerTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (filteredRecords.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; opacity:0.5; padding: 20px;">Tidak ada data pada rentang waktu ini.</td></tr>';
      return;
    }

    const nowTime = new Date().getTime();

    filteredRecords.slice(0, 50).forEach(record => {
      const recordTime = new Date(record.created_at).getTime();
      const isLive = (nowTime - recordTime) < 900000; // < 15 menit dianggap Live

      const timeStr = new Date(record.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      const dateStr = new Date(record.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

      const statusHtml = isLive
        ? '<span class="status-badge" style="background:var(--accent);color:#fff;">Sedang Main</span>'
        : '<span class="status-badge">Selesai</span>';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${record.full_name || 'Anonim'}</td>
        <td>${dateStr} ${timeStr}</td>
        <td style="font-weight: bold;">${record.point_score || 0}</td>
        <td>${statusHtml}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  function setupLiveIndicator() {
    const live = (state.dayMode === 'today');
    const liveDot = document.getElementById('liveDot');
    if (liveDot) liveDot.classList.toggle('is-static', !live);

    const heroLabel = document.getElementById('heroLabel');
    if (heroLabel) {
      heroLabel.textContent = live
        ? 'Pemain Aktif Hari Ini'
        : (state.dayMode === 'last7' ? 'Total Pemain — 7 Hari Terakhir' : 'Jumlah Pemain Tercatat');
    }
  }

  // Eksekusi Semua UI di tab Overview
  function refreshAll(updateTheme = true) {
    if (updateTheme) applyTheme();
    const filteredRecords = getFilteredRecords();

    state.liveCount = filteredRecords.length;
    renderOdometer(state.liveCount);
    renderBars(filteredRecords);
    populatePlayerTable(filteredRecords);
    setupLiveIndicator();
  }

  /* ---------------- page navigation ---------------- */
  function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');

    if (pageId === 'live-players') {
      const searchInput = document.getElementById('liveSearchInput');
      renderLivePlayers(searchInput ? searchInput.value : '');
    }
  }

  document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
    item.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelectorAll('.sidebar-nav .nav-item').forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      switchPage(this.dataset.page);
    });
  });

  /* ---------------- Live Players page ---------------- */
  function renderLivePlayers(searchQuery) {
    const grid = document.getElementById('livePlayersGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const nowTime = new Date().getTime();

    // Saring hanya pemain yang statusnya LIVE (< 15 menit)
    let livePlayers = rawRecords.filter(record => {
      return (nowTime - new Date(record.created_at).getTime()) < 900000;
    });

    const query = (searchQuery || '').toLowerCase().trim();
    if (query) {
      livePlayers = livePlayers.filter(p => (p.full_name || 'anonim').toLowerCase().includes(query));
    }

    if (livePlayers.length === 0) {
      grid.innerHTML = '<div class="no-players-msg" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--color-text-mut);">Tidak ada pemain yang sedang aktif saat ini.</div>';
      return;
    }

    livePlayers.forEach(record => {
      const card = document.createElement('div');
      card.className = 'player-card';

      const timeStr = new Date(record.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      // Kalkulasi menit bermain
      const diffMs = nowTime - new Date(record.created_at).getTime();
      const minutesPlayed = Math.floor(diffMs / 60000) || 1;

      card.innerHTML = `
        <div class="player-card-header">
          <div class="player-card-name" style="font-weight:bold;">👤 ${record.full_name || 'Anonim'}</div>
          <div class="player-card-status playing">
            <span class="status-dot"></span>Bermain
          </div>
        </div>
        <div class="player-card-stats">
          <div class="player-stat-item">
            <span class="player-stat-label">Skor</span>
            <span class="player-stat-value">${record.point_score || 0} pts</span>
          </div>
          <div class="player-stat-item">
            <span class="player-stat-label">Waktu</span>
            <span class="player-stat-value">${record.time_score || 0} s</span>
          </div>
          <div class="player-stat-item">
            <span class="player-stat-label">Durasi</span>
            <span class="player-stat-value">${minutesPlayed} menit</span>
          </div>
          <div class="player-stat-item">
            <span class="player-stat-label">Bergabung</span>
            <span class="player-stat-value">${timeStr}</span>
          </div>
        </div>
        <div class="player-card-bar" style="width:100%"></div>
      `;
      grid.appendChild(card);
    });
  }

  // Search functionality di Tab Live Players
  const liveSearchInput = document.getElementById('liveSearchInput');
  if (liveSearchInput) {
    liveSearchInput.addEventListener('input', function () {
      renderLivePlayers(this.value);
    });
  }

  // ---------------- INIT & POLLING SETUP ----------------
  fetchActivityData(); // Panggil data pertama kali
  setInterval(fetchActivityData, 5000); // Polling otomatis tiap 5 detik

})();