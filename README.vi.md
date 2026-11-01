# Social Analysis — Google Sheets + Apps Script + Apify

[English](README.md) | **Tiếng Việt** | [日本語](README.ja.md)

Dán link bài đăng mạng xã hội vào Google Sheet → bấm **GET** → script tự lấy số liệu tương tác của từng bài, tính Engagement rate và lưu lịch sử.
Không cần cài phần mềm trên máy.

Các nền tảng đang hỗ trợ:

| Nền tảng | Sheet | Số liệu lấy về |
|----------|-------|----------------|
| TikTok | `TikTok` | Views, Likes, Comments, Shares, Saves |
| Threads | `Threads` | Views, Likes, Replies, Reposts, Quotes, Shares |

Sau này có thể thêm nền tảng khác (xem [Thêm nền tảng mới](#thêm-nền-tảng-mới)).

## Tính năng

- Mỗi sheet nền tảng có 1 nút **GET**: lấy số liệu cho tất cả link ở cột A của sheet đó.
- Mỗi nền tảng có sheet lịch sử riêng (`TikTok_LichSu`, `Threads_LichSu`), lưu lại mỗi lần lấy thành công.
- **Hạn mức:** tối đa **500 link/ngày** và **2.000 link/tháng**, tính chung mọi nền tảng, để không vượt chi phí Apify.
- Kiểm tra link trước khi gọi API: link profile, link sai nền tảng và link trùng không tốn hạn mức.
- Link được hỗ trợ: TikTok đầy đủ và rút gọn (`vt.tiktok.com`, `vm.tiktok.com`); Threads dạng bài viết (`threads.net` / `threads.com/@user/post/…`) và link share (`threads.com/share/…`, script tự mở để tìm ra bài).
- Cùng 1 bài dán 2 lần, hoặc dán bằng 2 dạng link (vd link share và link đầy đủ), chỉ lấy và tính 1 lần.
- Cột Trạng thái báo rõ từng dòng; dòng lỗi được xoá số liệu cũ.
- API token Apify lưu trong Script Properties, không nằm trong code hay Sheet.

## Cách lấy dữ liệu

```
Google Sheet ──(Apps Script, UrlFetchApp)──► Apify API ──► TikTok / Threads
     ▲                                          │
     └──────────── số liệu từng bài ◄───────────┘
```

- **Vì sao cần Apify:** các nền tảng chặn request trực tiếp từ server Google. Test ngày 30/10/2026: Apps Script nhận về trang chống bot của TikTok thay vì dữ liệu.
- **Actor đang dùng:**

  | Nền tảng | Apify Actor | Giá (gói Free) |
  |----------|-------------|----------------|
  | TikTok | [`clockworks/tiktok-scraper`](https://apify.com/clockworks/tiktok-scraper) | khoảng 1,70 USD / 1.000 bài |
  | Threads | [`lergassy/threads-scraper`](https://apify.com/lergassy/threads-scraper) | khoảng 2,00 USD / 1.000 bài |

- **Cách chạy:** script gửi tối đa 50 link mỗi lần, chờ Apify chạy xong rồi ghi kết quả về đúng dòng.
- **Giới hạn thời gian:** Apps Script dừng sau 6 phút, nên sau 5 phút script không gửi thêm nhóm mới. Bấm GET lại để chạy tiếp phần còn lại (ưu tiên dòng cập nhật lâu nhất).

---

## Hướng dẫn sử dụng Apify

[Apify](https://apify.com?fpr=f5khma) là nền tảng đám mây chạy sẵn các công cụ thu thập dữ liệu, gọi là *Actor*. Tool này gọi 1 Actor cho mỗi nền tảng qua Apify API: Google Sheet gửi link bài đăng, Apify lấy dữ liệu trên server của họ, rồi script đọc kết quả về.

> Các link đăng ký apify.com trong README này là link giới thiệu (`?fpr=f5khma`).

### Tạo tài khoản
1. Vào [apify.com](https://apify.com?fpr=f5khma) → bấm **Sign up**.
2. Đăng ký bằng Google, GitHub hoặc email. Gói Free không cần thẻ tín dụng.
3. Sau khi đăng ký, bạn vào **Apify Console**, trang quản lý token, lịch sử chạy và chi phí.

### Lấy API token
1. Trong Apify Console, mở **Settings → API & Integrations**.
2. Copy **Personal API token**.
3. Trong Google Sheet, chọn menu **Social Analysis → 2. Nhập Apify API token** rồi dán vào.

Giữ token bí mật: ai có token đều chạy được Actor và tiêu credit của bạn. Nếu lỡ lộ, tạo token mới ở cùng màn hình, xoá token cũ rồi nhập lại token mới vào Sheet.

### Chạy thử Actor trên trình duyệt (tuỳ chọn)
1. Mở trang Actor ([TikTok](https://apify.com/clockworks/tiktok-scraper) hoặc [Threads](https://apify.com/lergassy/threads-scraper)) → bấm **Try for free**.
2. Thêm 1 link bài đăng vào ô URL bài đăng (`postURLs` với TikTok, `postUrls` với Threads).
3. Bấm **Start**. Chạy xong, tab **Output** hiện các số mà script sẽ ghi vào Sheet.

### Theo dõi lượt chạy và chi phí
- **Lượt chạy:** mỗi lần bấm GET tạo 1 lượt chạy Actor cho mỗi nhóm tối đa 50 link. Xem trạng thái, log và kết quả ở Console → **Runs**. Khi một dòng báo lỗi Apify, hãy xem ở đây trước.
- **Chi phí đã dùng:** Console → **Billing** cho biết đã dùng bao nhiêu credit trong tháng. Credit miễn phí được làm mới mỗi tháng.
- **Giới hạn chi tiêu:** đặt ở **Billing → Usage limits**, nhất là khi nhiều người dùng chung 1 token. Giới hạn này chạy song song với hạn mức link/ngày, link/tháng của Sheet.

### Giá và các gói
- Cả 2 Actor tính phí theo kết quả. Xem giá mới nhất ở tab **Pricing** của từng Actor; gói cao hơn có đơn giá thấp hơn.
- **Gói Free** có 5 USD credit mỗi tháng, đủ khoảng 2.500–3.000 bài.
- Hết credit thì Apify từ chối chạy, Sheet hiện `LỖI: Apify HTTP 402 …`. Chờ sang tháng mới hoặc nâng cấp gói tại [apify.com](https://apify.com?fpr=f5khma).
- Script đã tắt các tuỳ chọn tính phí thêm (tải video/ảnh, phụ đề, dòng profile, replies), nên chỉ trả phí cho chính bài đăng.

---

## Phân chia đầu việc

### Giai đoạn 0 — Chuẩn bị (≈30 phút)
| # | Việc | Người làm |
|---|------|-----------|
| 0.1 | Xin IT duyệt việc gửi link bài đăng công khai sang Apify (api.apify.com) | Bạn + IT |
| 0.2 | Đăng ký tài khoản tại [apify.com](https://apify.com?fpr=f5khma) (gói Free), xem [Hướng dẫn sử dụng Apify](#hướng-dẫn-sử-dụng-apify) | Bạn |
| 0.3 | Lấy token: Apify Console → **Settings → API & Integrations** → copy *Personal API token* | Bạn |
| 0.4 | (Nên làm) Đặt giới hạn chi tiêu trong Apify: **Billing → Usage limits** | Bạn |

### Giai đoạn 1 — Cài đặt & test thử (≈30 phút)
| # | Việc | Kết quả mong đợi |
|---|------|------------------|
| 1.1 | Mở Google Sheet → **Extensions → Apps Script** → xoá code cũ, dán toàn bộ `Code.gs` → Save | Lưu được, không lỗi |
| 1.2 | Reload Sheet → menu **Social Analysis → 1. Tạo sheet & tiêu đề** (lần đầu sẽ hỏi cấp quyền → Allow) | Có các sheet `TikTok`, `TikTok_LichSu`, `Threads`, `Threads_LichSu` |
| 1.3 | Menu **Social Analysis → 2. Nhập Apify API token** → dán token | “Đã lưu token” |
| 1.4 | Trong Apps Script chạy hàm `testTikTok`, rồi `testThreads` | Execution log in ra số liệu của bài mẫu |
| 1.5 | Dán 2–3 link vào cột A mỗi sheet → bấm GET | Cột Trạng thái = `OK` |
| 1.6 | Đối chiếu vài bài với số trên app | Khớp (lệch nhỏ do app làm tròn, vd 19.6K) |
| 1.7 | Mở Apify Console → **Runs**, xem lượt chạy Threads đầu tiên | Mỗi link chỉ tính 1 kết quả (không kèm replies) |

### Giai đoạn 1b — Tạo nút GET (≈5 phút)
| # | Việc |
|---|------|
| 1b.1 | Mở sheet `TikTok`: **Insert → Drawing** → vẽ hình chữ nhật, gõ chữ **GET** → *Save and Close* → đặt nút ở **dòng 1–4** (vùng trống dành cho nút; tiêu đề bảng ở dòng 5 được cố định nên nút luôn hiện) |
| 1b.2 | Bấm vào nút → dấu **⋮** → **Assign script** → gõ `getStats` → OK |
| 1b.3 | Làm lại tương tự ở sheet `Threads`. `getStats` luôn chạy cho sheet đang mở, nên mọi nút dùng chung 1 hàm |
| 1b.4 | (Nên làm) **Data → Protect sheets and ranges**: chỉ để nhân viên sửa cột A |

**Nâng cấp từ bản 1.x (TikTok KOL Tracker):** dán `Code.gs` mới và chạy **1. Tạo sheet & tiêu đề** một lần. Sheet cũ `KOL_Tracking` và `Lich_Su` được đổi tên thành `TikTok` và `TikTok_LichSu`, và 4 dòng trống được chèn phía trên tiêu đề cũ để tiêu đề xuống dòng 5; dữ liệu, cột và nút GET cũ vẫn dùng được. Token đã lưu vẫn giữ nguyên.

**Cách nhân viên dùng:** mở sheet nền tảng → dán link vào **cột A** (mỗi dòng 1 link, từ dòng 6, ngay dưới tiêu đề ở dòng 5) → bấm **GET** → chờ 1–2 phút → số liệu hiện ở các cột bên cạnh.
- Mỗi lần bấm, script lấy lại số liệu cho **tất cả** link trong sheet. Muốn tiết kiệm thì xoá link cũ đã xong trước khi dán đợt mới (số liệu cũ vẫn còn trong sheet lịch sử), hoặc chọn dòng rồi dùng menu **Chỉ lấy các dòng đang chọn**.
- Nút vẽ (Drawing) không bấm được trên app điện thoại; trên điện thoại hãy mở Sheet bằng trình duyệt và dùng menu.

### Giai đoạn 2 — Test các trường hợp đặc biệt (≈30 phút)
| Trường hợp | Kết quả mong đợi |
|------------|------------------|
| Link TikTok đầy đủ / rút gọn `vt.tiktok.com` | OK |
| Link Threads `threads.net` hoặc `threads.com` | OK |
| Link share Threads `threads.com/share/…` | OK (script tự đổi sang link đầy đủ). Nếu không mở được: `LỖI: Không mở được link share…` |
| Cùng 1 bài dán 2 dòng / 2 dạng link | Cả 2 dòng OK, chỉ tính 1 lượt hạn mức |
| Bài đã xoá / riêng tư | `LỖI: NOT_FOUND …` (hoặc mã lỗi Apify khác) |
| Link profile | `LỖI: Đây là link trang cá nhân…` (không tính hạn mức) |
| Dán link TikTok vào sheet Threads (và ngược lại) | `LỖI: Không phải link Threads / TikTok` (không tính hạn mức) |
| Bài ẩn số like | Ô Likes để trống |
| Token sai / hết credit | `LỖI: Apify HTTP 401/402 …` (được trả lại hạn mức) |
| Vượt hạn mức ngày / tháng | `CHƯA CHẠY: hết hạn mức …` |

> Đã kiểm tra trên máy với Sheet và Apify giả lập: đổi tên sheet từ bản 1.x, TikTok, Threads, link trùng, hạn mức ngày, hạn mức tháng, trả lại hạn mức khi token sai.

### Giai đoạn 3 — Báo cáo (tuỳ chọn)
| # | Việc |
|---|------|
| 3.1 | Sheet `*_LichSu` lưu số liệu mỗi lần bấm GET → dùng Pivot table / Chart để xem tăng trưởng |
| 3.2 | Sheet Dashboard tổng hợp theo tài khoản bằng `SUMIFS` / Pivot, hoặc nối Looker Studio (miễn phí) |

---

## Hạn mức sử dụng

Để tránh vượt chi phí, script đếm số link đã gửi sang Apify, tính chung mọi nền tảng:

| Hạn mức | Mặc định | Chỉnh trong `Code.gs` |
|---------|----------|-----------------------|
| Mỗi ngày | 500 link | `CONFIG.QUOTA_DAILY` |
| Mỗi tháng | 2.000 link | `CONFIG.QUOTA_MONTHLY` |

- Ngày/tháng tính theo múi giờ của script (**Apps Script → Project Settings → Time zone**).
- Link sai và link trùng không bị tính. Nếu Apify từ chối chạy (token sai, hết credit), số link đó được trả lại.
- Khi hết hạn mức, các dòng còn lại hiện `CHƯA CHẠY: hết hạn mức ngày …` hoặc `… hạn mức tháng …`, giữ nguyên số liệu cũ. Bấm GET lại vào ngày / tháng sau.
- Xem đã dùng bao nhiêu: menu **Social Analysis → Xem hạn mức đã dùng**.
- Mọi người dùng chung Sheet thì dùng chung bộ đếm.

## Cấu trúc sheet

Sheet nền tảng (`TikTok`, `Threads`):

| Dòng | Nội dung |
|------|----------|
| 1–4 | Vùng trống để đặt nút GET, hướng dẫn hoặc logo. Script không ghi vào đây. |
| 5 | Tiêu đề bảng (cố định khi cuộn) |
| 6 trở đi | Mỗi dòng 1 bài đăng |

Dòng tiêu đề chỉnh bằng `CONFIG.HEADER_ROW` trong `Code.gs` (mặc định `5`). Sheet lịch sử vẫn để tiêu đề ở dòng 1.

Các cột:

| Cột | Tiêu đề | Ý nghĩa |
|-----|---------|---------|
| A | Link bài đăng | Link (nhập vào) |
| B | Tài khoản | `@username` |
| C | Post ID | Video ID (TikTok) hoặc mã bài (Threads) |
| D | Ngày đăng | Ngày đăng bài |
| E… | *số liệu* | TikTok: Views, Likes, Comments, Shares, Saves<br>Threads: Views, Likes, Replies, Reposts, Quotes, Shares |
| … | Engagement rate | Tổng tương tác / Views |
| … | Cập nhật lúc | Thời điểm cập nhật |
| … | Trạng thái | `OK`, `LỖI: …` hoặc `CHƯA CHẠY: …` |

Sheet lịch sử (`<Nền tảng>_LichSu`): mỗi lần lấy thành công thêm 1 dòng gồm thời điểm, Post ID, tài khoản và toàn bộ số liệu.

## Thêm nền tảng mới

Toàn bộ phần riêng của từng nền tảng nằm trong object `PLATFORMS` ở `Code.gs`. Muốn thêm (vd Instagram, YouTube), khai báo 1 mục mới gồm:

| Trường | Dùng để |
|--------|---------|
| `name`, `sheet`, `historySheet` | Tên hiển thị và tên sheet |
| `actor` | ID Actor trên Apify, dạng `owner~actor-name` |
| `metrics` | Danh sách `{ key, label }`: các cột số liệu |
| `engagement(stats)` | Công thức Engagement rate |
| `extractId(link)` | Lấy ID bài từ link (để ghép kết quả và gộp link trùng) |
| `validate(link)` | Trả về thông báo lỗi nếu link sai, hoặc `null` |
| `buildInput(links)` | Input gửi cho Actor |
| `parseItem(item)` | Đổi 1 kết quả của Actor thành `{ keys, value }` |

Sau đó thêm 1 mục menu (vd `getInstagram`), chạy **1. Tạo sheet & tiêu đề** và tạo nút GET ở sheet mới. Hạn mức tự áp dụng.

## Chia sẻ cho người khác
- **Người ngoài nhóm:** share Sheet quyền Viewer → người đó vào **File → Make a copy** → nhập token Apify riêng qua menu số 2 (bản sao có thể mang theo token của bạn, nên luôn thay bằng token riêng).
- **Người trong nhóm:** share quyền Editor để dùng chung token, credit và hạn mức. Người có quyền Editor xem được token trong **Apps Script → Project Settings → Script Properties**, nên chỉ share cho người tin tưởng.

## Giới hạn
- Không dùng được link trang cá nhân; phải dán link của từng bài.
- Nếu chủ bài ẩn số like / view, ô đó để trống và Engagement rate có thể thấp hơn thực tế.
- Kết quả phụ thuộc Actor của bên thứ ba trên Apify. Nếu Actor đổi format, sửa `buildInput` / `parseItem` của nền tảng đó.
