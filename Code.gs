/**
 * Social Analysis — Google Sheets + Apps Script + Apify
 * Version: 2.0.0
 * https://github.com/HaiSapporo/get-info-KOL-tiktok-to-googlesheet
 *
 * Lấy số liệu bài đăng mạng xã hội (TikTok, Threads, …) từ link bài đăng.
 * Các nền tảng chặn request trực tiếp từ server Google, nên script gửi danh
 * sách link sang Apify (mỗi nền tảng 1 actor), chờ chạy xong rồi ghi số liệu
 * về sheet riêng của nền tảng đó, kèm sheet lịch sử.
 *
 * Thêm nền tảng mới: khai báo 1 mục trong PLATFORMS (sheet, actor, cột số
 * liệu, cách kiểm tra link, cách tạo input và đọc kết quả của actor).
 *
 * API token Apify lưu trong Script Properties (menu "Nhập Apify API token"),
 * không ghi trong code.
 */

const CONFIG = {
  APP_NAME: 'Social Analysis',
  HEADER_ROW: 5,                  // dòng tiêu đề của sheet nền tảng; dòng 1–4 để trống cho nút GET
  APIFY_BASE: 'https://api.apify.com/v2',
  BATCH_SIZE: 50,                 // số link gửi trong 1 lần chạy Apify
  POLL_WAIT_SECS: 45,             // mỗi lần hỏi trạng thái, Apify giữ kết nối tối đa N giây
  MAX_RUNTIME_MS: 5 * 60 * 1000,  // Apps Script giới hạn 6 phút/lần chạy
  QUOTA_DAILY: 500,               // tối đa số link gửi sang Apify mỗi ngày (tất cả nền tảng)
  QUOTA_MONTHLY: 2000,            // tối đa số link mỗi tháng (tất cả nền tảng)
};

/* ===================== NỀN TẢNG ===================== */

const PLATFORMS = {
  tiktok: {
    name: 'TikTok',
    sheet: 'TikTok',
    historySheet: 'TikTok_LichSu',
    legacySheets: { main: 'KOL_Tracking', history: 'Lich_Su' }, // tên sheet ở bản 1.x
    actor: 'clockworks~tiktok-scraper',
    metrics: [
      { key: 'views', label: 'Views' },
      { key: 'likes', label: 'Likes' },
      { key: 'comments', label: 'Comments' },
      { key: 'shares', label: 'Shares' },
      { key: 'saves', label: 'Saves' },
    ],
    engagement: function (s) { return ratio_(sum_([s.likes, s.comments, s.shares, s.saves]), s.views); },
    sampleLink: 'https://www.tiktok.com/@hannaholala/video/7700977058616331540',

    extractId: function (link) {
      const m = String(link).match(/\/(?:video|photo)\/(\d{15,25})/);
      return m ? m[1] : null;
    },
    validate: function (link) {
      if (!/tiktok\.com/i.test(link)) return 'Không phải link TikTok';
      if (this.extractId(link)) return null;
      if (/(vt|vm)\.tiktok\.com\/|tiktok\.com\/t\//i.test(link)) return null; // link rút gọn, Apify tự xử lý
      if (/tiktok\.com\/@[^/?#]+\/?(\?|#|$)/i.test(link)) {
        return 'Đây là link trang cá nhân — hãy dán link của từng video (…/video/ID)';
      }
      return 'Không tìm được Video ID từ link';
    },
    buildInput: function (links) {
      return {
        postURLs: links,
        resultsPerPage: 1,
        scrapeRelatedVideos: false,
        shouldDownloadVideos: false,
        shouldDownloadCovers: false,
        shouldDownloadAvatars: false,
        shouldDownloadMusicCovers: false,
        shouldDownloadSlideshowImages: false,
        downloadSubtitlesOptions: 'NEVER_DOWNLOAD_SUBTITLES',
      };
    },
    /** Trả về { keys, value } hoặc null nếu bỏ qua item */
    parseItem: function (it) {
      return {
        keys: [it.submittedVideoUrl, it.webVideoUrl, it.id, this.extractId(it.webVideoUrl || '')],
        value: {
          id: String(it.id || ''),
          author: (it.authorMeta && it.authorMeta.name) || '',
          createdAt: it.createTimeISO ? new Date(it.createTimeISO)
                   : it.createTime ? new Date(Number(it.createTime) * 1000) : '',
          views: num_(it.playCount),
          likes: num_(it.diggCount),
          comments: num_(it.commentCount),
          shares: num_(it.shareCount),
          saves: num_(it.collectCount),
        },
      };
    },
  },

  threads: {
    name: 'Threads',
    sheet: 'Threads',
    historySheet: 'Threads_LichSu',
    actor: 'lergassy~threads-scraper',
    metrics: [
      { key: 'views', label: 'Views' },
      { key: 'likes', label: 'Likes' },
      { key: 'replies', label: 'Replies' },
      { key: 'reposts', label: 'Reposts' },
      { key: 'quotes', label: 'Quotes' },
      { key: 'shares', label: 'Shares' },
    ],
    engagement: function (s) {
      return ratio_(sum_([s.likes, s.replies, s.reposts, s.quotes, s.shares]), s.views);
    },
    sampleLink: 'https://www.threads.com/@zuck/post/Dcy_A8pGo-m',

    extractId: function (link) {
      const m = String(link).match(/threads\.(?:net|com)\/@[^/]+\/post\/([A-Za-z0-9_-]+)/i);
      return m ? m[1] : null;
    },
    validate: function (link) {
      if (!/threads\.(net|com)/i.test(link)) return 'Không phải link Threads';
      if (this.extractId(link)) return null;
      if (/threads\.(net|com)\/@[^/?#]+\/?(\?|#|$)/i.test(link)) {
        return 'Đây là link trang cá nhân — hãy dán link của từng bài (…/post/CODE)';
      }
      return 'Không tìm được mã bài viết từ link';
    },
    buildInput: function (links) {
      return {
        mode: 'posts',
        postUrls: links,
        maxPosts: 1,
        maxRepliesPerPost: 0,
        includeViews: true,
        includeProfile: false,
        includeRunSummary: false,
        maxItems: links.length,     // chặn cứng số dòng tính phí
      };
    },
    parseItem: function (it) {
      if (it.type && it.type !== 'post') return null; // bỏ dòng notice / profile
      return {
        keys: [it.code, this.extractId(it.url || '')],
        value: {
          id: it.code || String(it.id || ''),
          author: it.username || '',
          createdAt: it.createdAt ? new Date(it.createdAt)
                   : it.timestamp ? new Date(Number(it.timestamp) * 1000) : '',
          views: num_(it.viewCount),
          likes: num_(it.likeCount),
          replies: num_(it.replyCount),
          reposts: num_(it.repostCount),
          quotes: num_(it.quoteCount),
          shares: num_(it.shareCount),
        },
      };
    },
  },
};

/** Cột của sheet chính: Link | Tài khoản | Post ID | Ngày đăng | <số liệu…> | Engagement rate | Cập nhật lúc | Trạng thái */
function layout_(p) {
  const n = p.metrics.length;
  return {
    headers: ['Link bài đăng', 'Tài khoản', 'Post ID', 'Ngày đăng']
      .concat(p.metrics.map(function (m) { return m.label; }))
      .concat(['Engagement rate', 'Cập nhật lúc', 'Trạng thái']),
    LINK: 1, ACCOUNT: 2, ID: 3, POSTED: 4,
    METRIC: 5, ER: 5 + n, UPDATED: 6 + n, STATUS: 7 + n, WIDTH: 7 + n,
  };
}

function historyHeaders_(p) {
  return ['Thời điểm', 'Post ID', 'Tài khoản'].concat(p.metrics.map(function (m) { return m.label; }));
}

/* ===================== MENU ===================== */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu(CONFIG.APP_NAME)
    .addItem('1. Tạo sheet & tiêu đề', 'setupSheets')
    .addItem('2. Nhập Apify API token', 'setApifyToken')
    .addSeparator()
    .addItem('GET — sheet đang mở', 'getStats')
    .addItem('GET — TikTok', 'getTikTok')
    .addItem('GET — Threads', 'getThreads')
    .addItem('Chỉ lấy các dòng đang chọn', 'updateSelectedRows')
    .addSeparator()
    .addItem('Xem hạn mức đã dùng', 'showQuota');
  menu.addToUi();
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  Object.keys(PLATFORMS).forEach(function (key) {
    const p = PLATFORMS[key];
    const L = layout_(p);

    // Nâng cấp từ bản 1.x: đổi tên sheet cũ thay vì tạo mới, để giữ dữ liệu và nút GET
    if (p.legacySheets) {
      renameIfExists_(ss, p.legacySheets.main, p.sheet);
      renameIfExists_(ss, p.legacySheets.history, p.historySheet);
    }

    const main = ss.getSheetByName(p.sheet) || ss.insertSheet(p.sheet);
    moveHeaderDown_(main);
    main.getRange(CONFIG.HEADER_ROW, 1, 1, L.WIDTH)
      .setValues([L.headers]).setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
    main.setFrozenRows(CONFIG.HEADER_ROW);
    colRange_(main, L.POSTED, 1).setNumberFormat('dd/MM/yyyy');
    colRange_(main, L.METRIC, p.metrics.length).setNumberFormat('#,##0');
    colRange_(main, L.ER, 1).setNumberFormat('0.00%');
    colRange_(main, L.UPDATED, 1).setNumberFormat('dd/MM/yyyy HH:mm');
    main.setColumnWidth(L.LINK, 320);

    const hist = ss.getSheetByName(p.historySheet) || ss.insertSheet(p.historySheet);
    const hh = historyHeaders_(p);
    hist.getRange(1, 1, 1, hh.length).setValues([hh]).setFontWeight('bold');
    hist.setFrozenRows(1);
  });
}

/**
 * Sheet tạo từ bản cũ có tiêu đề ở dòng trên HEADER_ROW (vd dòng 1):
 * chèn thêm dòng trống phía trên để đẩy tiêu đề + dữ liệu xuống, không mất dữ liệu.
 */
function moveHeaderDown_(sheet) {
  const top = Math.min(sheet.getLastRow(), CONFIG.HEADER_ROW - 1);
  if (top < 1) return;
  const colA = sheet.getRange(1, 1, top, 1).getValues();
  for (let r = 1; r <= top; r++) {
    if (/^Link (video|bài đăng)$/.test(String(colA[r - 1][0]).trim())) {
      sheet.insertRowsBefore(r, CONFIG.HEADER_ROW - r);
      return;
    }
  }
}

function renameIfExists_(ss, oldName, newName) {
  const old = ss.getSheetByName(oldName);
  if (old && !ss.getSheetByName(newName)) old.setName(newName);
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

/** Hàm gắn vào nút GET (Insert → Drawing → Assign script: getStats). Lấy số liệu của sheet đang mở. */
function getStats() {
  const p = platformOfSheet_(SpreadsheetApp.getActiveSheet().getName());
  if (!p) {
    SpreadsheetApp.getUi().alert('Hãy mở sheet của một nền tảng (' + platformSheetNames_() + ') rồi bấm GET.');
    return;
  }
  runPlatform_(p);
}

function getTikTok() { runPlatform_(PLATFORMS.tiktok); }
function getThreads() { runPlatform_(PLATFORMS.threads); }

function runPlatform_(p) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(p.sheet);
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Chưa có sheet "' + p.sheet + '". Chạy menu ' + CONFIG.APP_NAME + ' → 1. Tạo sheet & tiêu đề.');
    return;
  }
  ss.toast('Đang lấy số liệu ' + p.name + ', vui lòng chờ 1–2 phút…', CONFIG.APP_NAME, 120);
  updateAllRows_(p, sheet);
}

function updateSelectedRows() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const p = platformOfSheet_(sheet.getName());
  if (!p || sheet.getName() !== p.sheet) {
    SpreadsheetApp.getUi().alert('Hãy chọn dòng trong sheet ' + platformSheetNames_() + '.');
    return;
  }
  const rows = [];
  sheet.getActiveRangeList().getRanges().forEach(function (r) {
    for (let i = r.getRow(); i <= r.getLastRow(); i++) {
      if (i > CONFIG.HEADER_ROW) rows.push(i);
    }
  });
  report_(p, updateRows_(p, sheet, rows));
}

function updateAllRows_(p, sheet) {
  const L = layout_(p);
  const last = sheet.getLastRow();
  if (last <= CONFIG.HEADER_ROW) return;

  // Ưu tiên dòng chưa cập nhật / cập nhật lâu nhất, để nếu hết thời gian hoặc
  // hết hạn mức thì lần chạy sau tiếp tục phần còn lại.
  const values = sheet.getRange(CONFIG.HEADER_ROW + 1, 1, last - CONFIG.HEADER_ROW, L.WIDTH).getValues();
  const rows = values
    .map(function (v, i) { return { row: i + CONFIG.HEADER_ROW + 1, link: v[L.LINK - 1], updated: v[L.UPDATED - 1] }; })
    .filter(function (x) { return String(x.link).trim() !== ''; })
    .sort(function (a, b) { return (a.updated ? +new Date(a.updated) : 0) - (b.updated ? +new Date(b.updated) : 0); })
    .map(function (x) { return x.row; });

  report_(p, updateRows_(p, sheet, rows));
}

function report_(p, r) {
  let msg = p.name + ': cập nhật ' + r.done + '/' + r.total + ' dòng';
  if (r.skipped) msg += '. ' + r.skipped + ' dòng chưa chạy vì hết hạn mức';
  const q = quotaStatus_();
  msg += '. Hạn mức còn: hôm nay ' + q.dayLeft + ', tháng này ' + q.monthLeft + '.';
  SpreadsheetApp.getActive().toast(msg, CONFIG.APP_NAME, 15);
}

/** Trả về { done, total, skipped } */
function updateRows_(p, sheet, rows) {
  const L = layout_(p);
  const start = Date.now();
  const history = [];
  let done = 0;

  // 1. Lọc link hợp lệ; link sai báo lỗi ngay, không tốn hạn mức
  const jobs = [];
  rows.forEach(function (row) {
    const link = String(sheet.getRange(row, L.LINK).getValue()).trim();
    if (!link) return;
    const err = p.validate(link);
    if (err) writeError_(sheet, L, row, new Date(), err);
    else jobs.push({ row: row, link: link, key: p.extractId(link) || link });
  });
  const total = jobs.length;
  if (!total) return { done: 0, total: 0, skipped: 0 };
  getToken_(); // báo lỗi thiếu token trước khi trừ hạn mức

  // 2. Trừ hạn mức theo số bài đăng khác nhau (cùng 1 bài dán nhiều dòng / nhiều dạng link chỉ tính 1)
  const linkOfKey = {};
  jobs.forEach(function (j) { if (!linkOfKey[j.key]) linkOfKey[j.key] = j.link; });
  const keys = Object.keys(linkOfKey);
  const granted = reserveQuota_(keys.length);
  const allowed = {};
  keys.slice(0, granted).forEach(function (k) { allowed[k] = true; });
  const runJobs = jobs.filter(function (j) { return allowed[j.key]; });
  const skippedJobs = jobs.filter(function (j) { return !allowed[j.key]; });
  if (skippedJobs.length) {
    const q = quotaStatus_();
    const why = q.dayLeft <= 0 && q.monthLeft > 0
      ? 'hết hạn mức ngày (' + CONFIG.QUOTA_DAILY + ' link), chạy lại vào ngày mai'
      : 'hết hạn mức tháng (' + CONFIG.QUOTA_MONTHLY + ' link), chạy lại vào tháng sau';
    skippedJobs.forEach(function (j) { sheet.getRange(j.row, L.STATUS).setValue('CHƯA CHẠY: ' + why); });
  }

  // 3. Gửi theo nhóm sang Apify
  const runLinks = keys.slice(0, granted).map(function (k) { return linkOfKey[k]; });
  const results = {};
  const failed = {};
  let notRun = [];
  for (let i = 0; i < runLinks.length; i += CONFIG.BATCH_SIZE) {
    const batch = runLinks.slice(i, i + CONFIG.BATCH_SIZE);
    if (Date.now() - start > CONFIG.MAX_RUNTIME_MS) { notRun = notRun.concat(batch); continue; }
    try {
      Object.assign(results, fetchStatsBatch(p, batch, start));
    } catch (e) {
      batch.forEach(function (l) { failed[l] = e.message; });
      if (e.notStarted) refundQuota_(batch.length); // Apify chưa chạy → không tính hạn mức
    }
  }
  if (notRun.length) refundQuota_(notRun.length); // chưa gửi đi thì trả lại hạn mức

  // 4. Ghi kết quả
  const now = new Date();
  const notRunSet = {};
  notRun.forEach(function (l) { notRunSet[l] = true; });
  runJobs.forEach(function (j) {
    const sent = linkOfKey[j.key]; // link thực tế đã gửi cho bài đăng này
    if (notRunSet[sent]) {
      sheet.getRange(j.row, L.STATUS).setValue('CHƯA CHẠY: hết thời gian, bấm GET lại');
      return;
    }
    const s = results[sent];
    if (failed[sent] || !s || s.error) {
      writeError_(sheet, L, j.row, now,
        failed[sent] || (s ? s.error : 'Apify không trả kết quả cho link này'));
      return;
    }
    const metrics = p.metrics.map(function (m) { return s[m.key]; });
    sheet.getRange(j.row, L.ACCOUNT, 1, L.WIDTH - 1).setValues([
      ['@' + s.author, s.id, s.createdAt].concat(metrics).concat([p.engagement(s), now, 'OK']),
    ]);
    history.push([now, s.id, '@' + s.author].concat(metrics));
    done++;
  });

  if (history.length) {
    const hist = SpreadsheetApp.getActive().getSheetByName(p.historySheet);
    if (hist) hist.getRange(hist.getLastRow() + 1, 1, history.length, history[0].length).setValues(history);
  }
  return { done: done, total: total, skipped: skippedJobs.length };
}

/** Xoá số liệu cũ của dòng (tránh hiển thị số của link trước đó) và ghi lỗi */
function writeError_(sheet, L, row, when, message) {
  const blanks = new Array(L.UPDATED - L.ACCOUNT).fill('');
  sheet.getRange(row, L.ACCOUNT, 1, L.WIDTH - 1)
    .setValues([blanks.concat([when, 'LỖI: ' + message])]);
}

/* ===================== HẠN MỨC ===================== */

function quotaKeys_() {
  const tz = Session.getScriptTimeZone();
  const now = new Date();
  return {
    day: 'QUOTA_DAY_' + Utilities.formatDate(now, tz, 'yyyy-MM-dd'),
    month: 'QUOTA_MONTH_' + Utilities.formatDate(now, tz, 'yyyy-MM'),
  };
}

function quotaStatus_() {
  const props = PropertiesService.getScriptProperties();
  const k = quotaKeys_();
  const dayUsed = Number(props.getProperty(k.day)) || 0;
  const monthUsed = Number(props.getProperty(k.month)) || 0;
  return {
    dayUsed: dayUsed, monthUsed: monthUsed,
    dayLeft: Math.max(0, CONFIG.QUOTA_DAILY - dayUsed),
    monthLeft: Math.max(0, CONFIG.QUOTA_MONTHLY - monthUsed),
  };
}

/** Giữ chỗ tối đa n link trong hạn mức; trả về số link được phép chạy */
function reserveQuota_(n) {
  return changeQuota_(function (q) { return Math.min(n, q.dayLeft, q.monthLeft); });
}

function refundQuota_(n) {
  changeQuota_(function (q) { return -Math.min(n, q.dayUsed, q.monthUsed); });
}

function changeQuota_(deltaOf) {
  const lock = LockService.getScriptLock(); // nhiều người bấm GET cùng lúc
  lock.waitLock(30000);
  try {
    const props = PropertiesService.getScriptProperties();
    const k = quotaKeys_();
    const q = quotaStatus_();
    const delta = deltaOf(q);
    if (delta !== 0) {
      props.setProperty(k.day, String(q.dayUsed + delta));
      props.setProperty(k.month, String(q.monthUsed + delta));
    }
    // Dọn bộ đếm của ngày / tháng cũ
    Object.keys(props.getProperties()).forEach(function (key) {
      if (/^QUOTA_(DAY|MONTH)_/.test(key) && key !== k.day && key !== k.month) props.deleteProperty(key);
    });
    return delta;
  } finally {
    lock.releaseLock();
  }
}

function showQuota() {
  const q = quotaStatus_();
  SpreadsheetApp.getUi().alert('Hạn mức Apify (tính chung mọi nền tảng)',
    'Hôm nay: ' + q.dayUsed + ' / ' + CONFIG.QUOTA_DAILY + ' link (còn ' + q.dayLeft + ')\n' +
    'Tháng này: ' + q.monthUsed + ' / ' + CONFIG.QUOTA_MONTHLY + ' link (còn ' + q.monthLeft + ')',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

/* ===================== APIFY ===================== */

/**
 * Gửi 1 nhóm link sang actor của nền tảng, chờ chạy xong, trả về { link: stats }.
 * stats = { id, author, createdAt, <metric keys…> } hoặc { error: '...' }.
 */
function fetchStatsBatch(p, links, startedAt) {
  let run;
  try {
    run = apify_('post', '/acts/' + p.actor + '/runs', p.buildInput(links)).data;
  } catch (e) {
    e.notStarted = true; // chưa tạo được run (token sai, hết credit…) → được trả lại hạn mức
    throw e;
  }

  let status = run.status;
  while (['READY', 'RUNNING'].indexOf(status) >= 0) {
    if (Date.now() - (startedAt || Date.now()) > CONFIG.MAX_RUNTIME_MS) {
      throw new Error('Apify chạy quá lâu, bấm GET lại sau ít phút');
    }
    status = apify_('get', '/actor-runs/' + run.id + '?waitForFinish=' + CONFIG.POLL_WAIT_SECS).data.status;
  }
  if (status !== 'SUCCEEDED') throw new Error('Apify run ' + status);

  const items = apify_('get', '/datasets/' + run.defaultDatasetId + '/items?clean=true&format=json');
  return mapResults_(p, links, items);
}

/** Ghép kết quả Apify về đúng link đã gửi (theo URL gốc hoặc ID bài đăng) */
function mapResults_(p, links, items) {
  const byKey = {};
  items.forEach(function (it) {
    let parsed;
    if (it.error || it.errorCode) {
      const src = it.url || it.input || it.inputUrl || '';
      parsed = {
        keys: [it.url, it.input, it.inputUrl, p.extractId(src)],
        value: { error: it.errorCode ? it.errorCode + ' — ' + (it.error || '') : String(it.error) },
      };
    } else {
      parsed = p.parseItem(it);
    }
    if (!parsed) return;
    parsed.keys.forEach(function (k) { if (k && !byKey[k]) byKey[k] = parsed.value; });
  });

  const out = {};
  links.forEach(function (link) {
    out[link] = byKey[link] || byKey[p.extractId(link)] || null;
  });
  return out;
}

function getToken_() {
  const token = PropertiesService.getScriptProperties().getProperty('APIFY_TOKEN');
  if (!token) throw new Error('Chưa nhập Apify API token (menu ' + CONFIG.APP_NAME + ' → 2)');
  return token;
}

function apify_(method, path, payload) {
  const opts = {
    method: method,
    muteHttpExceptions: true,
    headers: { Authorization: 'Bearer ' + getToken_() },
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

/* ===================== TIỆN ÍCH ===================== */

function platformOfSheet_(name) {
  const key = Object.keys(PLATFORMS).filter(function (k) {
    return PLATFORMS[k].sheet === name || PLATFORMS[k].historySheet === name;
  })[0];
  return key ? PLATFORMS[key] : null;
}

function platformSheetNames_() {
  return Object.keys(PLATFORMS).map(function (k) { return '"' + PLATFORMS[k].sheet + '"'; }).join(', ');
}

/** Vùng dữ liệu của 1 hoặc nhiều cột, từ dưới dòng tiêu đề đến hết sheet */
function colRange_(sheet, col, count) {
  const first = CONFIG.HEADER_ROW + 1;
  return sheet.getRange(first, col, Math.max(1, sheet.getMaxRows() - first + 1), count);
}

/** Số liệu bị ẩn / không có (null) thì để trống thay vì 0 */
function num_(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return isNaN(n) ? '' : n;
}

function sum_(arr) {
  return arr.reduce(function (a, v) { return a + (typeof v === 'number' ? v : 0); }, 0);
}

function ratio_(part, views) {
  return typeof views === 'number' && views > 0 ? part / views : '';
}

/* ===================== TEST ===================== */

/** Chạy trong Apps Script Editor (chọn hàm → Run), xem kết quả ở Execution log. Không tính hạn mức. */
function testTikTok() { testPlatform_(PLATFORMS.tiktok); }
function testThreads() { testPlatform_(PLATFORMS.threads); }

function testPlatform_(p) {
  const res = fetchStatsBatch(p, [p.sampleLink], Date.now());
  Logger.log(JSON.stringify(res, null, 2));
}
