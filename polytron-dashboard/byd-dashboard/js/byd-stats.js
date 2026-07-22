/* ==========================================================================
   BYD Live Stats — JavaScript (API Integrated)
   Brand-specific dashboard: BYD only, full persona
   ========================================================================== */

'use strict';

/* ═══════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════ */
const BASE_URL = 'https://activity-tracker.abracodebra.com/api'; //[cite: 1]

// Utils
function pad(n) { return String(n).padStart(2, '0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const ST = {
  dateRange: ['', ''],
  hourRange: null,
  players: []
};

let isDraggingHour = false;
let dragHourStartH = 0;

const $ = id => document.getElementById(id);
const qsa = s => document.querySelectorAll(s);

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const tk = dateKey(new Date());
  ST.dateRange = [tk, tk];
  ST.hourRange = null;

  initDateInputs();
  bindReset();
  bindFilterPopup();
  bindDragEvents();
  startClock();

  // Panggil API pertama kali, build pills setelah data dapet
  fetchLiveTracker().then(() => {
    buildHourPills();
    render();
  });

  // Polling API setiap 5 detik
  setInterval(fetchLiveTracker, 5000);
});

/* ═══════════════════════════════════════════
   FETCH API DATA
═══════════════════════════════════════════ */
async function fetchLiveTracker() {
  try {
    const response = await fetch(`${BASE_URL}/activity-records`); //[cite: 1]
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    let newPlayers = [];
    const now = new Date().getTime();

    // Mapping response dari API ke format State (ST.players)[cite: 1]
    if (result.data && result.data.records) {
      const activities = Object.keys(result.data.records);
      activities.forEach(activityName => {
        const records = result.data.records[activityName];
        records.forEach(record => {
          const recordTime = new Date(record.created_at);
          const dk = dateKey(recordTime);
          const hr = recordTime.getHours();
          const isLive = (now - recordTime.getTime()) < 900000; // < 15 menit dianggap playing

          newPlayers.push({
            pid: record.full_name || 'Anonim',
            email: record.email || '-',
            phone: record.phone || record.no_hp || record.phone_number || '-',
            date: dk,
            hour: hr,
            time: `${pad(hr)}:${pad(recordTime.getMinutes())}:${pad(recordTime.getSeconds())}`,
            score: parseFloat(record.point_score || 0),
            status: isLive ? 'playing' : 'done',
            _rawTime: recordTime.getTime()
          });
        });
      });
    }

    // Urutkan dari yang paling baru
    newPlayers.sort((a, b) => b._rawTime - a._rawTime);
    ST.players = newPlayers;

    // Indikator sync UI
    const lt = $('live-text');
    if (lt) {
      lt.textContent = 'Live · Updated';
      setTimeout(() => { lt.textContent = 'Live · Syncing'; }, 3000);
    }

    render();
    refreshHourDots();

  } catch (error) {
    console.error("Gagal ambil data Live Tracker BYD:", error);
  }
}


/* ═══════════════════════════════════════════
   UI & EVENTS (TIDAK ADA PERUBAHAN LOGIC DOM BAWAAN)
═══════════════════════════════════════════ */

function bindDragEvents() {
  window.addEventListener('mouseup', () => {
    if (isDraggingHour) { isDraggingHour = false; render(); }
  });
  window.addEventListener('touchend', () => {
    if (isDraggingHour) { isDraggingHour = false; render(); }
  });
}

function bindFilterPopup() {
  const btn = $('filter-trigger-btn');
  const popup = $('filter-popup');
  const applyBtn = $('apply-btn');
  if (!btn || !popup) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = popup.style.display === 'block';
    popup.style.display = isVisible ? 'none' : 'block';
  });

  popup.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  document.addEventListener('click', () => {
    popup.style.display = 'none';
  });

  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      popup.style.display = 'none';
    });
  }
}

function initDateInputs() {
  const startInput = $('start-date');
  const endInput = $('end-date');
  if (!startInput || !endInput) return;

  startInput.value = ST.dateRange[0];
  endInput.value = ST.dateRange[1];

  const onChange = () => {
    let s = startInput.value;
    let e = endInput.value;
    if (s && e && s > e) { const tmp = s; s = e; e = tmp; }
    if (!s) s = e; if (!e) e = s;
    if (!s && !e) { s = dateKey(new Date()); e = s; }

    startInput.value = s;
    endInput.value = e;
    ST.dateRange = [s, e];

    refreshHourDots();
    render();
  };

  startInput.addEventListener('change', onChange);
  endInput.addEventListener('change', onChange);
}

function buildHourPills() {
  const container = $('hour-pills');
  if (!container) return;
  container.innerHTML = '';
  const nowH = new Date().getHours();

  container.onmouseleave = () => { if (isDraggingHour) { isDraggingHour = false; render(); } };

  if (!container.dataset.touchBound) {
    container.addEventListener('touchmove', (e) => {
      if (!isDraggingHour) return;
      e.preventDefault();
      const touch = e.touches[0];
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      if (el) {
        const pill = el.closest('.byd-hour-pill');
        if (pill && pill.dataset.h !== undefined) {
          const h = parseInt(pill.dataset.h);
          if (!ST.hourRange || ST.hourRange[1] !== h) {
            ST.hourRange = [dragHourStartH, h];
            updateHourVisuals();
          }
        }
      }
    }, { passive: false });
    container.dataset.touchBound = 'true';
  }

  const minH = ST.hourRange ? Math.min(ST.hourRange[0], ST.hourRange[1]) : -1;
  const maxH = ST.hourRange ? Math.max(ST.hourRange[0], ST.hourRange[1]) : -1;

  for (let h = 0; h < 24; h++) {
    const hasData = ST.players.some(p => p.date >= ST.dateRange[0] && p.date <= ST.dateRange[1] && p.hour === h);
    const isCur = h === nowH;
    const isActive = ST.hourRange ? (h >= minH && h <= maxH) : false;

    const el = document.createElement('button');
    el.className = `byd-hour-pill${hasData ? ' has-data' : ''}${isActive ? ' active' : ''}`;
    el.dataset.h = h;
    el.title = `Jam ${pad(h)}:00${isCur ? ' (sekarang)' : ''}`;
    el.innerHTML = `
      <span class="byd-hour-pill__h">${pad(h)}</span>
    `;
    if (isCur) el.style.borderColor = 'rgba(34,197,94,0.35)';

    el.onmousedown = (e) => {
      isDraggingHour = true;
      dragHourStartH = h;
      ST.hourRange = [h, h];
      updateHourVisuals();
    };
    el.addEventListener('touchstart', el.onmousedown, { passive: true });

    el.onmouseenter = (e) => {
      if (isDraggingHour) {
        ST.hourRange = [dragHourStartH, h];
        updateHourVisuals();
      }
    };

    container.appendChild(el);
  }
}

function updateHourVisuals() {
  const minH = ST.hourRange ? Math.min(ST.hourRange[0], ST.hourRange[1]) : -1;
  const maxH = ST.hourRange ? Math.max(ST.hourRange[0], ST.hourRange[1]) : -1;
  qsa('.byd-hour-pill').forEach((el) => {
    const h = parseInt(el.dataset.h);
    if (ST.hourRange && h >= minH && h <= maxH) el.classList.add('active');
    else el.classList.remove('active');
  });
}

function refreshHourDots() {
  qsa('.byd-hour-pill').forEach(el => {
    const h = parseInt(el.dataset.h);
    const has = ST.players.some(p => p.date >= ST.dateRange[0] && p.date <= ST.dateRange[1] && p.hour === h);
    el.classList.toggle('has-data', has);
  });
}

function bindReset() {
  const btn = $('reset-btn');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const tk = dateKey(new Date());
    ST.dateRange = [tk, tk];
    ST.hourRange = null;

    const startInput = $('start-date');
    const endInput = $('end-date');
    if (startInput) startInput.value = tk;
    if (endInput) endInput.value = tk;

    updateHourVisuals();
    refreshHourDots();
    render();
  });
}

/* ═══════════════════════════════════════════
   FILTER & GETTERS
═══════════════════════════════════════════ */
function getFiltered() {
  return ST.players.filter(p => {
    const dd = (p.date >= ST.dateRange[0] && p.date <= ST.dateRange[1]);
    let hh = true;
    if (ST.hourRange) {
      const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
      const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
      hh = (p.hour >= minH && p.hour <= maxH);
    }
    return dd && hh;
  });
}

function getTodayPlayers() {
  const tk = dateKey(new Date());
  return ST.players.filter(p => p.date === tk);
}

/* ═══════════════════════════════════════════
   RENDER
═══════════════════════════════════════════ */
function render() {
  const filtered = getFiltered();
  const todayAll = getTodayPlayers();
  const active = filtered.filter(p => p.status === 'playing').length;

  // ── Hero
  animCount($('hero-active'), active);
  const heroStrong = $('hero-label-strong');
  if (heroStrong) animCount(heroStrong, todayAll.length);

  animCount($('hero-today'), todayAll.length);

  // Peak hour
  const hc = Array(24).fill(0);
  filtered.forEach(p => hc[p.hour]++);
  const peakH = hc.indexOf(Math.max(...hc));
  const peakN = hc[peakH];
  const hpEl = $('hero-peak');
  if (hpEl) hpEl.textContent = peakN > 0 ? `${pad(peakH)}:00` : '--:--';

  // Avg score
  const avgEl = $('hero-avg');
  if (avgEl) {
    const scores = filtered.map(p => p.score);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    avgEl.textContent = avg ? avg : '—';
  }

  // ── Cards
  animCount($('card-active'), active);
  const cab = $('card-active-badge');
  if (cab) cab.textContent = active > 0 ? `● ${active} live` : '● Offline';

  animCount($('card-today'), todayAll.length);

  const cpEl = $('card-peak');
  if (cpEl) cpEl.textContent = peakN > 0 ? `${pad(peakH)}:00` : '--:--';
  const cpn = $('card-peak-n');
  if (cpn) cpn.textContent = peakN > 0 ? `${peakN} pemain` : '—';

  animCount($('card-filtered'), filtered.length);
  const cfl = $('card-filter-label');
  if (cfl) {
    const parts = [];
    if (ST.hourRange) {
      const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
      const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
      parts.push(minH === maxH ? `Jam ${pad(minH)}:00` : `Jam ${pad(minH)}:00-${pad(maxH)}:00`);
    }
    cfl.textContent = parts.length ? parts.join(' · ') : 'Semua waktu';
  }

  // ── Sidebar mini stats
  const sideTotal = $('side-total');
  const sideActive = $('side-active');
  const sideAvg = $('side-avg');
  if (sideTotal) animCount(sideTotal, todayAll.length);
  if (sideActive) animCount(sideActive, todayAll.filter(p => p.status === 'playing').length);
  if (sideAvg) {
    const sc = todayAll.map(p => p.score);
    sideAvg.textContent = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : '—';
  }

  // Nav badge
  const nc = $('nav-count');
  if (nc) nc.textContent = todayAll.length;

  // Table meta
  const tm = $('tbl-meta');
  if (tm) {
    const parts = [];
    if (ST.dateRange[0] === ST.dateRange[1]) {
      const d = new Date(ST.dateRange[0] + 'T00:00:00');
      parts.push(d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }));
    } else {
      const d1 = new Date(ST.dateRange[0] + 'T00:00:00');
      const d2 = new Date(ST.dateRange[1] + 'T00:00:00');
      parts.push(`${d1.getDate()} - ${d2.getDate()} ${d2.toLocaleDateString('id-ID', { month: 'long' })}`);
    }
    if (ST.hourRange) {
      const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
      const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
      parts.push(minH === maxH ? `Jam ${pad(minH)}:00` : `Jam ${pad(minH)}:00–${pad(maxH)}:00`);
    }
    tm.textContent = parts.length ? parts.join(' · ') : 'Menampilkan semua data hari ini';

    const ftText = $('filter-trigger-text');
    if (ftText) {
      ftText.textContent = parts.length ? parts.join(', ') : 'Filter Waktu';
    }
  }

  // ── Table
  renderTable(filtered);
}

/* ── Player Table ─────────────────────────── */
function renderTable(filtered) {
  const tbody = $('player-tbody');
  const badge = $('tbl-badge');
  if (!tbody) return;
  if (badge) badge.textContent = `${filtered.length} pemain`;

  const sorted = filtered.slice().sort((a, b) => {
    if (a.status === 'playing' && b.status !== 'playing') return -1;
    if (b.status === 'playing' && a.status !== 'playing') return 1;
    return (`${b.date} ${b.time}`).localeCompare(`${a.date} ${a.time}`);
  });

  const rows = sorted.slice(0, 50);

  if (!rows.length) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="byd-empty">
          <div class="byd-empty__icon">📭</div>
          <div class="byd-empty__msg">Belum ada data BYD untuk filter ini</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((p, i) => {
    const rank = i + 1;
    const rc = rank === 1 ? 'g1' : rank === 2 ? 'g2' : rank === 3 ? 'g3' : '';
    const rt = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`;
    const stCl = p.status;
    const stTx = p.status === 'playing' ? 'Sedang Main' : p.status === 'waiting' ? 'Menunggu' : 'Selesai';

    return `
      <tr${rank <= 3 ? ' class="row-new"' : ''}>
        <td class="td-rank ${rc}">${rt}</td>
        <td class="td-pid">${p.pid}</td>
        <td class="td-contact" style="font-size: 11px; color: var(--t-sub);">${p.email}</td>
        <td class="td-contact" style="font-size: 11px; color: var(--t-sub);">${p.phone}</td>
        <td class="td-time">${p.date} ${p.time}</td>
        <td class="td-score">${p.score}<span> pts</span></td>
        <td>
          <span class="byd-status ${stCl}">
            <span class="byd-status__dot"></span>
            ${stTx}
          </span>
        </td>
      </tr>`;
  }).join('');
}

/* ═══════════════════════════════════════════
   CLOCK
═══════════════════════════════════════════ */
function startClock() {
  function tick() {
    const n = new Date();
    const el = $('topbar-clock');
    if (el) el.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* ═══════════════════════════════════════════
   COUNT-UP ANIMATION
═══════════════════════════════════════════ */
function animCount(el, target) {
  if (!el) return;
  const cur = parseInt(el.textContent.replace(/\D/g, '')) || 0;
  if (cur === target) return;
  const delta = target - cur;
  const steps = Math.min(20, Math.abs(delta));
  const inc = delta / steps;
  let s = 0;
  const t = setInterval(() => {
    s++;
    el.textContent = Math.round(cur + inc * s);
    if (s >= steps) { el.textContent = target; clearInterval(t); }
  }, 20);
}