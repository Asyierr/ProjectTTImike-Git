'use strict';

const DOW_ID = ['MIN','SEN','SEL','RAB','KAM','JUM','SAB'];
const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

const now = new Date();

const ST = {
  calMonth: now.getMonth(),
  calYear: now.getFullYear(),
  dayRange: [dateKey(now), dateKey(now)],
  hourRange: null,
  players: []
};

let isDraggingDay = false;
let dragStartDk = null;

let isDraggingHour = false;
let dragStartHour = null;

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
  bindTouchEvents();
  render();
});

function bindTouchEvents() {
  document.addEventListener('touchmove', (e) => {
    if (isDraggingDay) {
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) {
        const pill = target.closest('.day-pill');
        if (pill && pill.dataset.dk) {
          ST.dayRange = [dragStartDk, pill.dataset.dk];
          updateDayVisuals();
        }
      }
    } else if (isDraggingHour) {
      e.preventDefault();
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (target) {
        const pill = target.closest('.hour-pill');
        if (pill && pill.dataset.h !== undefined) {
          ST.hourRange = [dragStartHour, parseInt(pill.dataset.h)];
          updateHourVisuals();
        }
      }
    }
  }, {passive: false});

  document.addEventListener('touchend', () => {
    if (isDraggingDay) {
      isDraggingDay = false;
      render();
    }
    if (isDraggingHour) {
      isDraggingHour = false;
      render();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isDraggingDay) {
      isDraggingDay = false;
      render();
    }
    if (isDraggingHour) {
      isDraggingHour = false;
      render();
    }
  });
}

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
  
  const applyBtn = $('apply-filter-btn');
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      popup.style.display = 'none';
      btn.classList.remove('open');
    });
  }
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

function getSelectedHours() {
  if (!ST.hourRange) return [];
  const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
  const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
  const hours = [];
  for (let i = minH; i <= maxH; i++) hours.push(i);
  return hours;
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

  container.onmouseleave = () => { if(isDraggingDay) { isDraggingDay = false; render(); } };

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

    const handleDayDragStart = (e) => {
      isDraggingDay = true;
      dragStartDk = dk;
      ST.dayRange = [dk, dk];
      ST.hourRange = null;
      updateHourVisuals();
      updateDayVisuals();
    };

    el.addEventListener('mousedown', handleDayDragStart);
    el.addEventListener('touchstart', handleDayDragStart, {passive: true});

    el.addEventListener('mouseenter', (e) => {
      if(isDraggingDay) {
        ST.dayRange = [dragStartDk, dk];
        updateDayVisuals();
      }
    });
    
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

function updateHourVisuals() {
  const selectedHours = getSelectedHours();
  qsa('.hour-pill').forEach(p => {
    if (selectedHours.includes(parseInt(p.dataset.h))) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
}

// Hour Pills (Grid Style)
function buildHourPills() {
  const container = $('hour-pills');
  if (!container) return;
  container.innerHTML = '';
  const nowH = new Date().getHours();

  // Handle leave container
  container.onmouseleave = () => { if(isDraggingHour) { isDraggingHour = false; render(); } };

  for (let h = 0; h < 24; h++) {
    const isCur = h === nowH;

    const el = document.createElement('button');
    el.className = `hour-pill`;
    el.dataset.h = h;
    el.innerHTML = pad(h);
    if(isCur) el.style.borderColor = 'var(--success)';
    
    const hNum = h;
    const handleHourDragStart = (e) => {
      if (ST.hourRange && ST.hourRange[0] === hNum && ST.hourRange[1] === hNum) {
        // Toggle off if it's the exact same single hour
        ST.hourRange = null;
        isDraggingHour = false;
        updateHourVisuals();
        render(); // Immediately render
      } else {
        isDraggingHour = true;
        dragStartHour = hNum;
        ST.hourRange = [hNum, hNum];
        updateHourVisuals();
      }
    };

    el.addEventListener('mousedown', handleHourDragStart);
    el.addEventListener('touchstart', handleHourDragStart, {passive: true});

    el.addEventListener('mouseenter', () => {
      if(isDraggingHour) {
        ST.hourRange = [dragStartHour, hNum];
        updateHourVisuals();
      }
    });

    container.appendChild(el);
  }
  updateHourVisuals(); // Set initial active states
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
    ST.hourRange = null;
    
    buildCalendar();
    updateHourVisuals();
    render();
  });
}

function getFiltered() {
  const selectedDates = getSelectedDates();
  const selectedHours = getSelectedHours();
  return ST.players.filter(p => {
    const dd = selectedDates.includes(p.date);
    const hh = ST.hourRange === null || selectedHours.includes(p.hour);
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
    
    if (ST.hourRange !== null) {
      const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
      const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
      if (minH === maxH) {
        text += ` · Jam ${pad(minH)}:00`;
      } else {
        text += ` · Jam ${pad(minH)}:00 - ${pad(maxH)}:59`;
      }
    }
    ftText.textContent = text;
  }

  refreshHourDots();

  // Re-render table & cards with current filter (defined in script.js)
  if (typeof renderFilteredData === 'function') {
    renderFilteredData();
  }
}
