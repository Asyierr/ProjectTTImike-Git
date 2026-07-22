const BASE_URL = 'https://activity-tracker.abracodebra.com/api';

// ── ALL RECORDS (unfiltered, from API) ──
let allRecords = [];

// ── SORTING STATE ──
let sortColumn = 'created_at'; // default sort
let sortDirection = 'desc';    // 'asc' or 'desc'
let searchQuery = '';

// Fungsi utama buat narik data dari API
async function fetchLiveTracker() {
    try {
        const response = await fetch(`${BASE_URL}/activity-records`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.data && result.data.records) {
            const parsed = [];
            const activities = Object.keys(result.data.records);

            activities.forEach(activityName => {
                const records = result.data.records[activityName];

                records.forEach(record => {
                    const createdAt = new Date(record.created_at);
                    const dk = dateKey(createdAt); // dateKey from polytron-stats.js
                    const hour = createdAt.getHours();

                    // Determine "live" status: record < 10 seconds ago
                    const isNew = (Date.now() - createdAt.getTime()) < 10000;

                    parsed.push({
                        name: record.full_name || 'Anonim',
                        email: record.email || '-',
                        phone: record.phone_number || '-',
                        created_at: record.created_at || '-',
                        created_at_ts: createdAt.getTime(),
                        score: record.point_score != null ? parseFloat(record.point_score) : null,
                        time_score: record.time_score != null ? parseFloat(record.time_score) : null,
                        date: dk,
                        hour: hour,
                        isNew: isNew,
                        activity: activityName
                    });
                });
            });

            // Store globally and sync into ST.players for the filter system
            allRecords = parsed;
            ST.players = parsed;

            // Re-render with current filter applied
            renderFilteredData();
        }
    } catch (error) {
        console.error("Gagal narik data Live Tracker:", error);
    }
}

// ── SORTING ──
function sortData(data) {
    const sorted = [...data];

    sorted.sort((a, b) => {
        let valA, valB;

        switch (sortColumn) {
            case 'name':
                valA = (a.name || '').toLowerCase();
                valB = (b.name || '').toLowerCase();
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);

            case 'email':
                valA = (a.email || '').toLowerCase();
                valB = (b.email || '').toLowerCase();
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);

            case 'phone':
                valA = (a.phone || '').toLowerCase();
                valB = (b.phone || '').toLowerCase();
                return sortDirection === 'asc'
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);

            case 'score':
                valA = a.score ?? a.time_score ?? 0;
                valB = b.score ?? b.time_score ?? 0;
                return sortDirection === 'asc' ? valA - valB : valB - valA;

            case 'time_score':
                valA = a.time_score ?? Infinity;
                valB = b.time_score ?? Infinity;
                return sortDirection === 'asc' ? valA - valB : valB - valA;

            case 'created_at':
                valA = a.created_at_ts || 0;
                valB = b.created_at_ts || 0;
                return sortDirection === 'asc' ? valA - valB : valB - valA;

            case 'status':
                valA = a.isNew ? 1 : 0;
                valB = b.isNew ? 1 : 0;
                return sortDirection === 'asc' ? valA - valB : valB - valA;

            default:
                return 0;
        }
    });

    return sorted;
}

function toggleSort(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        // Default direction per column type
        sortDirection = (column === 'score' || column === 'time_score') ? 'desc' : 'asc';
    }
    renderFilteredData();
    updateSortIndicators();
}

function updateSortIndicators() {
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        const col = th.dataset.sort;
        const icon = th.querySelector('.sort-icon');
        if (!icon) return;

        th.classList.remove('sort-active');
        icon.classList.remove('asc', 'desc');

        if (col === sortColumn) {
            th.classList.add('sort-active');
            icon.classList.add(sortDirection);
        }
    });
}

// ── RENDER TABLE + CARDS BASED ON FILTER ──
function renderFilteredData() {
    let filtered = getFiltered(); // from polytron-stats.js — uses ST.dayRange + ST.hour
    
    if (searchQuery) {
        filtered = filtered.filter(p => {
            const name = (p.name || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            const phone = (p.phone || '').toLowerCase();
            return name.includes(searchQuery) || email.includes(searchQuery) || phone.includes(searchQuery);
        });
    }

    const sorted = sortData(filtered);

    const tbody = document.getElementById('player-tbody');
    const sumFiltered = document.getElementById('sum-filtered');
    const sumLive = document.getElementById('sum-live');
    const tblMeta = document.getElementById('tbl-meta');
    const sumFilteredMeta = document.getElementById('sum-filtered-meta');

    // ── TABLE ──
    if (tbody) {
        tbody.innerHTML = '';
        sorted.forEach(p => {
            const statusClass = p.isNew ? 'playing' : 'done';
            const statusLabel = p.isNew ? 'Sedang Main' : 'Selesai';

            // Show score: prefer point_score, fallback to time_score
            let scoreDisplay = '-';
            if (p.score != null) {
                scoreDisplay = p.score;
            } else if (p.time_score != null) {
                scoreDisplay = `${p.time_score}s`;
            }

            tbody.innerHTML += `
                <tr>
                    <td style="font-weight: 600;">${escapeHtml(p.name)}</td>
                    <td class="cell-email">${escapeHtml(p.email)}</td>
                    <td class="cell-phone">${escapeHtml(p.phone)}</td>
                    <td>${formatDateTime(p.created_at)}</td>
                    <td style="font-weight: bold;">${scoreDisplay}</td>
                    <td>
                        <span class="status ${statusClass}">${statusLabel}</span>
                    </td>
                </tr>
            `;
        });
    }

    // ── SUMMARY CARDS ──
    const liveCount = filtered.filter(p => p.isNew).length;

    if (sumFiltered) {
        sumFiltered.innerText = filtered.length;
    }
    if (sumLive) {
        sumLive.innerText = liveCount;
    }

    // ── META TEXT ──
    if (tblMeta) {
        tblMeta.textContent = `Menampilkan ${filtered.length} dari ${allRecords.length} data`;
    }
    if (sumFilteredMeta) {
        const selectedDates = getSelectedDates();
        let rangeText = '';
        if (selectedDates.length === 1) {
            rangeText = formatShort(selectedDates[0]);
        } else if (selectedDates.length > 1) {
            rangeText = `${formatShort(selectedDates[0])} — ${formatShort(selectedDates[selectedDates.length - 1])}`;
        }
        if (ST.hourRange !== null) {
            const minH = Math.min(ST.hourRange[0], ST.hourRange[1]);
            const maxH = Math.max(ST.hourRange[0], ST.hourRange[1]);
            if (minH === maxH) {
                rangeText += ` · Jam ${String(minH).padStart(2,'0')}:00`;
            } else {
                rangeText += ` · Jam ${String(minH).padStart(2,'0')}:00 - ${String(maxH).padStart(2,'0')}:59`;
            }
        }
        sumFilteredMeta.textContent = rangeText
            ? `Filter aktif: ${rangeText}`
            : 'Menampilkan total data sesuai filter';
    }

    updateSortIndicators();
}

// ── ESCAPE HTML ──
function escapeHtml(str) {
    if (!str || str === '-') return '-';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── FORMAT DATE ──
function formatDateTime(raw) {
    if (!raw || raw === '-') return '-';
    const d = new Date(raw);
    if (isNaN(d)) return raw;
    const day = String(d.getDate()).padStart(2, '0');
    const mon = MONTHS_ID[d.getMonth()].substring(0, 3);
    const year = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${mon} ${year}, ${hh}:${mm}`;
}

// Fitur Export Excel
async function downloadExportExcel() {
    try {
        const url = `${BASE_URL}/activity-records/summary/export/excel`;
        const response = await fetch(url, { method: 'GET' });

        if (!response.ok) throw new Error(`Gagal download, status: ${response.status}`);

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = downloadUrl;
        a.download = 'Polytron_Stats.xlsx';

        document.body.appendChild(a);
        a.click();

        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
        console.error("Gagal download excel:", error);
    }
}

// ── INIT & POLLING ──
fetchLiveTracker();
setInterval(fetchLiveTracker, 5000);

// ── BIND SORT HEADERS (after DOM ready) ──
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            toggleSort(th.dataset.sort);
        });
    });
    updateSortIndicators();

    // Bind search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            renderFilteredData();
        });
        
        // Shortcut Cmd+F or Ctrl+F to focus search
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }
});