/**
 * TikTok KOL Tracker — Google Sheets + Apps Script + Apify
 *
 * TikTok chặn request trực tiếp từ server Google, nên script gửi danh sách
 * link video sang Apify (actor "clockworks/tiktok-scraper"), chờ chạy xong
 * rồi ghi views / likes / comments / shares / saves về Sheet.
 *
 * API token Apify lưu trong Script Properties (menu "Nhập Apify API token"),
 * không ghi trong code.
 */

const CONFIG = {
  SHEET_MAIN: 'KOL_Tracking',
  SHEET_HISTORY: 'Lich_Su',
  HEADER_ROW: 1,
  APIFY_ACTOR: 'clockworks~tiktok-scraper',
  APIFY_BASE: 'https://api.apify.com/v2',
  BATCH_SIZE: 50,                 // số link gửi trong 1 lần chạy Apify
  POLL_WAIT_SECS: 45,             // mỗi lần hỏi trạng thái, Apify giữ kết nối tối đa N giây
  MAX_RUNTIME_MS: 5 * 60 * 1000,  // Apps Script giới hạn 6 phút/lần chạy
};

const HEADERS = [
  'Link video', 'KOL (username)', 'Video ID', 'Ngày đăng', 'Views', 'Likes',
  'Comments', 'Shares', 'Saves', 'Engagement rate', 'Cập nhật lúc', 'Trạng thái',
];
// Vị trí cột (1-based) theo HEADERS
const COL = {
  LINK: 1, KOL: 2, ID: 3, POSTED: 4, VIEWS: 5, LIKES: 6,
  COMMENTS: 7, SHARES: 8, SAVES: 9, ER: 10, UPDATED: 11, STATUS: 12,
};

/* ===================== MENU ===================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('TikTok KOL')
    .addItem('1. Tạo sheet & tiêu đề', 'setupSheets')
    .addItem('2. Nhập Apify API token', 'setApifyToken')
    .addSeparator()
    .addItem('GET — lấy số liệu tất cả link', 'getStats')
    .addItem('Chỉ lấy các dòng đang chọn', 'updateSelectedRows')
    .addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  const main = ss.getSheetByName(CONFIG.SHEET_MAIN) || ss.insertSheet(CONFIG.SHEET_MAIN);
  main.getRange(CONFIG.HEADER_ROW, 1, 1, HEADERS.length)
    .setValues([HEADERS]).setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
  main.setFrozenRows(CONFIG.HEADER_ROW);
  main.getRange('E:I').setNumberFormat('#,##0');
  main.getRange('J:J').setNumberFormat('0.00%');
  main.getRange('D:D').setNumberFormat('dd/MM/yyyy');
  main.getRange('K:K').setNumberFormat('dd/MM/yyyy HH:mm');
  main.setColumnWidth(COL.LINK, 320);

  const hist = ss.getSheetByName(CONFIG.SHEET_HISTORY) || ss.insertSheet(CONFIG.SHEET_HISTORY);
  hist.getRange(1, 1, 1, 8).setValues([[
    'Thời điểm', 'Video ID', 'KOL', 'Views', 'Likes', 'Comments', 'Shares', 'Saves',
  ]]).setFontWeight('bold');
  hist.setFrozenRows(1);
}

function setApifyToken() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('Apify API token',
    'Lấy tại Apify Console → Settings → API & Integrations.\nToken được lưu trong Script Properties, không hiện trong Sheet.',
    ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const token = res.getResponseText().trim();
  if (!token) return;
  PropertiesService.getScriptProperties().setProperty('APIFY_TOKEN', token);
  ui.alert('Đã lưu token.');
}

/* ===================== CẬP NHẬT ===================== */

/** Hàm gắn vào nút GET trên sheet (Insert → Drawing → Assign script: getStats) */
function getStats() {
  SpreadsheetApp.getActive().toast('Đang lấy số liệu, vui lòng chờ 1–2 phút…', 'TikTok KOL', 120);
  updateAllRows();
}

function updateSelectedRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (sheet.getName() !== CONFIG.SHEET_MAIN) {
    SpreadsheetApp.getUi().alert('Hãy chọn dòng trong sheet "' + CONFIG.SHEET_MAIN + '".');
    return;
  }
  const rows = [];
  sheet.getActiveRangeList().getRanges().forEach(function (r) {
    for (let i = r.getRow(); i <= r.getLastRow(); i++) {
      if (i > CONFIG.HEADER_ROW) rows.push(i);
    }
  });
  const done = updateRows_(sheet, rows);
  SpreadsheetApp.getActive().toast('Đã cập nhật ' + done + '/' + rows.length + ' dòng', 'TikTok KOL');
}

function updateAllRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_MAIN);
  const last = sheet.getLastRow();
  if (last <= CONFIG.HEADER_ROW) return;

  // Ưu tiên dòng chưa cập nhật / cập nhật lâu nhất, để nếu hết 6 phút
  // thì lần chạy sau tiếp tục phần còn lại.
  const values = sheet.getRange(CONFIG.HEADER_ROW + 1, 1, last - CONFIG.HEADER_ROW, HEADERS.length).getValues();
  const rows = values
    .map(function (v, i) { return { row: i + CONFIG.HEADER_ROW + 1, link: v[COL.LINK - 1], updated: v[COL.UPDATED - 1] }; })
    .filter(function (x) { return String(x.link).trim() !== ''; })
    .sort(function (a, b) { return (a.updated ? +new Date(a.updated) : 0) - (b.updated ? +new Date(b.updated) : 0); })
    .map(function (x) { return x.row; });

  const done = updateRows_(sheet, rows);
  SpreadsheetApp.getActive().toast('Đã cập nhật ' + done + '/' + rows.length + ' dòng', 'TikTok KOL');
}

function updateRows_(sheet, rows) {
  const start = Date.now();
  const history = [];
  let done = 0;

  // Lọc link hợp lệ, báo lỗi ngay các link không phải video
  const jobs = [];
  rows.forEach(function (row) {
    const link = String(sheet.getRange(row, COL.LINK).getValue()).trim();
    if (!link) return;
    const err = validateLink_(link);
    if (err) writeError_(sheet, row, new Date(), err);
    else jobs.push({ row: row, link: link });
  });

  for (let i = 0; i < jobs.length; i += CONFIG.BATCH_SIZE) {
    if (Date.now() - start > CONFIG.MAX_RUNTIME_MS) break;
    const batch = jobs.slice(i, i + CONFIG.BATCH_SIZE);
    const now = new Date();

    let results;
    try {
      results = fetchStatsBatch(batch.map(function (j) { return j.link; }), start);
    } catch (e) {
      batch.forEach(function (j) {
        writeError_(sheet, j.row, now, e.message);
      });
      continue;
    }

    batch.forEach(function (j) {
      const s = results[j.link];
      if (!s || s.error) {
        writeError_(sheet, j.row, now, s ? s.error : 'Apify không trả kết quả cho link này');
        return;
      }
      const er = s.views > 0 ? (s.likes + s.comments + s.shares + s.saves) / s.views : '';
      sheet.getRange(j.row, COL.KOL, 1, HEADERS.length - 1).setValues([[
        '@' + s.author, s.id, s.createdAt, s.views, s.likes, s.comments,
        s.shares, s.saves, er, now, 'OK',
      ]]);
      history.push([now, s.id, '@' + s.author, s.views, s.likes, s.comments, s.shares, s.saves]);
      done++;
    });
  }

  if (history.length) {
    const hist = SpreadsheetApp.getActive().getSheetByName(CONFIG.SHEET_HISTORY);
    if (hist) hist.getRange(hist.getLastRow() + 1, 1, history.length, history[0].length).setValues(history);
  }
  return done;
}

/** Xoá số liệu cũ của dòng (tránh hiển thị số của link trước đó) và ghi lỗi */
function writeError_(sheet, row, when, message) {
  const blanks = new Array(COL.UPDATED - COL.KOL).fill('');
  sheet.getRange(row, COL.KOL, 1, HEADERS.length - 1)
    .setValues([blanks.concat([when, 'LỖI: ' + message])]);
}

function validateLink_(link) {
  if (!/tiktok\.com/i.test(link)) return 'Không phải link TikTok';
  if (extractVideoId_(link)) return null;
  if (/(vt|vm)\.tiktok\.com\/|tiktok\.com\/t\//i.test(link)) return null; // link rút gọn, Apify tự xử lý
  if (/tiktok\.com\/@[^/?#]+\/?(\?|#|$)/i.test(link)) {
    return 'Đây là link trang cá nhân — hãy dán link của từng video (…/video/ID)';
  }
  return 'Không tìm được Video ID từ link';
}

function extractVideoId_(link) {
  const m = String(link).match(/\/(?:video|photo)\/(\d{15,25})/);
  return m ? m[1] : null;
}

/* ===================== APIFY ===================== */

/**
 * Gửi 1 nhóm link sang Apify, chờ chạy xong, trả về object { link: stats }.
 * stats = { id, author, createdAt, views, likes, comments, shares, saves }
 *      hoặc { error: '...' } nếu video lỗi.
 */
function fetchStatsBatch(links, startedAt) {
  const run = apify_('post', '/acts/' + CONFIG.APIFY_ACTOR + '/runs', {
    postURLs: links,
    resultsPerPage: 1,
    scrapeRelatedVideos: false,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadAvatars: false,
    shouldDownloadMusicCovers: false,
    shouldDownloadSlideshowImages: false,
    downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES',
  }).data;

  // Chờ run kết thúc
  let status = run.status;
  while (['READY', 'RUNNING'].indexOf(status) >= 0) {
    if (Date.now() - (startedAt || Date.now()) > CONFIG.MAX_RUNTIME_MS) {
      throw new Error('Apify chạy quá lâu, bấm cập nhật lại sau ít phút');
    }
    status = apify_('get', '/actor-runs/' + run.id + '?waitForFinish=' + CONFIG.POLL_WAIT_SECS).data.status;
  }
  if (status !== 'SUCCEEDED') throw new Error('Apify run ' + status);

  const items = apify_('get', '/datasets/' + run.defaultDatasetId + '/items?clean=true&format=json');
  return mapResults_(links, items);
}

/** Ghép kết quả Apify về đúng link đã gửi (theo URL gốc hoặc Video ID) */
function mapResults_(links, items) {
  const byKey = {};
  items.forEach(function (it) {
    const keys = [it.submittedVideoUrl, it.url, it.input, it.webVideoUrl, it.id,
                  extractVideoId_(it.webVideoUrl || '')];
    const value = it.error
      ? { error: it.errorCode ? it.errorCode + ' — ' + it.error : String(it.error) }
      : {
          id: String(it.id || ''),
          author: (it.authorMeta && it.authorMeta.name) || '',
          createdAt: it.createTimeISO ? new Date(it.createTimeISO)
                   : it.createTime ? new Date(Number(it.createTime) * 1000) : '',
          views: toNum_(it.playCount),
          likes: toNum_(it.diggCount),
          comments: toNum_(it.commentCount),
          shares: toNum_(it.shareCount),
          saves: toNum_(it.collectCount),
        };
    keys.forEach(function (k) { if (k && !byKey[k]) byKey[k] = value; });
  });

  const out = {};
  links.forEach(function (link) {
    out[link] = byKey[link] || byKey[extractVideoId_(link)] || null;
  });
  return out;
}

function apify_(method, path, payload) {
  const token = PropertiesService.getScriptProperties().getProperty('APIFY_TOKEN');
  if (!token) throw new Error('Chưa nhập Apify API token (menu TikTok KOL → 2)');

  const opts = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + token },
  };
  if (payload) {
    opts.contentType = 'application/json';
    opts.payload = JSON.stringify(payload);
  }
  const res = UrlFetchApp.fetch(CONFIG.APIFY_BASE + path, opts);
  const code = res.getResponseCode();
  const body = res.getContentText();
  if (code >= 400) {
    let msg = body;
    try { msg = JSON.parse(body).error.message; } catch (e) { /* giữ nguyên body */ }
    throw new Error('Apify HTTP ' + code + ': ' + String(msg).slice(0, 200));
  }
  return JSON.parse(body);
}

function toNum_(v) {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

/* ===================== TEST ===================== */

/** Chạy trong Apps Script Editor (chọn testFetch → Run), xem kết quả ở Execution log */
function testFetch() {
  const link = 'https://www.tiktok.com/@hannaholala/video/7700977058616331540';
  const res = fetchStatsBatch([link], Date.now());
  Logger.log(JSON.stringify(res, null, 2));
}
