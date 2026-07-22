'use strict';

const DOW_ID = ['MIN','SEN','SEL','RAB','KAM','JUM','SAB'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const now = new Date();

const ST = {
  calMonth: now.getMonth(),
  calYear: now.getFullYear(),
  dayRange: [dateKey(now), dateKey(now)],
  hour: null,
  players: []
};

let isDragging = false;
let dragStartDk = null;

function pad(n) { return String(n).padStart(2,'0'); }
function dateKey(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function formatShort(dk) {
  const d = new Date(dk + 'T00:00:00');
  return `${d.getDate()} ${MONTHS_ID[d.getMonth()].substring(0,3)} ${d.getFullYear()}`;
}
const $ = id => document.getElementById(id);
const qsa = sel => document.querySelectorAll(sel);



document.addEventListener('DOMContentLoaded', () => {
  buildCalendar();
  buildHourPills();
  bindReset();
  bindFilterPopup();
  bindCalNav();
  render();
});

function bindFilterPopup() {
  const btn = $('filter-trigger-btn');
  const popup = $('filter-popup');
  if (!btn || !popup) return;
  
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isVisible = popup.style.display === 'block';
    popup.style.display = isVisible ? 'none' : 'block';
    btn.classList.toggle('open', !isVisible);
  });
  
  popup.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  document.addEventListener('click', () => {
    popup.style.display = 'none';
    btn.classList.remove('open');
  });
}

function bindCalNav() {
  const prevBtn = $('cal-prev');
  const nextBtn = $('cal-next');
  if(prevBtn) prevBtn.addEventListener('click', () => {
    ST.calMonth--;
    if(ST.calMonth < 0) { ST.calMonth = 11; ST.calYear--; }
    buildCalendar();
  });
  if(nextBtn) nextBtn.addEventListener('click', () => {
    ST.calMonth++;
    if(ST.calMonth > 11) { ST.calMonth = 0; ST.calYear++; }
    buildCalendar();
  });
}

function getSelectedDates() {
  if (!ST.dayRange[0] || !ST.dayRange[1]) return [];
  const d1 = new Date(ST.dayRange[0] + 'T00:00:00');
  const d2 = new Date(ST.dayRange[1] + 'T00:00:00');
  const minD = d1 < d2 ? d1 : d2;
  const maxD = d1 > d2 ? d1 : d2;
  
  const dates = [];
  for (let d = new Date(minD); d <= maxD; d.setDate(d.getDate() + 1)) {
    dates.push(dateKey(d));
  }
  return dates;
}

// Calendar UI
function buildCalendar() {
  const container = $('day-pills');
  if (!container) return;
  container.innerHTML = '';
  
  const lbl = $('cal-month-year');
  if (lbl) lbl.textContent = `${MONTHS_ID[ST.calMonth]} ${ST.calYear}`;

  const firstDay = new Date(ST.calYear, ST.calMonth, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(ST.calYear, ST.calMonth + 1, 0).getDate();

  container.onmouseleave = () => { if(isDragging) { isDragging = false; render(); } };
  window.addEventListener('mouseup', () => { if(isDragging) { isDragging = false; render(); } });

  // padding
  for (let i = 0; i < firstDay; i++) {
    const el = document.createElement('div');
    el.className = 'day-pill empty';
    container.appendChild(el);
  }

  const selectedDates = getSelectedDates();

  for (let d = 1; d <= daysInMonth; d++) {
    const dk = dateKey(new Date(ST.calYear, ST.calMonth, d));
    const isActive = selectedDates.includes(dk);
    const isToday = dk === dateKey(new Date());

    const el = document.createElement('button');
    el.className = `day-pill${isActive ? ' active' : ''}`;
    el.dataset.dk = dk;
    el.innerHTML = `<span class="day-val" style="font-size: 13px; font-weight: 700; ${isToday && !isActive ? 'color: var(--primary)' : ''}">${d}</span>`;

    el.onmousedown = (e) => {
      isDragging = true;
      dragStartDk = dk;
      ST.dayRange = [dk, dk];
      ST.hour = null;
      qsa('.hour-pill').forEach(p => p.classList.remove('active'));
      updateDayVisuals();
    };

    el.onmouseenter = (e) => {
      if(isDragging) {
        ST.dayRange = [dragStartDk, dk];
        updateDayVisuals();
      }
    };
    
    container.appendChild(el);
  }
}

function updateDayVisuals() {
  const selectedDates = getSelectedDates();
  qsa('.day-pill:not(.empty)').forEach(el => {
    if(selectedDates.includes(el.dataset.dk)) el.classList.add('active');
    else el.classList.remove('active');
  });
}

// Hour Pills (Grid Style)
function buildHourPills() {
  const container = $('hour-pills');
  if (!container) return;
  container.innerHTML = '';
  const nowH = new Date().getHours();

  for (let h = 0; h < 24; h++) {
    const isCur = h === nowH;

    const el = document.createElement('button');
    el.className = `hour-pill${ST.hour === h ? ' active' : ''}`;
    el.dataset.h = h;
    el.innerHTML = pad(h);
    if(isCur) el.style.borderColor = 'var(--success)';
    
    el.addEventListener('click', () => {
      ST.hour = (ST.hour === h) ? null : h;
      qsa('.hour-pill').forEach(p => p.classList.remove('active'));
      if (ST.hour !== null) el.classList.add('active');
      render();
    });
    container.appendChild(el);
  }
}

function refreshHourDots() {
  const selectedDates = getSelectedDates();
  qsa('.hour-pill').forEach(el => {
    const h = parseInt(el.dataset.h);
    const has = ST.players.some(p => selectedDates.includes(p.date) && p.hour === h);
    el.classList.toggle('has-data', has);
  });
}

function bindReset() {
  const btn = $('reset-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const today = new Date();
    ST.calMonth = today.getMonth();
    ST.calYear = today.getFullYear();
    ST.dayRange = [dateKey(today), dateKey(today)];
    ST.hour = null;
    
    buildCalendar();
    qsa('.hour-pill').forEach(p => p.classList.remove('active'));
    render();
  });
}

function getFiltered() {
  const selectedDates = getSelectedDates();
  return ST.players.filter(p => {
    const dd = selectedDates.includes(p.date);
    const hh = ST.hour === null || p.hour === ST.hour;
    return dd && hh;
  });
}

// ── RENDER ───────────────────────────
function render() {
  const ftText = $('filter-trigger-text');
  if (ftText) {
    const selectedDates = getSelectedDates();
    let text = 'Semua Waktu';
    if(selectedDates.length === 1) {
      text = formatShort(selectedDates[0]);
    } else if (selectedDates.length > 1) {
      text = `${formatShort(selectedDates[0])} - ${formatShort(selectedDates[selectedDates.length-1])}`;
    }
    
    if (ST.hour !== null) {
      text += ` · Jam ${pad(ST.hour)}:00`;
    }
    ftText.textContent = text;
  }

  refreshHourDots();

  // Re-render table & cards with current filter (defined in script.js)
  if (typeof renderFilteredData === 'function') {
    renderFilteredData();
  }
}

