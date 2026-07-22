# Jetour · Live Player Console

Website statistik "berapa pemain aktif hari ini" untuk brand Jetour. Full JS —
tanpa framework, tanpa build step, tinggal buka di browser atau host di mana saja.

## Struktur

```
jetour-website/
├─ index.html      → markup halaman
├─ css/style.css   → semua styling & tema warna
├─ js/app.js       → logic filter, dial jam, live counter, feed
└─ README.md
```

## Cara jalanin

**Paling gampang:** klik dua kali `index.html`, langsung kebuka di browser.

**Kalau mau jalan via local server** (disarankan supaya font & path lebih stabil):

```bash
cd jetour-website
npx serve .
# atau
python3 -m http.server 8080
```

lalu buka `http://localhost:8080`.

## Deploy

File ini static, jadi bisa langsung di-drag & drop ke:
- Netlify / Vercel (drag folder ke dashboard mereka)
- GitHub Pages (push folder ini ke repo, aktifkan Pages)
- Server sendiri (nginx/apache, tinggal copy foldernya)

## Nyambungin ke API pemain asli

Semua angka saat ini disimulasikan di browser (biar bisa langsung dicoba tanpa
backend). Untuk data beneran, edit `js/app.js`:

- `computeBaseCount(key, start, end)` → ganti jadi `fetch()` ke endpoint API
  kamu yang mengembalikan jumlah pemain untuk rentang hari + jam tertentu.
- `pushFeedEvent()` → ganti sumbernya dari polling/websocket API per-pemain,
  bukan `randomId()`. ID yang ditampilkan sebaiknya tetap versi anonim/hash
  dari API, bukan data pribadi mentah.
- `setupLiveTicking()` → ganti interval polling ke frekuensi sesuai rate
  limit API kamu (misalnya tiap 5–10 detik, bukan tiap 2.6 detik).

## Tambah brand lain

Buka `js/app.js`, cari objek `BRANDS` di paling atas. Tambah entri baru
(nama, tagline, font) — logo di `index.html` juga bisa diganti per brand
dengan mengubah SVG di bagian `.brand-mark`. Warna tema (teal/gold/ink)
saat ini otomatis mengikuti waktu (persona pagi/sore/malam); kalau brand
baru mau palet sendiri, tambahkan set `theme-*` baru di `css/style.css`.
