# Kolom **Link** di Spreadsheet Ucapan

Spreadsheet Anda belum punya kolom `Link` karena kode Apps Script yang terpasang hanya
menulis **5 kolom** (`Waktu, Nama, Kehadiran, Tamu, Ucapan`). Halaman undangan **sudah**
mengirim field `link`, jadi yang perlu diubah hanya kode Apps Script-nya.

---

## A. Perubahan minimal pada kode Anda (3 baris)

| # | Cari | Ganti jadi |
|---|---|---|
| 1 | `const COLS = ['Waktu','Nama','Kehadiran','Tamu','Ucapan'];` | `const COLS = ['Waktu','Nama','Kehadiran','Tamu','Ucapan','Link'];` |
| 2 | `sheet_().appendRow([new Date(), d.nama\|\|'', d.hadir\|\|'', d.tamu\|\|'', d.ucapan\|\|'']);` | `sheet_().appendRow([new Date(), d.nama\|\|'', d.hadir\|\|'', d.tamu\|\|'', d.ucapan\|\|'', d.link\|\|'']);` |
| 3 | (opsional) di `doGet` | tambahkan `link: String(r[5]\|\|'')` pada objek hasil `map` |

Karena sheet `Ucapan` **sudah ada**, baris `if (!sh) { … appendRow(COLS) }` tidak pernah
jalan lagi — jadi header `Link` perlu ditambahkan lewat salah satu cara berikut:

**Cara 1 – sisipkan otomatis di `sheet_()`** (tambahkan setelah `const header = …`),
seperti pada file `apps-script/Code.gs` di repo ini:

```javascript
  } else if (header.indexOf('Link') === -1) {   // sheet lama (5 kolom) -> tambah kolom Link
    const next = Math.max(sh.getLastColumn(), 1) + 1;
    sh.getRange(1, next).setValue('Link').setFontWeight('bold');
  }
```

**Cara 2 – jalankan sekali fungsi ini dari editor Apps Script:**

```javascript
function tambahKolomLink() {
  const sh = sheet_();
  const next = Math.max(sh.getLastColumn(), 1) + 1;
  sh.getRange(1, next).setValue('Link').setFontWeight('bold');
}
```

**Cara 3 – manual:** ketik `Link` di sel **F1** spreadsheet.

Setelah itu: **Deploy → Manage deployments → ikon pensil → Version: `New version` → Deploy**
(URL `/exec` tetap sama, halaman undangan tidak perlu diubah).

## B. Atau langsung tempel file lengkap

Isi `apps-script/Code.gs` di repo ini adalah versi kode Anda + kolom Link:

| Baris | Isi |
|---|---|
| `COLS` | `['Waktu','Nama','Kehadiran','Tamu','Ucapan','Link']` |
| `sheet_()` | membuat sheet `Ucapan` + header bila belum ada; **menambah kolom `Link` otomatis** bila sheet lama hanya 5 kolom |
| `doPost` | `appendRow([new Date(), nama, hadir, tamu, ucapan, link])` |
| `doGet` | terbaru di atas, menyertakan `link` dari `r[5]` |

Salin seluruh isi file itu ke `Code.gs` di editor Apps Script → simpan → deploy `New version`.

---

## Hasilnya

| Waktu | Nama | Kehadiran | Tamu | Ucapan | Link |
|---|---|---|---|---|---|
| 18/10/2026 09:12 | Budi | present | 2 | Selamat ya! | https://…/the.invisimple.id/m01/index.html?to=Keluarga%20Harto |

- Kolom `Link` berisi link undangan yang **dibuka tamu** (termasuk `?to=Nama Tamu`), diisi
  otomatis oleh halaman undangan — tidak perlu diisi manual.
- Ucapan lama tetap aman: kolom baru ditambahkan di kanan, baris lama tidak diubah.
- Kalau kolom `Link` ingin diisi manual: ketik `Link` di F1, lalu semua ucapan baru otomatis
  masuk ke kolom F.

## Konfigurasi di atas `Code.gs`

| Variabel | Default | Fungsi |
|---|---|---|
| `SHEET_NAME` | `'Ucapan'` | nama tab spreadsheet yang dipakai |
| `MAX_UCAPAN` | `300` | jumlah ucapan terakhir yang dikirim ke halaman undangan |

## Catatan

- `link` ikut tampil di JSON `doGet` (kolom `r[5]`). Kalau tidak ingin link terlihat
  publik, hapus baris `link: String(r[5] || '')` — kolom di spreadsheet tetap terisi.
- Tombol **`tambahKolomLink`** bisa di-`Run` kapan saja untuk memastikan kolom `Link` ada;
  hasilnya muncul di **View → Logs**.
- Kalau ucapan tidak masuk sama sekali: cek **Executions** di Apps Script untuk melihat
  error dan pastikan akses Web App = *Anyone* (Deploy → Manage deployments → Who has access).
