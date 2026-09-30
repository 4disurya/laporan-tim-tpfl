/**
 * Laporan Tim TPFL - Backend System
 * Backend untuk Single Page Application (SPA) Laporan Tim TPFL
 * Menjalankan fungsi via google.script.run dan menyimpan data ke Spreadsheet & Drive.
 */

const APP_PROPERTIES = PropertiesService.getScriptProperties();
const DATABASE_ID = '1GfQmwCpNdaWpRcCO6fDl-byoErJbktgqUY62lJSIGSY';
const FOLDER_NAME = 'laporan-tim-tpfl-uploads';
const TIMEZONE = 'Asia/Makassar';

const SHEETS = {
  users: 'Users',
  apel: 'Apel_Pagi',
  kegiatan: 'Laporan_Kegiatan',
  sholat: 'Laporan_Sholat',
  lembur: 'Lembur',
  info: 'Info_Penting'
};

/**
 * -------------------------------------------------------------
 * SERVING & INIT
 * -------------------------------------------------------------
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Laporan Tim TPFL')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 1. Setup (Run this from Editor once to Authorize and Init)
function setup() {
  getSS_(); // Initializes spreadsheet access
  getFolder_(); // Initializes drive folder
  
  const ss = getSS_();
  // Ensure all sheets are created (creates them with headers if they do not exist)
  getSheet_(SHEETS.apel, ['id', 'user_id', 'nama', 'tanggal', 'waktu', 'foto_id', 'foto_url', 'status', 'alasan_reject', 'created_at']);
  getSheet_(SHEETS.kegiatan, ['id', 'user_id', 'nama', 'tanggal', 'jam_kerja', 'uraian', 'foto_ids', 'foto_urls', 'status', 'alasan_reject', 'created_at']);
  getSheet_(SHEETS.sholat, ['id', 'user_id', 'nama', 'tanggal', 'waktu_sholat', 'tempat', 'status', 'created_at']);
  getSheet_(SHEETS.lembur, ['id', 'tanggal', 'nama', 'alasan', 'poin', 'admin_yg_input', 'created_at']);
  getSheet_(SHEETS.info, ['id', 'judul', 'penjelasan', 'created_at']);
  getSheet_(SHEETS.users, ['id', 'nama', 'email', 'password', 'role', 'created_at']);
  
  Logger.log('Setup berhasil. Akses ke Spreadsheet ID: ' + DATABASE_ID + ' berhasil.');
  Logger.log('Folder ID: ' + APP_PROPERTIES.getProperty('FOLDER_ID'));
}

function getSS_() {
  try {
    return SpreadsheetApp.openById(DATABASE_ID);
  } catch (e) {
    throw new Error('Akses ditolak ke Spreadsheet ID: ' + DATABASE_ID + '. Pastikan akun Google yang menjalankan script ini memiliki akses Editor ke Spreadsheet tersebut.');
  }
}

function getFolder_() {
  let fId = APP_PROPERTIES.getProperty('FOLDER_ID');
  if (!fId) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      fId = APP_PROPERTIES.getProperty('FOLDER_ID');
      if (!fId) {
        const folders = DriveApp.getFoldersByName(FOLDER_NAME);
        let folder;
        if (folders.hasNext()) {
          folder = folders.next();
        } else {
          folder = DriveApp.createFolder(FOLDER_NAME);
          folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        }
        fId = folder.getId();
        APP_PROPERTIES.setProperty('FOLDER_ID', fId);
      }
    } finally {
      lock.releaseLock();
    }
  }
  return DriveApp.getFolderById(fId);
}

function getSheet_(name, headers) {
  const ss = getSS_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      sheet = ss.getSheetByName(name);
      if (!sheet) {
        sheet = ss.insertSheet(name);
        if (headers) {
          sheet.appendRow(headers);
          sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        }
      }
    } finally {
      lock.releaseLock();
    }
  }
  return sheet;
}

/**
 * -------------------------------------------------------------
 * HELPERS
 * -------------------------------------------------------------
 */

function isoNow_() {
  return new Date().toISOString();
}

function formatTanggalWITA_() {
  return Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");
}

function jsonOut_(data) {
  return JSON.stringify(data);
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  const vals = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  return vals.map(v => String(v).trim());
}

function appendByHeader_(sheet, obj) {
  const headers = getHeaders_(sheet);
  const rowData = new Array(headers.length).fill('');
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && obj.hasOwnProperty(header)) {
      rowData[i] = obj[header];
    }
  }
  sheet.appendRow(rowData);
}

function setCellsByHeader_(sheet, rowNum, obj) {
  const headers = getHeaders_(sheet);
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && obj.hasOwnProperty(header)) {
      sheet.getRange(rowNum, i + 1).setValue(obj[header]);
    }
  }
}

function parseRows_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];
  
  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const rowData = data[i];
    let obj = {};
    let isEmpty = true;
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = rowData[j];
        if (String(rowData[j]).trim() !== '') isEmpty = false;
      }
    }
    // Only include rows that are not entirely empty and have an id
    if (!isEmpty && obj.id) {
      obj._rowNumber = i + 1; // private property utk edit/delete
      rows.push(obj);
    }
  }
  return rows;
}

function normalizeWaktu_(w) {
  w = String(w || '').trim().toUpperCase();
  let m = w.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!m) return '00:00';
  let h = parseInt(m[1], 10);
  const mm = m[2];
  const ap = m[3];
  if (ap === 'PM' && h < 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + mm;
}

function parseDateSafe_(v) {
  if (v instanceof Date) return v.getTime();
  let s = String(v || '').trim();
  if (!s) return 0;
  let d = new Date(s);
  if (!isNaN(d)) return d.getTime();
  d = new Date(s.replace(' ', 'T'));
  return isNaN(d) ? 0 : d.getTime();
}

/**
 * -------------------------------------------------------------
 * 17 GOOGLE SCRIPT RUN FUNCTIONS
 * -------------------------------------------------------------
 */

// 1. handleAuth
function handleAuth(action, payload) {
  try {
    const sheet = getSheet_(SHEETS.users, ['id', 'nama', 'email', 'password', 'role', 'created_at']);
    const rows = parseRows_(sheet);
    
    if (action === 'register') {
      const lock = LockService.getScriptLock();
      lock.waitLock(10000);
      try {
        const checkRows = parseRows_(sheet);
        const reqEmail = String(payload.email).trim().toLowerCase();
        const reqNama = String(payload.nama).trim().toLowerCase();
        
        for (let u of checkRows) {
          if (String(u.email).trim().toLowerCase() === reqEmail) return jsonOut_({error: 'Email sudah terdaftar!'});
          if (String(u.nama).trim().toLowerCase() === reqNama) return jsonOut_({error: 'nama sudah ada'});
        }
        
        const obj = {
          id: 'USR_' + Date.now(),
          nama: payload.nama,
          email: payload.email,
          password: String(payload.password).trim(),
          role: 'User',
          created_at: isoNow_()
        };
        appendByHeader_(sheet, obj);
        return jsonOut_({success: true});
      } finally {
        lock.releaseLock();
      }
    } else if (action === 'login') {
      const reqEmail = String(payload.email).trim().toLowerCase();
      const reqPw = String(payload.password).trim();
      
      for (let u of rows) {
        if (String(u.email).trim().toLowerCase() === reqEmail) {
          const storedPw = String(u.password).trim();
          if (storedPw === reqPw) {
            return jsonOut_({
              id: u.id,
              nama: u.nama,
              email: u.email,
              role: u.role
            });
          }
        }
      }
      return jsonOut_({error: 'Email atau password salah!'});
    }
  } catch (e) {
    return jsonOut_({error: e.toString()});
  }
}

// 2. uploadSingleImage
function uploadSingleImage(base64, fileName, mimeType) {
  try {
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const folder = getFolder_();
      const blob = Utilities.newBlob(Utilities.base64Decode(base64), mimeType, fileName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return jsonOut_({
        data: {
          id: file.getId(),
          url: 'https://drive.google.com/file/d/' + file.getId() + '/view'
        }
      });
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    return jsonOut_({error: e.toString()});
  }
}

// 3. submitApelData
function submitApelData(payload) {
  try {
    const sheet = getSheet_(SHEETS.apel, ['id', 'user_id', 'nama', 'tanggal', 'waktu', 'foto_id', 'foto_url', 'status', 'alasan_reject', 'created_at']);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    
    try {
      const waktuLapor = payload.waktu || '00:00';
      if (waktuLapor < '06:00' || waktuLapor > '08:30') {
        return jsonOut_({error: 'Laporan Apel hanya dapat dikirim jam 06:00 - 08:30 WITA.'});
      }
      if (!payload.base64 && !payload.id) {
        return jsonOut_({error: 'Foto selfie tidak boleh kosong.'});
      }

      let fotoId = '';
      let fotoUrl = '';
      if (payload.base64) {
        const uploadRes = JSON.parse(uploadSingleImage(payload.base64, payload.fileName, payload.mimeType));
        if (uploadRes.error) return jsonOut_({error: uploadRes.error});
        fotoId = uploadRes.data.id;
        fotoUrl = uploadRes.data.url;
      }

      if (payload.id) {
        // Mode edit
        const rows = parseRows_(sheet);
        const row = rows.find(r => r.id === payload.id);
        if (row) {
          if (payload.base64 && row.foto_id) {
            try { DriveApp.getFileById(row.foto_id).setTrashed(true); } catch(e){}
          }
          const finalId = payload.base64 ? fotoId : row.foto_id;
          const finalUrl = payload.base64 ? fotoUrl : row.foto_url;
          
          setCellsByHeader_(sheet, row._rowNumber, {
            foto_id: finalId,
            foto_url: finalUrl,
            status: 'Pending',
            alasan_reject: '',
            created_at: isoNow_()
          });
          return jsonOut_({success: true});
        }
      }
      
      // Mode baru
      const obj = {
        id: 'APL_' + Date.now(),
        user_id: payload.user_id,
        nama: payload.nama,
        tanggal: formatTanggalWITA_(),
        waktu: payload.waktu,
        foto_id: fotoId,
        foto_url: fotoUrl,
        status: 'Pending',
        alasan_reject: '',
        created_at: isoNow_()
      };
      appendByHeader_(sheet, obj);
      return jsonOut_({success: true});
      
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    return jsonOut_({error: e.toString()});
  }
}

// 4. submitKegiatanData
function submitKegiatanData(payload) {
  try {
    const sheet = getSheet_(SHEETS.kegiatan, ['id', 'user_id', 'nama', 'tanggal', 'jam_kerja', 'uraian', 'foto_ids', 'foto_urls', 'status', 'alasan_reject', 'created_at']);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    
    try {
      if (payload.id) {
        // Mode Edit
        const rows = parseRows_(sheet);
        const row = rows.find(r => r.id === payload.id);
        if (row) {
          if (row.foto_ids) {
            const oldIds = String(row.foto_ids).split(',');
            oldIds.forEach(fid => {
              const tid = fid.trim();
              if (tid) { try { DriveApp.getFileById(tid).setTrashed(true); } catch(e){} }
            });
          }
          setCellsByHeader_(sheet, row._rowNumber, {
            jam_kerja: payload.jam_kerja,
            uraian: payload.uraian,
            foto_ids: payload.fotoIds,
            foto_urls: payload.fotoUrls,
            status: 'Pending',
            alasan_reject: '',
            created_at: isoNow_()
          });
          return jsonOut_({success: true});
        }
      }
      
      const obj = {
        id: 'KEG_' + Date.now(),
        user_id: payload.user_id,
        nama: payload.nama,
        tanggal: formatTanggalWITA_(),
        jam_kerja: payload.jam_kerja,
        uraian: payload.uraian,
        foto_ids: payload.fotoIds,
        foto_urls: payload.fotoUrls,
        status: 'Pending',
        alasan_reject: '',
        created_at: isoNow_()
      };
      appendByHeader_(sheet, obj);
      return jsonOut_({success: true});
    } finally {
      lock.releaseLock();
    }
  } catch (e) {
    return jsonOut_({error: e.toString()});
  }
}

// 5. getLaporanApel
function getLaporanApel() {
  try {
    const sheet = getSheet_(SHEETS.apel, []);
    const rows = parseRows_(sheet);
    const pending = rows.filter(r => r.status === 'Pending');
    return jsonOut_(pending);
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 6. getLaporanKegiatan
function getLaporanKegiatan() {
  try {
    const sheet = getSheet_(SHEETS.kegiatan, []);
    const rows = parseRows_(sheet);
    const pending = rows.filter(r => r.status === 'Pending');
    return jsonOut_(pending);
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 7. getUserHistory
function getUserHistory(userId) {
  try {
    let apel = parseRows_(getSheet_(SHEETS.apel, [])).filter(r => r.user_id === userId);
    let kegiatan = parseRows_(getSheet_(SHEETS.kegiatan, [])).filter(r => r.user_id === userId);
    let sholat = parseRows_(getSheet_(SHEETS.sholat, [])).filter(r => r.user_id === userId);
    
    const desc = (a, b) => parseDateSafe_(b.created_at) - parseDateSafe_(a.created_at);
    return jsonOut_({
      apel: apel.sort(desc),
      kegiatan: kegiatan.sort(desc),
      sholat: sholat.sort(desc)
    });
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 8. getAllHistory
function getAllHistory() {
  try {
    const apel = parseRows_(getSheet_(SHEETS.apel, []));
    const kegiatan = parseRows_(getSheet_(SHEETS.kegiatan, []));
    const sholat = parseRows_(getSheet_(SHEETS.sholat, []));
    const lembur = parseRows_(getSheet_(SHEETS.lembur, []));
    
    const desc = (a, b) => parseDateSafe_(b.created_at) - parseDateSafe_(a.created_at);
    return jsonOut_({
      apel: apel.sort(desc),
      kegiatan: kegiatan.sort(desc),
      sholat: sholat.sort(desc),
      lembur: lembur.sort(desc)
    });
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 9. submitSholatData
function submitSholatData(payload) {
  try {
    const sheet = getSheet_(SHEETS.sholat, ['id', 'user_id', 'nama', 'tanggal', 'waktu_sholat', 'tempat', 'status', 'created_at']);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const obj = {
        id: 'SHL_' + Date.now(),
        user_id: payload.user_id,
        nama: payload.nama,
        tanggal: formatTanggalWITA_(),
        waktu_sholat: payload.waktu_sholat,
        tempat: payload.tempat,
        status: 'Tercatat',
        created_at: isoNow_()
      };
      appendByHeader_(sheet, obj);
      return jsonOut_({success: true});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 10. hapusFotoKegiatan
function hapusFotoKegiatan(id, fotoId) {
  try {
    const sheet = getSheet_(SHEETS.kegiatan, []);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const rows = parseRows_(sheet);
      const row = rows.find(r => r.id === id);
      if (row) {
        let fIds = String(row.foto_ids).split(',').map(s => s.trim());
        let fUrls = String(row.foto_urls).split(',').map(s => s.trim());
        const idx = fIds.indexOf(fotoId);
        if (idx !== -1) {
          fIds.splice(idx, 1);
          fUrls.splice(idx, 1);
          setCellsByHeader_(sheet, row._rowNumber, {
            foto_ids: fIds.join(', '),
            foto_urls: fUrls.join(', ')
          });
          try { DriveApp.getFileById(fotoId).setTrashed(true); } catch(e){}
        }
        return jsonOut_({success: true});
      }
      return jsonOut_({error: 'Data tidak ditemukan.'});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 11. autoApproveApelPagi
function autoApproveApelPagi() {
  try {
    const sheet = getSheet_(SHEETS.apel, []);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const rows = parseRows_(sheet);
      let approved = 0;
      let rejected = 0;
      const updates = [];
      
      for (let r of rows) {
        if (r.status === 'Pending') {
          let waktu = normalizeWaktu_(r.waktu);
          let newStatus = 'Rejected';
          let alasan = '';
          
          if (waktu >= '06:00' && waktu <= '08:30') {
            if (r.foto_id && String(r.foto_id).trim() !== '') {
              newStatus = 'Approved';
            } else {
              alasan = 'Foto selfie tidak ditemukan / gagal diunggah.';
            }
          } else {
            alasan = 'Di luar jendela waktu Apel (06.00-08.30).';
          }
          
          if (newStatus === 'Approved') approved++;
          else rejected++;
          
          updates.push({rowNum: r._rowNumber, status: newStatus, alasan: alasan});
        }
      }
      
      updates.forEach(u => {
        setCellsByHeader_(sheet, u.rowNum, {
          status: u.status,
          alasan_reject: u.alasan
        });
      });
      return jsonOut_({approved: approved, rejected: rejected});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 12. autoApproveLaporanKegiatan
function autoApproveLaporanKegiatan(searchName) {
  try {
    const sheet = getSheet_(SHEETS.kegiatan, []);
    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const rows = parseRows_(sheet);
      let approved = 0;
      let rejected = 0;
      const updates = [];
      const sName = String(searchName || '').trim().toLowerCase();
      
      for (let r of rows) {
        if (r.status === 'Pending') {
          if (sName && !String(r.nama).toLowerCase().includes(sName)) {
            continue;
          }
          
          let newStatus = 'Rejected';
          let alasan = '';
          
          const ur = String(r.uraian || '').trim();
          const fIds = String(r.foto_ids || '').trim();
          
          if (ur.length > 0 && fIds.length > 0) {
            newStatus = 'Approved';
          } else {
            if (ur.length === 0) alasan += 'Uraian kegiatan kosong. ';
            if (fIds.length === 0) alasan += 'Tidak ada foto dilampirkan.';
          }
          
          if (newStatus === 'Approved') approved++;
          else rejected++;
          
          updates.push({rowNum: r._rowNumber, status: newStatus, alasan: alasan.trim()});
        }
      }
      
      updates.forEach(u => {
        setCellsByHeader_(sheet, u.rowNum, {
          status: u.status,
          alasan_reject: u.alasan
        });
      });
      return jsonOut_({approved: approved, rejected: rejected});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 13. updateReportStatus
function updateReportStatus(tabel, id, statusBaru, alasan) {
  try {
    const sheetName = tabel === 'Apel_Pagi' ? SHEETS.apel : SHEETS.kegiatan;
    const sheet = getSheet_(sheetName, []);
    const lock = LockService.getScriptLock();
    lock.waitLock(15000);
    try {
      const rows = parseRows_(sheet);
      const row = rows.find(r => r.id === id);
      if (row) {
        const msg = statusBaru === 'Approved' ? '' : (alasan || '');
        setCellsByHeader_(sheet, row._rowNumber, {
          status: statusBaru,
          alasan_reject: msg
        });
        return jsonOut_({success: true});
      }
      return jsonOut_({error: 'Data tidak ditemukan.'});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 14. getInfoPenting
function getInfoPenting() {
  try {
    const sheet = getSheet_(SHEETS.info, ['id', 'judul', 'penjelasan', 'created_at']);
    const rows = parseRows_(sheet);
    rows.reverse();
    return jsonOut_(rows);
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 15. saveInfoPenting
function saveInfoPenting(payload) {
  try {
    const sheet = getSheet_(SHEETS.info, ['id', 'judul', 'penjelasan', 'created_at']);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      if (payload.id) {
        const rows = parseRows_(sheet);
        const row = rows.find(r => r.id === payload.id);
        if (row) {
          setCellsByHeader_(sheet, row._rowNumber, {
            judul: payload.judul,
            penjelasan: payload.penjelasan
          });
          return jsonOut_({success: true});
        }
      }
      const obj = {
        id: 'INFO_' + Date.now(),
        judul: payload.judul,
        penjelasan: payload.penjelasan,
        created_at: Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm")
      };
      appendByHeader_(sheet, obj);
      return jsonOut_({success: true});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 16. deleteInfoPenting
function deleteInfoPenting(id) {
  try {
    const sheet = getSheet_(SHEETS.info, []);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const rows = parseRows_(sheet);
      const row = rows.find(r => r.id === id);
      if (row) {
        sheet.deleteRow(row._rowNumber);
        return jsonOut_({success: true});
      }
      return jsonOut_({error: 'Data tidak ditemukan.'});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}

// 17. submitLemburData
function submitLemburData(payload) {
  try {
    const sheet = getSheet_(SHEETS.lembur, ['id', 'tanggal', 'nama', 'alasan', 'poin', 'admin_yg_input', 'created_at']);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const obj = {
        id: 'LMBR_' + Date.now(),
        tanggal: payload.tanggal,
        nama: payload.nama,
        alasan: payload.alasan,
        poin: payload.poin,
        admin_yg_input: payload.admin,
        created_at: isoNow_()
      };
      appendByHeader_(sheet, obj);
      return jsonOut_({success: true});
    } finally {
      lock.releaseLock();
    }
  } catch (e) { return jsonOut_({error: e.toString()}); }
}


/**
 * -------------------------------------------------------------
 * API ROUTER UNTUK FETCH (NON-GAS)
 * -------------------------------------------------------------
 */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const fn = body.fn;
    const args = body.args || [];
    
    // Whitelist fungsi yang bisa dipanggil via API
    const allowedFns = [
      'handleAuth', 'uploadSingleImage', 'submitApelData', 'submitKegiatanData',
      'getLaporanApel', 'getLaporanKegiatan', 'getUserHistory', 'getAllHistory',
      'submitSholatData', 'hapusFotoKegiatan', 'autoApproveApelPagi', 
      'autoApproveLaporanKegiatan', 'updateReportStatus', 'getInfoPenting',
      'saveInfoPenting', 'deleteInfoPenting', 'submitLemburData'
    ];
    
    if (allowedFns.includes(fn) && typeof this[fn] === 'function') {
      const result = this[fn].apply(this, args);
      // Result dari ke-17 fungsi sudah berupa string JSON (karena jsonOut_)
      return ContentService.createTextOutput(String(result))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
      return ContentService.createTextOutput(JSON.stringify({error: 'Fungsi tidak diizinkan atau tidak ditemukan'}))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Fungsi opsional untuk me-rename folder Drive lama (Jalankan 1x secara manual di Editor)
function renameUploadFolder() {
  const fId = APP_PROPERTIES.getProperty('FOLDER_ID');
  if (fId) {
    try {
      const folder = DriveApp.getFolderById(fId);
      folder.setName('laporan-tim-tpfl-uploads');
      Logger.log('Folder berhasil di-rename menjadi laporan-tim-tpfl-uploads');
    } catch (e) {
      Logger.log('Gagal me-rename folder: ' + e.toString());
    }
  } else {
    Logger.log('FOLDER_ID belum tersimpan di script properties.');
  }
}
