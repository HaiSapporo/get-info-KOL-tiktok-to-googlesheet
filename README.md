# Social Analysis — Google Sheets + Apps Script + Apify

**English** | [Tiếng Việt](README.vi.md) | [日本語](README.ja.md)

Paste social media post links into a Google Sheet, click **GET**, and get the engagement numbers of each post, plus an engagement rate and a history log.

Supported platforms:

| Platform | Sheet | Numbers collected |
|----------|-------|-------------------|
| TikTok | `TikTok` | Views, likes, comments, shares, saves |
| Threads | `Threads` | Views, likes, replies, reposts, quotes, shares |

More platforms can be added later (see [Adding a platform](#adding-a-platform)).

No software to install. Everything runs inside Google Sheets, which makes it a good fit for locked-down corporate machines.

## Features

- One **GET** button per sheet: fetches stats for every link in column A of that platform's sheet.
- A separate history sheet per platform (`TikTok_LichSu`, `Threads_LichSu`) that logs every successful fetch.
- **Usage limits:** at most **500 links per day** and **2,000 links per month** across all platforms, to keep Apify costs under control.
- Links are checked before calling the API: profile links, links from another site and duplicates cost nothing.
- The same post pasted twice, or in two URL forms (e.g. `threads.net` and `threads.com`), is fetched and counted only once.
- Clear per-row status messages; a failed row has its old numbers cleared.
- The Apify API token is stored in Script Properties, never in the code or the sheet.

## How it works

```
Google Sheet ──(Apps Script, UrlFetchApp)──► Apify API ──► TikTok / Threads
     ▲                                          │
     └──────────── stats for each post ◄────────┘
```

- **Why Apify:** social platforms block direct requests from Google's servers. When Apps Script fetches a TikTok page itself, it receives an anti-bot challenge page instead of data (tested October 2026).
- **Actors used:**

  | Platform | Apify Actor | Price (Free plan) |
  |----------|-------------|-------------------|
  | TikTok | [`clockworks/tiktok-scraper`](https://apify.com/clockworks/tiktok-scraper) | about USD 1.70 / 1,000 posts |
  | Threads | [`lergassy/threads-scraper`](https://apify.com/lergassy/threads-scraper) | about USD 2.00 / 1,000 posts |

- **Batching:** links are sent in batches of up to 50 per Apify run. The script waits for each run, then writes the results back to the matching rows.
- **Time limit:** Apps Script stops after 6 minutes, so the script stops starting new batches after 5 minutes. Click GET again to process the remaining rows; rows updated longest ago go first.

## Requirements

- A Google account that is allowed to use Apps Script and to connect to external services (`api.apify.com`).
- An [Apify](https://apify.com?fpr=f5khma) account. The Free plan includes USD 5 of credit per month.

## Using Apify

[Apify](https://apify.com?fpr=f5khma) is a cloud platform that runs ready-made scrapers called *Actors*. This tool calls one Actor per platform through the Apify API: Google Sheets sends the post links, Apify fetches the data on its own servers, and the script reads the results back.

> The sign-up links to apify.com in this README are referral links (`?fpr=f5khma`).

### Create an account

1. Go to [apify.com](https://apify.com?fpr=f5khma) and click **Sign up**.
2. Sign up with Google, GitHub or an email address. No credit card is needed for the Free plan.
3. You land in **Apify Console**, the web dashboard where you manage tokens, runs and billing.

### Get your API token

1. In Apify Console, open **Settings → API & Integrations**.
2. Copy the **Personal API token**.
3. In the Google Sheet, use **Social Analysis → 2. Nhập Apify API token** and paste it.

Keep the token private: anyone who has it can run Actors and spend your credit. If it leaks, create a new token in the same screen, delete the old one and enter the new token in the sheet.

### Try an Actor in the browser (optional)

1. Open the Actor page ([TikTok](https://apify.com/clockworks/tiktok-scraper) or [Threads](https://apify.com/lergassy/threads-scraper)) and click **Try for free**.
2. Add one post link to the post URL field (`postURLs` for TikTok, `postUrls` for Threads).
3. Click **Start**. When the run finishes, the **Output** tab shows the numbers the script writes to the sheet.

### Monitor runs and usage

- **Runs:** every click on GET creates one Actor run per batch of up to 50 links. See each run, its status, log and results in Console → **Runs**. This is the first place to look when a row shows an Apify error.
- **Usage:** Console → **Billing** shows how much of the monthly credit you have used. Free credit renews every month.
- **Spending cap:** set a limit under **Billing → Usage limits**, especially when several people share one token. This works together with the sheet's own daily / monthly link limits.

### Pricing and plans

- Both Actors charge per result. Check each Actor's **Pricing** tab for current prices; higher Apify plans get lower per-result prices.
- The **Free plan** includes USD 5 of credit per month: about 2,500–3,000 posts.
- When the credit runs out, Apify refuses new runs and the sheet shows `LỖI: Apify HTTP 402 …`. Wait for the monthly reset or upgrade your plan on [apify.com](https://apify.com?fpr=f5khma).
- The script turns off paid add-ons (video / image downloads, subtitles, profile rows, replies), so you only pay for the post itself.

## Setup

### 1. Install the script

1. Create a new Google Sheet (or open the one you used with version 1.x).
2. Open **Extensions → Apps Script**, delete the existing code, paste the whole of [`Code.gs`](Code.gs) and click **Save**.
3. Reload the sheet. A **Social Analysis** menu appears.
4. Click **Social Analysis → 1. Tạo sheet & tiêu đề** (*create sheets & headers*). On first run, Google asks for permission: click **Allow**.
   This creates `TikTok`, `TikTok_LichSu`, `Threads` and `Threads_LichSu`.
5. Click **Social Analysis → 2. Nhập Apify API token** (*enter Apify API token*) and paste your token.
6. Optional check: in the Apps Script editor, select `testTikTok` or `testThreads` and click **Run**. The execution log should print the stats of a sample post.

> If Google shows *"Google hasn't verified this app"*, click **Advanced → Go to … (unsafe)** and then **Allow**. This is normal for a private script that has not been submitted to Google for verification.

### 2. Add a GET button on each platform sheet

1. Open the `TikTok` sheet: **Insert → Drawing**, draw a rectangle, type **GET**, then **Save and Close**.
2. Click the button → the **⋮** menu on it → **Assign script** → type `getStats` → **OK**.
3. Repeat on the `Threads` sheet. `getStats` always works on the sheet that is open, so every button uses the same function.
4. Recommended: **Data → Protect sheets and ranges** so that users can only edit column A.

### Upgrading from version 1.x (TikTok KOL Tracker)

Paste the new `Code.gs` and run **1. Tạo sheet & tiêu đề** once. The old sheets `KOL_Tracking` and `Lich_Su` are renamed to `TikTok` and `TikTok_LichSu`; data, columns and the existing GET button keep working. The token you saved before is kept.

## Usage

1. Open the sheet of the platform (`TikTok` or `Threads`).
2. Paste post links into **column A**, one per row, starting at row 2.
3. Click **GET** and wait 1–2 minutes.
4. Numbers appear in the following columns. Check the status column (`Trạng thái`).

Menu **Social Analysis**:

| Menu item | What it does |
|-----------|--------------|
| GET — sheet đang mở | Fetch all links on the open sheet (same as the button) |
| GET — TikTok / GET — Threads | Fetch all links on that platform's sheet |
| Chỉ lấy các dòng đang chọn | Fetch only the selected rows |
| Xem hạn mức đã dùng | Show how many links have been used today and this month |

Notes:

- Every click on GET re-fetches **all** links on the sheet. Remove finished links before pasting a new batch; their numbers stay in the history sheet.
- Drawing buttons do not work in the Google Sheets mobile app. On a phone, open the sheet in a browser and use the menu.

## Usage limits

To avoid unexpected costs, the script counts the links it sends to Apify, for all platforms together:

| Limit | Default | Setting in `Code.gs` |
|-------|---------|----------------------|
| Per day | 500 links | `CONFIG.QUOTA_DAILY` |
| Per month | 2,000 links | `CONFIG.QUOTA_MONTHLY` |

- Counting follows the script's time zone (**Apps Script → Project Settings → Time zone**).
- Invalid links and duplicates are not counted. If Apify refuses to start a run (wrong token, no credit), the links are given back.
- When a limit is reached, the remaining rows show `CHƯA CHẠY: hết hạn mức ngày …` (*not run: daily limit reached*) or `… hạn mức tháng …` (*monthly limit*). They keep their previous numbers; click GET again the next day / month.
- The counter is shared by everyone using the same sheet.

## Sheet layout

Platform sheet columns (headers are in Vietnamese):

| Col | Header | Meaning |
|-----|--------|---------|
| A | Link bài đăng | Post URL (input) |
| B | Tài khoản | `@username` |
| C | Post ID | Video ID (TikTok) or post code (Threads) |
| D | Ngày đăng | Posted date |
| E… | *metrics* | TikTok: Views, Likes, Comments, Shares, Saves<br>Threads: Views, Likes, Replies, Reposts, Quotes, Shares |
| … | Engagement rate | Sum of all interactions / views |
| … | Cập nhật lúc | Last updated at |
| … | Trạng thái | Status: `OK`, `LỖI: …` (error) or `CHƯA CHẠY: …` (not run) |

History sheets (`<Platform>_LichSu`) get one row per successful fetch: time, post ID, account and all metrics. Use a pivot table or chart to track growth.

If a creator hides a number (for example likes on Threads), that cell is left empty instead of showing 0.

## Status messages

| Situation | Status shown |
|-----------|--------------|
| Profile link | `LỖI: Đây là link trang cá nhân…` (profile link, paste a post link). Not counted. |
| Link from another site | `LỖI: Không phải link TikTok / Threads`. Not counted. |
| Deleted or private post | `LỖI: NOT_FOUND — …` or another Apify error code |
| Missing token | Error dialog: `Chưa nhập Apify API token…` |
| Wrong token / out of credit | `LỖI: Apify HTTP 401/402 …` |
| Daily / monthly limit reached | `CHƯA CHẠY: hết hạn mức …` |
| Run took too long | `CHƯA CHẠY: hết thời gian…` or `LỖI: Apify chạy quá lâu…`: click GET again |

## Adding a platform

All platform-specific logic lives in the `PLATFORMS` object in `Code.gs`. To add one (for example Instagram or YouTube), add an entry with:

| Field | Purpose |
|-------|---------|
| `name`, `sheet`, `historySheet` | Display name and sheet names |
| `actor` | Apify Actor ID, written as `owner~actor-name` |
| `metrics` | List of `{ key, label }`: the number columns |
| `engagement(stats)` | Engagement rate formula |
| `extractId(link)` | Post ID from a URL (used to match results and remove duplicates) |
| `validate(link)` | Returns an error message for a bad link, or `null` |
| `buildInput(links)` | Actor input for a batch of links |
| `parseItem(item)` | Converts one Actor result into `{ keys, value }` |

Then add a menu item (for example `getInstagram`), run **1. Tạo sheet & tiêu đề** and add a GET button on the new sheet. Usage limits apply automatically.

## Sharing with others

**Option A — each person uses their own copy (recommended for people outside your team)**

1. Share the sheet as **Viewer**.
2. They use **File → Make a copy**; the script, menu and buttons are copied too.
3. They enter their own Apify token with menu item 2. A copy may carry over your token, so they should always replace it.

**Option B — share one sheet (for your own team)**

- Share as **Editor**; viewers and commenters cannot run the script.
- Everyone uses your token, your Apify credit and the same usage limits.
- Editors can open the Apps Script project and see the token in **Project Settings → Script Properties**. Only share with people you trust. If the token leaks, create a new one in Apify and enter it again.

## Limitations

- **Profile links are not supported:** paste the link of each post.
- **Rounded numbers:** the apps round large numbers (e.g. 19.6K); the sheet shows exact values.
- **Hidden counts:** if the creator hides likes or views, those cells stay empty and the engagement rate may be lower than reality.
- **Data providers:** results depend on third-party Apify Actors. If one changes its output format, update that platform's `buildInput` / `parseItem`.

## Project files

| File | Description |
|------|-------------|
| [`Code.gs`](Code.gs) | The Apps Script code: platforms, menu, GET button, usage limits, Apify client |
| [`README.md`](README.md) | English documentation |
| [`README.vi.md`](README.vi.md) | Vietnamese documentation, including the project task plan |
| [`README.ja.md`](README.ja.md) | Japanese documentation |
