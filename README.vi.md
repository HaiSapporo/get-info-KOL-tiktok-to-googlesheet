# TikTok KOL Tracker — Google Sheets + Apps Script + Apify

[English](README.md) | **Tiếng Việt** | [日本語](README.ja.md)

Dán link video TikTok của KOL vào Google Sheet → script tự lấy **Views, Likes, Comments, Shares, Saves**, tính Engagement rate và lưu lịch sử theo ngày.
Không cần cài phần mềm trên máy.

## Cách lấy dữ liệu

```
Google Sheet ──(Apps Script, UrlFetchApp)──► Apify API ──► TikTok
     ▲                                          │
     └──────────── số liệu từng video ◄─────────┘
```

- **Vì sao cần Apify:** TikTok chặn request trực tiếp từ server Google. Kết quả test ngày 30/10/2026: Apps Script nhận về trang chống bot thay vì dữ liệu.
- **Apify actor đang dùng:** [`clockworks/tiktok-scraper`](https://apify.com/clockworks/tiktok-scraper), nhận đầu vào `postURLs`.
- **Chi phí:** khoảng 1,70 USD / 1.000 video. Gói Free của Apify có 5 USD credit mỗi tháng, đủ khoảng 3.000 lượt cập nhật.
- **Cách chạy:** script gửi tối đa 50 link mỗi lần, chờ Apify chạy xong rồi ghi kết quả về Sheet.
- **Bảo mật token:** API token lưu trong Script Properties, không nằm trong code hay Sheet.

**Giới hạn:** link trang cá nhân (`tiktok.com/@kol`) không dùng được. Input phải là link của từng video. Link rút gọn `vt.tiktok.com` / `vm.tiktok.com` thì dùng được.

---

## Phân chia đầu việc

### Giai đoạn 0 — Chuẩn bị (≈30 phút)
| # | Việc | Người làm |
|---|------|-----------|
| 0.1 | Xin IT duyệt việc gửi link video công khai sang Apify (api.apify.com) | Bạn + IT |
| 0.2 | Đăng ký tài khoản tại apify.com (gói Free) | Bạn |
| 0.3 | Lấy token: Apify Console → **Settings → API & Integrations** → copy *Personal API token* | Bạn |
| 0.4 | (Nên làm) Đặt giới hạn chi tiêu trong Apify: **Billing → Usage limits** | Bạn |

### Giai đoạn 1 — Cài đặt & test thử (≈30 phút)
| # | Việc | Kết quả mong đợi |
|---|------|------------------|
| 1.1 | Tạo Google Sheet → **Extensions → Apps Script** → xoá code mặc định, dán toàn bộ `Code.gs` → Save | Lưu được, không lỗi |
| 1.2 | Reload Sheet → menu **TikTok KOL → 1. Tạo sheet & tiêu đề** (lần đầu sẽ hỏi cấp quyền → Allow) | Có sheet `KOL_Tracking`, `Lich_Su` |
| 1.3 | Menu **TikTok KOL → 2. Nhập Apify API token** → dán token | “Đã lưu token” |
| 1.4 | Trong Apps Script chọn hàm `testFetch` → **Run** | Execution log in ra số liệu của video @hannaholala |
| 1.5 | Dán 5–10 link video vào cột A → chọn các dòng → **Cập nhật các dòng đang chọn** | Cột Trạng thái = `OK` |
| 1.6 | Đối chiếu 2–3 video với số trên app TikTok | Khớp (lệch nhỏ do TikTok làm tròn, vd 19.6K) |

### Giai đoạn 1b — Tạo nút GET cho nhân viên (≈5 phút)
| # | Việc |
|---|------|
| 1b.1 | Trong sheet `KOL_Tracking`: **Insert → Drawing** → vẽ hình chữ nhật, gõ chữ **GET** → *Save and Close* |
| 1b.2 | Kéo nút ra chỗ dễ thấy (vd góc phải trên, cạnh vùng tiêu đề) |
| 1b.3 | Bấm vào nút → dấu **⋮** góc trên phải nút → **Assign script** → gõ `getStats` → OK |
| 1b.4 | (Nên làm) **Data → Protect sheets and ranges**: chỉ để nhân viên sửa cột A, các cột số liệu do script ghi |

**Cách nhân viên dùng:** dán 1–20 link video vào **cột A** (mỗi dòng 1 link, từ dòng 2) → bấm **GET** → chờ 1–2 phút → số liệu hiện ở các cột B–L.
- Mỗi lần bấm, script lấy lại số liệu mới nhất cho **tất cả** link trong cột A, và mỗi link tính 1 lượt credit Apify.
- Muốn tiết kiệm thì xoá các link cũ đã xong trước khi dán link mới, hoặc chọn dòng rồi dùng menu **Chỉ lấy các dòng đang chọn**.
- Dòng bị lỗi sẽ được xoá số liệu cũ và ghi lý do ở cột Trạng thái.
- Nút vẽ (Drawing) không bấm được trên app điện thoại; trên điện thoại hãy dùng menu **TikTok KOL → GET** trên trình duyệt.
- Lần đầu mỗi nhân viên bấm nút, Google sẽ hỏi cấp quyền cho script (Allow). Tất cả dùng chung token Apify đã lưu.

### Giai đoạn 2 — Test các trường hợp đặc biệt (≈30 phút)
| Trường hợp | Kết quả mong đợi |
|------------|------------------|
| Link đầy đủ `…/video/ID?lang=en` | OK |
| Link rút gọn `vt.tiktok.com/...` | OK |
| Video đã xoá / riêng tư | `LỖI: NOT_FOUND …` (hoặc mã lỗi Apify khác) |
| Link profile `tiktok.com/@kol` | `LỖI: Đây là link trang cá nhân…` (không tốn credit) |
| Text không phải link TikTok | `LỖI: Không phải link TikTok` (không tốn credit) |
| Token sai / hết credit | `LỖI: Apify HTTP 401/402 …` |
| 100+ link | Chạy theo nhóm 50 link; nếu quá 5 phút thì dừng, bấm lại để chạy tiếp (ưu tiên dòng cũ nhất) |

> Đã kiểm tra: logic ghép kết quả test trên máy với dữ liệu Apify giả lập; gọi Apify thật từ Google Sheet chạy thành công (30/10/2026).

### Giai đoạn 3 — Báo cáo (tuỳ chọn, ≈1–2 giờ)
| # | Việc |
|---|------|
| 3.1 | Sheet `Lich_Su` lưu số liệu mỗi lần bấm GET → dùng Pivot table / Chart để xem tăng trưởng |
| 3.2 | Sheet Dashboard tổng hợp theo KOL bằng `SUMIFS` / Pivot, hoặc nối Looker Studio (miễn phí) |
| 3.3 | Phân quyền: nhân viên chỉ cần quyền Editor trên Sheet |

### Giai đoạn 4 — Vận hành & kiểm soát chi phí
- **Ước tính chi phí:** số link × số lần bấm GET × 1,70 USD / 1.000.
  - Ví dụ: 20 link × 5 lần bấm/ngày × 30 ngày = 3.000 lượt ≈ 5 USD/tháng (nằm trong credit miễn phí).
- **Tiết kiệm:** xoá link đã lấy xong khỏi cột A trước khi dán đợt mới (số liệu cũ vẫn còn trong `Lich_Su`).
- **Theo dõi:** xem cột Trạng thái; các dòng `LỖI` thì chạy lại sau.
- **Đổi nhà cung cấp:** nếu Apify đổi format kết quả hoặc muốn đổi bên khác, chỉ cần sửa `fetchStatsBatch` và `mapResults_`.

## Chia sẻ cho người khác
- **Người ngoài nhóm:** share Sheet quyền Viewer → người đó vào **File → Make a copy** → nhập token Apify riêng qua menu số 2 (bản sao có thể mang theo token của bạn, nên luôn thay bằng token riêng).
- **Người trong nhóm:** share quyền Editor để dùng chung token và credit. Người có quyền Editor xem được token trong **Apps Script → Project Settings → Script Properties**, nên chỉ share cho người tin tưởng.

## Cấu trúc cột `KOL_Tracking`
`Link video | KOL | Video ID | Ngày đăng | Views | Likes | Comments | Shares | Saves | Engagement rate | Cập nhật lúc | Trạng thái`

Engagement rate = (Likes + Comments + Shares + Saves) / Views
