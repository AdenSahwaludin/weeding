# Kolom **Link** di Spreadsheet Ucapan

Mulai sekarang setiap ucapan yang dikirim tamu otomatis menyimpan **link undangan yang
dibuka** (termasuk `?to=Nama Tamu`) di kolom baru bernama **Link** pada spreadsheet.

Contoh isi kolom:

| Waktu | Nama | Hadir | Tamu | Ucapan | Link |
|---|---|---|---|---|---|
| 2026-10-18 09:12:30 | Budi | present | 2 | Selamat ya! | https://…/the.invisimple.id/m01/index.html?to=Keluarga%20Harto |

Sisi undangan (`the.invisimple.id/m01/index.html`) **sudah** dikirim dengan field `link`,
jadi yang perlu dilakukan hanya memasang backend-nya satu kali.

---

## 1. Pasang backend (sekali saja)

1. Buka **Spreadsheet daftar ucapan** → menu **Extensions → Apps Script**.
2. Hapus seluruh isi `Code.gs`, lalu **tempel seluruh isi** file `apps-script/Code.gs`
   yang ada di repo ini. Simpan (`Ctrl+S`).
3. Pada dropdown fungsi, pilih **`tambahKolomLink`** → **Run** → izinkan akses
   (Authorize). Fungsi ini menambahkan header **Link** di spreadsheet dan menampilkan
   peta kolomnya, mis.:

   ```
   Waktu = kolom 1
   Nama = kolom 2
   Hadir = kolom 3
   Tamu = kolom 4
   Ucapan = kolom 5
   Link = kolom 6
   ```
4. **Deploy → Manage deployments → ikon pensil → Version: `New version` → Deploy.**
   URL `/exec` **tetap sama**, jadi halaman undangan tidak perlu diubah lagi.

> Kalau langkah 3 dilewat pun tidak masalah: kolom `Link` juga dibuat otomatis saat
> ucapan pertama masuk (kolom baru selalu ditambahkan di kanan data lama).

## 2. Cek hasilnya

- Kirim satu ucapan dari undangan (isi nama + ucapan), lalu lihat spreadsheet:
  baris baru harus punya isi di kolom **Link**.
- Di Apps Script: pilih fungsi **`cekData`** → **Run** → lihat **View → Logs**
  untuk melihat data + link yang tersimpan.

---

## Catatan penting

- **Data lama tidak diubah.** Kolom baru ditambahkan di sebelah kanan, baris lama dibiarkan apa adanya.
- **Kalau spreadsheet belum punya baris header sama sekali**, script menyisipkan baris
  header standar di atas data lama (data lama tetap utuh, hanya bergeser ke bawah).
- **Nama header boleh berbeda.** Script mengenali padanan seperti
  `Timestamp/Name/Attendance/Guests/Message`, sehingga tidak masalah kalau header
  spreadsheet memakai istilah lain.
- **Link tidak ikut di JSON publik.** `doGet` (yang dipakai daftar ucapan di halaman
  undangan) tidak menyertakan `link`. Kalau perlu melihatnya via URL, isi dulu
  `ADMIN_KEY` di `Code.gs`, lalu akses `…/exec?key=KUNCI_RAHASIA`.
- **Isi kolom Hadir** mengikuti data lama (`present` / `notpresent`). Kalau ingin
  yang lebih enak dibaca (`Hadir` / `Tidak Hadir`), ubah
  `SIMPAN_LABEL_HADIR = true;` di bagian atas `Code.gs` (halaman undangan tetap
  menampilkan label yang benar).
- Panjang link dibatasi `LINK_PANJANG` (default 500 karakter) supaya sel tetap rapi.
- Sel link otomatis dibuat **klikabel** (rich text hyperlink) di spreadsheet.

## Opsi di bagian atas `Code.gs`

| Variabel | Default | Fungsi |
|---|---|---|
| `SHEET_NAME` | `''` | `''` = pakai tab/sheet pertama, atau isi nama tab tertentu |
| `MAX_UCAPAN` | `300` | jumlah ucapan terakhir yang dikirim ke halaman undangan |
| `ADMIN_KEY` | `''` | kunci rahasia agar `?key=…` pada URL `exec` ikut menampilkan link |
| `LINK_PANJANG` | `500` | batas panjang link yang disimpan |
| `SIMPAN_LABEL_HADIR` | `false` | `true` = simpan `Hadir`/`Tidak Hadir` di spreadsheet |

## Troubleshooting

- **Kolom Link kosong padahal ucapan masuk** → backend belum diganti. Ulangi langkah 1
  lalu pastikan deployment memakai **New version** (bukan versi lama).
- **Ucapan tidak bertambah sama sekali** → cek **Executions** di Apps Script untuk
  melihat error, lalu pastikan akses Web App = *Anyone* (Deploy → Manage deployments →
  Who has access).
- **Tamu mengisi nama berbeda dari link** → kolom `Nama` = nama yang diketik tamu,
  kolom `Link` tetap menunjukkan link yang ia buka (berisi nama tamu undangan).
