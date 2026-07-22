// Base URL dari dokumentasi API lo
const BASE_URL = 'https://activity-tracker.abracodebra.com/api'; //[cite: 1]

// State management untuk menyimpan data mentah
let rawRecords = [];

// ==========================================
// 1. INISIALISASI UI & FILTER
// ==========================================
function initUI() {
  // Init Flatpickr untuk Date Range
  flatpickr("#dateRangePicker", {
    mode: "range",
    dateFormat: "Y-m-d",
    theme: "dark",
    onChange: () => processAndRenderData() // Re-render saat filter berubah
  });

  const startHourPicker = flatpickr("#startHourPicker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:00",
    time_24hr: true,
    defaultDate: "00:00",
    theme: "dark",
    minuteIncrement: 60,
    onChange: () => processAndRenderData()
  });

  const endHourPicker = flatpickr("#endHourPicker", {
    enableTime: true,
    noCalendar: true,
    dateFormat: "H:00",
    time_24hr: true,
    defaultDate: "23:00",
    theme: "dark",
    minuteIncrement: 60,
    onChange: () => processAndRenderData()
  });

  // Event listener untuk tombol Reset
  document.getElementById('filterResetBtn').addEventListener('click', () => {
    document.getElementById('dateRangePicker')._flatpickr.clear();
    startHourPicker.setDate("00:00");
    endHourPicker.setDate("23:00");
    processAndRenderData();
  });
}

// ==========================================
// 2. FETCH DATA DARI API (POLLING)
// ==========================================
async function fetchLiveTracker() {
  try {
    // Fetch data records dari API[cite: 1]
    const response = await fetch(`${BASE_URL}/activity-records`); //[cite: 1]
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();

    // Bersihkan data lama
    rawRecords = [];

    // Data records dari API dikelompokkan berdasarkan nama activity[cite: 1]
    // Kita flatten (gabungkan) semua record ke dalam satu array untuk dashboard
    if (result.data && result.data.records) {
      const activities = Object.keys(result.data.records);
      activities.forEach(activityName => {
        const records = result.data.records[activityName];
        records.forEach(record => {
          rawRecords.push(record);
        });
      });
    }

    // Urutkan data berdasarkan waktu terbaru (created_at DESC)
    rawRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Proses dan render data ke UI
    processAndRenderData();

  } catch (error) {
    console.error("Gagal update live tracker:", error);
  }
}

// ==========================================
// 3. LOGIKA FILTER & RENDER
// ==========================================
function processAndRenderData() {
  const datePicker = document.getElementById('dateRangePicker')._flatpickr;
  const selectedDates = datePicker.selectedDates;
  const startStr = document.getElementById('startHourPicker').value;
  const endStr = document.getElementById('endHourPicker').value;
  const startHour = startStr ? parseInt(startStr.split(':')[0]) : 0;
  const endHour = endStr ? parseInt(endStr.split(':')[0]) : 23;

  // Filter data berdasarkan input UI
  const filteredRecords = rawRecords.filter(record => {
    const recordDate = new Date(record.created_at);
    const recordHour = recordDate.getHours();

    // Cek Filter Jam
    if (recordHour < startHour || recordHour > endHour) return false;

    // Cek Filter Tanggal (jika ada rentang yang dipilih)
    if (selectedDates.length === 2) {
      const startDate = selectedDates[0];
      const endDate = selectedDates[1];
      // Set end date to end of day for proper comparison
      endDate.setHours(23, 59, 59, 999);

      if (recordDate < startDate || recordDate > endDate) return false;
    }

    return true;
  });

  renderStats(filteredRecords);
  renderTable(filteredRecords);
  renderBars(filteredRecords);
}

// ==========================================
// 4. RENDER FUNGSI-FUNGSI UI
// ==========================================
function renderStats(records) {
  const statsGrid = document.getElementById('statsGrid');

  // Hitung pemain live (data yang masuk kurang dari 15 menit lalu)
  const now = new Date().getTime();
  const livePlayers = records.filter(r => (now - new Date(r.created_at).getTime()) < 900000).length;

  // Kalkulasi Rata-rata Skor
  let totalScore = 0;
  records.forEach(r => totalScore += parseFloat(r.point_score || 0));
  const avgScore = records.length > 0 ? (totalScore / records.length).toFixed(0) : 0;

  statsGrid.innerHTML = `
        <div class="stat-card" style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 8px;">Total Pemain (Filter)</div>
            <div style="font-size: 32px; font-weight: 700;">${records.length}</div>
        </div>
        <div class="stat-card" style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 8px;">Sedang Bermain (Live)</div>
            <div style="font-size: 32px; font-weight: 700; color: #10b981;">${livePlayers}</div>
        </div>
        <div class="stat-card" style="background: var(--bg-card); padding: 20px; border-radius: 12px; border: 1px solid var(--border);">
            <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 8px;">Rata-rata Skor</div>
            <div style="font-size: 32px; font-weight: 700; color: #3b82f6;">${avgScore} pts</div>
        </div>
    `;
}

function renderTable(records) {
  const tbody = document.getElementById('playersTableBody');
  tbody.innerHTML = '';

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px;">Tidak ada data pemain.</td></tr>`;
    return;
  }

  records.slice(0, 50).forEach(record => { // Batasi 50 data terbaru agar UI tidak lag
    const recordTime = new Date(record.created_at).getTime();
    const now = new Date().getTime();
    const isNew = (now - recordTime) < 900000; // 15 Menit dianggap "Live"

    // Format waktu agar lebih rapi (DD MMM YYYY, HH:MM)
    const timeFormatted = new Date(record.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const statusHtml = isNew
      ? `<span style="background: rgba(16,185,129,0.2); color: #10b981; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">Live</span>`
      : `<span style="background: rgba(255,255,255,0.1); color: #999; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">Selesai</span>`;

    tbody.innerHTML += `
            <tr>
                <td data-label="ID Pemain" style="font-weight: 600; color: #fff;">${record.full_name || 'Anonim'}</td>
                <td data-label="Waktu">${timeFormatted}</td>
                <td data-label="Durasi">${record.time_score || '0'}s</td>
                <td data-label="Skor" style="font-weight: bold; color: #3b82f6;">${record.point_score || '0'}</td>
                <td data-label="No HP">${record.phone_number || '-'}</td>
                <td data-label="Email">${record.email || '-'}</td>
                <td data-label="Status">${statusHtml}</td>
            </tr>
        `;
  });
}

function renderBars(records) {
  const barsContainer = document.getElementById('barsContainer');
  const chartTag = document.getElementById('chartTag');
  barsContainer.innerHTML = '';
  barsContainer.style.display = 'flex';
  barsContainer.style.alignItems = 'flex-end';
  barsContainer.style.gap = '8px';
  barsContainer.style.height = '150px';
  barsContainer.style.paddingTop = '20px';
  barsContainer.style.overflowX = 'auto';

  if (records.length === 0) {
    chartTag.innerText = "Tidak ada data";
    return;
  }

  chartTag.innerText = "Statistik per Jam";

  // Kelompokkan data berdasarkan Jam
  const hourCounts = {};
  for (let i = 0; i < 24; i++) hourCounts[i] = 0;

  records.forEach(record => {
    const hour = new Date(record.created_at).getHours();
    hourCounts[hour]++;
  });

  // Cari nilai maksimum untuk skala tinggi bar chart
  const maxCount = Math.max(...Object.values(hourCounts), 1);

  // Ambil batas awal dan akhir langsung dari filter jam
  const startStr = document.getElementById('startHourPicker').value;
  const endStr = document.getElementById('endHourPicker').value;
  const startHour = startStr ? parseInt(startStr.split(':')[0]) : 0;
  const endHour = endStr ? parseInt(endStr.split(':')[0]) : 23;

  for (let i = startHour; i <= endHour; i++) {
    const count = hourCounts[i] || 0;
    const heightPercent = (count / maxCount) * 100;

    barsContainer.innerHTML += `
            <div style="flex: 1; min-width: 35px; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <div style="color: #888; font-size: 10px; font-weight: bold;">${count}</div>
                <div style="width: 100%; background: #3b82f6; border-radius: 4px 4px 0 0; height: ${heightPercent}%; min-height: 4px; transition: height 0.5s;"></div>
                <div style="color: #888; font-size: 10px;">${i}:00</div>
            </div>
        `;
  }
}

// ==========================================
// 5. JALANKAN SAAT HALAMAN DIMUAT
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  fetchLiveTracker();
  setInterval(fetchLiveTracker, 5000); // Auto-refresh setiap 5 detik
});