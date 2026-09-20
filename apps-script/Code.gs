/**
 * ============================================================================
 *  BACKEND UCAPAN (WISHES) — Undangan Aden & Mega (18 Okt 2026)
 *  Google Apps Script + Google Spreadsheet (sheet: "Ucapan")
 * ----------------------------------------------------------------------------
 *  Kolom: A Waktu | B Nama | C Kehadiran | D Tamu | E Ucapan | F Link
 *  Kolom "Link" diisi OTOMATIS dari link undangan yang dibuka tamu, mis.
 *    https://.../the.invisimple.id/m01/index.html?to=Keluarga%20Harto
 * ----------------------------------------------------------------------------
 *  PEMASANGAN:
 *   1. Extensions > Apps Script > hapus isi Code.gs > tempel file ini > simpan
 *   2. Deploy > Manage deployments > ikon pensil > Version: "New version"
 *      > Deploy  (URL /exec tetap sama, halaman undangan tidak perlu diubah)
 *  Kolom "Link" dibuat otomatis saat script pertama kali dijalankan. Kalau mau
 *  memastikan lebih dulu: pilih fungsi `tambahKolomLink` > Run (lihat Logs).
 * ============================================================================
 */

const SHEET_NAME = 'Ucapan';
const COLS = ['Waktu', 'Nama', 'Kehadiran', 'Tamu', 'Ucapan', 'Link'];
const MAX_UCAPAN = 300;   // jumlah ucapan terakhir yang dikirim ke undangan

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(COLS);                 // sheet baru: langsung 6 kolom + Link
    sh.setFrozenRows(1);
    return sh;
  }
  const header = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1))
    .getValues()[0].map(v => String(v).trim());

  if (header.every(h => h === '')) {     // sheet ada tapi belum punya header
    sh.appendRow(COLS);
    sh.setFrozenRows(1);
  } else if (header.indexOf('Link') === -1) {   // sheet lama (5 kolom) -> tambah kolom Link
    const next = Math.max(sh.getLastColumn(), 1) + 1;
    sh.getRange(1, next).setValue('Link').setFontWeight('bold');
  }
  return sh;
}

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    // urutan harus sama dengan COLS; d.link = link undangan yang dibuka tamu
    sheet_().appendRow([
      new Date(), d.nama || '', d.hadir || '', d.tamu || '', d.ucapan || '', d.link || ''
    ]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doGet() {
  const rows = sheet_().getDataRange().getValues();
  rows.shift();                                    // buang baris header
  const data = rows
    .filter(r => String(r[1] || '') !== '' || String(r[4] || '') !== '')
    .slice(-MAX_UCAPAN)
    .map(r => ({
      waktu: String(r[0]),
      nama: String(r[1]),
      hadir: String(r[2]),
      tamu: String(r[3]),
      ucapan: String(r[4]),
      link: String(r[5] || '')   // hapus baris ini bila link tak ingin tampil di JSON publik
    }))
    .reverse();                                    // terbaru di atas
  return json_(data);
}

function json_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Jalankan manual (opsional): memastikan kolom "Link" sudah dibuat. */
function tambahKolomLink() {
  const sh = sheet_();
  Logger.log('Sheet "' + sh.getName() + '" siap. Kolom terakhir: ' + sh.getLastColumn() +
    ' (' + sh.getRange(1, sh.getLastColumn()).getValue() + ')');
}

