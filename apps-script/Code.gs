/**
 * ============================================================================
 *  BACKEND UCAPAN (WISHES) — Undangan Aden & Mega (18 Okt 2026)
 *  Google Apps Script (Web App) + Google Spreadsheet
 * ============================================================================
 *
 *  PEMASANGAN (sekali saja):
 *   1. Buka Spreadsheet daftar ucapan -> menu Extensions -> Apps Script
 *   2. Hapus semua isi Code.gs, tempel isi file ini, simpan (Ctrl+S)
 *   3. Pilih fungsi `tambahKolomLink` di dropdown -> Run (izinkan akses)
 *      -> kolom "Link" otomatis dibuat di spreadsheet
 *   4. Deploy -> Manage deployments -> ikon pensil -> Version: "New version"
 *      -> Deploy. URL /exec TETAP SAMA, halaman undangan tidak perlu diubah.
 *
 *  STRUKTUR KOLOM SPREADSHEET:
 *    A: Waktu | B: Nama | C: Hadir | D: Tamu | E: Ucapan | F: Link
 *    Kolom "Link" diisi OTOMATIS dari link undangan yang dibuka tamu, mis.
 *      https://.../the.invisimple.id/m01/index.html?to=Keluarga%20Harto
 *
 *  Kolom yang sudah ada tidak diubah; kalau header belum memakai nama standar
 *  (mis. "Timestamp"/"Message"), script tetap mengenalinya lewat alias header.
 * ============================================================================
 */

var SHEET_NAME = '';      // '' = pakai sheet/tab pertama
var MAX_UCAPAN = 300;     // maksimal baris yang dikirim ke halaman undangan
var ADMIN_KEY = '';       // isi kunci rahasia untuk ikut menampilkan link via
                          // GET, contoh isi 'aden2026' lalu akses:
                          // .../exec?key=aden2026
var LINK_PANJANG = 500;   // batas panjang link yang disimpan
var SIMPAN_LABEL_HADIR = false;  // false = simpan 'present'/'notpresent'
                                 // (sama seperti data lama), true = 'Hadir'/'Tidak Hadir'

/* Urutan & padanan nama kolom. Kolom baru selalu dibuat sesuai urutan ini. */
var FIELDS = [
  { key: 'waktu',  header: 'Waktu',  alias: ['waktu', 'timestamp', 'tanggal', 'date', 'time', 'jam'] },
  { key: 'nama',   header: 'Nama',   alias: ['nama', 'name', 'nama tamu', 'pengirim'] },
  { key: 'hadir',  header: 'Hadir',  alias: ['hadir', 'kehadiran', 'konfirmasi', 'attendance', 'status'] },
  { key: 'tamu',   header: 'Tamu',   alias: ['tamu', 'jumlah tamu', 'jml tamu', 'jml. tamu', 'jumlah', 'guest', 'guests'] },
  { key: 'ucapan', header: 'Ucapan', alias: ['ucapan', 'pesan', 'message', 'wishes', 'komentar', 'ucapan & doa', 'ucapan/doa', 'doa'] },
  { key: 'link',   header: 'Link',   alias: ['link', 'link undangan', 'link tamu', 'tautan', 'url'] }
];

/* -------------------------------------------------------------------------- */
/*  Utilitas                                                                  */
/* -------------------------------------------------------------------------- */

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : null;
  return sh || ss.getSheets()[0];
}

function norm_(v) {
  return String(v == null ? '' : v).trim().toLowerCase().replace(/\s+/g, ' ');
}

function teks_(v, maks) {
  var s = String(v == null ? '' : v).trim();
  return maks ? s.slice(0, maks) : s;
}

function teksWaktu_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]' && !isNaN(v.getTime())) {
    try {
      return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    } catch (err) {
      return String(v);
    }
  }
  return String(v == null ? '' : v);
}

/** 'present' / 'Hadir' -> 'present'; 'notpresent' / 'Tidak Hadir' -> 'notpresent' */
function kodeHadir_(v) {
  var s = norm_(v);
  if (!s) return '';
  if (s === 'present' || s === 'hadir' || s === 'datang' || s === 'yes' || s === 'ya') return 'present';
  if (s === 'notpresent' || s === 'tidak hadir' || s === 'tidak' || s === 'no') return 'notpresent';
  return String(v).trim();
}

function labelHadir_(v) {
  var kode = kodeHadir_(v);
  if (kode === 'present') return 'Hadir';
  if (kode === 'notpresent') return 'Tidak Hadir';
  return kode;
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* -------------------------------------------------------------------------- */
/*  Header & kolom                                                            */
/* -------------------------------------------------------------------------- */

function barisHeader_(sh) {
  return sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), 1)).getValues()[0];
}

function cariKolom_(header, field) {
  for (var i = 0; i < header.length; i++) {
    var h = norm_(header[i]);
    if (!h) continue;
    for (var j = 0; j < field.alias.length; j++) {
      if (h === field.alias[j]) return i + 1;   // nomor kolom (1 = A)
    }
  }
  return 0;
}

/**
 * Pastikan baris 1 berisi header dan setiap field punya kolomnya.
 * Kolom "Link" dibuat otomatis di kanan data bila belum ada.
 * @return {Object} peta {waktu:n, nama:n, hadir:n, tamu:n, ucapan:n, link:n}
 */
function kolomIndex_(sh) {
  var header = barisHeader_(sh);
  var adaIsi = header.some(function (h) { return norm_(h) !== ''; });

  var kolom = {};
  FIELDS.forEach(function (f) {
    var idx = cariKolom_(header, f);
    if (idx > 0) kolom[f.key] = idx;
  });

  // Belum ada header (atau header tak dikenal sama sekali) -> tulis header standar.
  // Kalau baris 1 berisi data, sisipkan baris header agar data lama tetap utuh.
  if (!adaIsi || (Object.keys(kolom).length === 0 && sh.getLastRow() > 0)) {
    if (adaIsi && sh.getLastRow() > 0) sh.insertRowBefore(1);
    header = FIELDS.map(function (f) { return f.header; });
    sh.getRange(1, 1, 1, header.length).setValues([header]);
    sh.getRange(1, 1, 1, header.length).setFontWeight('bold');
    kolom = {};
    FIELDS.forEach(function (f, i) { kolom[f.key] = i + 1; });
  }

  // tambahkan kolom field yang belum ada (mis. "Link") di kanan data
  var adaBaru = false;
  FIELDS.forEach(function (f) {
    if (kolom[f.key]) return;
    var next = Math.max(sh.getLastColumn(), 1) + 1;
    sh.getRange(1, next).setValue(f.header).setFontWeight('bold');
    header[next - 1] = f.header;
    kolom[f.key] = next;
    adaBaru = true;
  });

  try { sh.setFrozenRows(1); } catch (err) {}
  if (adaBaru) SpreadsheetApp.flush();
  return kolom;
}

/* -------------------------------------------------------------------------- */
/*  Tulis & baca data                                                         */
/* -------------------------------------------------------------------------- */

/** Simpan satu baris ucapan; link diambil dari link undangan yang dibuka tamu. */
function tulisBaris_(sh, d) {
  var kolom = kolomIndex_(sh);
  var lebar = Math.max(sh.getLastColumn(), 1);
  var baris = [];
  for (var i = 0; i < lebar; i++) baris.push('');

  if (kolom.waktu)  baris[kolom.waktu - 1]  = new Date();
  if (kolom.nama)   baris[kolom.nama - 1]   = d.nama;
  if (kolom.hadir)  baris[kolom.hadir - 1]  = d.hadir;
  if (kolom.tamu)   baris[kolom.tamu - 1]   = d.tamu;
  if (kolom.ucapan) baris[kolom.ucapan - 1] = d.ucapan;
  if (kolom.link)   baris[kolom.link - 1]   = d.link;

  var r = sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, baris.length).setValues([baris]);
  if (d.link && kolom.link) {
    sh.getRange(r, kolom.link).setRichTextValue(
      SpreadsheetApp.newRichTextValue().setText(d.link).setLinkUrl(d.link).build()
    );
  }
  return r;
}

/** Baris data -> objek yang dipakai halaman undangan. */
function bacaData_(sh, sertakanLink) {
  var kolom = kolomIndex_(sh);
  var terakhir = sh.getLastRow();
  if (terakhir < 2) return [];

  var lebar = Math.max(sh.getLastColumn(), 1);
  var mulai = Math.max(2, terakhir - MAX_UCAPAN + 1);
  var values = sh.getRange(mulai, 1, terakhir - mulai + 1, lebar).getValues();
  var hasil = [];

  values.forEach(function (row) {
    var sel = function (key) { return kolom[key] ? row[kolom[key] - 1] : ''; };
    var nama = teks_(sel('nama'));
    var ucapan = teks_(sel('ucapan'));
    if (!nama && !ucapan) return;                 // baris kosong dilewati
    var item = {
      waktu: teksWaktu_(sel('waktu')),
      nama: nama,
      hadir: kodeHadir_(sel('hadir')),
      tamu: teks_(sel('tamu')),
      ucapan: ucapan
    };
    if (sertakanLink) item.link = teks_(sel('link'));
    hasil.push(item);
  });
  return hasil;
}

/* -------------------------------------------------------------------------- */
/*  Endpoint Web App                                                          */
/* -------------------------------------------------------------------------- */

function doGet(e) {
  try {
    var kunci = e && e.parameter ? String(e.parameter.key || '') : '';
    var admin = !!ADMIN_KEY && kunci === ADMIN_KEY;   // admin boleh lihat link
    return json_(bacaData_(sheet_(), admin));
  } catch (err) {
    return json_([]);
  }
}

function doPost(e) {
  try {
    var d = body_(e);
    var nama = teks_(d.nama, 80);
    var ucapan = teks_(d.ucapan, 1000);
    if (nama.length < 2 || !ucapan) {
      return json_({ ok: false, error: 'nama/ucapan kosong' });
    }
    tulisBaris_(sheet_(), {
      nama: nama,
      hadir: SIMPAN_LABEL_HADIR ? labelHadir_(d.hadir) : kodeHadir_(d.hadir),
      tamu: teks_(d.tamu, 20),
      ucapan: ucapan,
      link: teks_(d.link, LINK_PANJANG)   // otomatis dari link yang dibuka tamu
    });
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/** Body JSON (text/plain) atau form-urlencoded. */
function body_(e) {
  var d = {};
  if (e && e.postData && e.postData.contents) {
    try { d = JSON.parse(e.postData.contents) || {}; } catch (err) { d = {}; }
  }
  var p = (e && e.parameter) || {};
  Object.keys(p).forEach(function (k) {
    if (!(k in d)) d[k] = p[k];
  });
  return d;
}

/* -------------------------------------------------------------------------- */
/*  Fungsi bantu (dijalankan manual dari editor)                              */
/* -------------------------------------------------------------------------- */

/** Jalankan sekali: membuat kolom "Link" di spreadsheet bila belum ada. */
function tambahKolomLink() {
  var sh = sheet_();
  var kolom = kolomIndex_(sh);
  var pesan = FIELDS.map(function (f) {
    return f.header + ' = kolom ' + (kolom[f.key] || '-');
  }).join('\n');
  try {
    SpreadsheetApp.getUi().alert('Kolom siap dipakai:\n\n' + pesan);
  } catch (err) {
    Logger.log(pesan);
  }
  return kolom;
}

/** Cek cepat isi sheet + link (lihat View > Logs / Executions). */
function cekData() {
  Logger.log(JSON.stringify(bacaData_(sheet_(), true), null, 2));
}

