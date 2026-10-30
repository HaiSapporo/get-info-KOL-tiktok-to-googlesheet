# TikTok KOL Tracker — Google Sheets + Apps Script + Apify

**English** | [Tiếng Việt](README.vi.md) | [日本語](README.ja.md)

Paste TikTok video links into a Google Sheet, click **GET**, and get **views, likes, comments, shares and saves** for each video, plus an engagement rate and a history log.

No software to install. It runs entirely inside Google Sheets, which makes it a good fit for locked-down corporate machines.

## Features

- One-click **GET** button: fetches stats for every link in column A.
- Accepts full video links, photo posts and short links (`vt.tiktok.com`, `vm.tiktok.com`, `tiktok.com/t/…`).
- Validates links before calling the API, so profile links and non-TikTok text cost no credits.
- Clear per-row error messages (deleted / private video, invalid link, API errors).
- Engagement rate = (likes + comments + shares + saves) / views.
- Every successful fetch is also appended to a history sheet, so you can chart growth over time.
- The Apify API token is stored in Script Properties, never in the code or the sheet.

## How it works

```
Google Sheet ──(Apps Script, UrlFetchApp)──► Apify API ──► TikTok
     ▲                                          │
     └──────────── stats for each video ◄───────┘
```

- **Why Apify:** TikTok blocks direct requests from Google's servers. When Apps Script fetches a TikTok page itself, it receives an anti-bot challenge page instead of data (tested October 2026).
- **Actor used:** [`clockworks/tiktok-scraper`](https://apify.com/clockworks/tiktok-scraper), with the `postURLs` input.
- **Batching:** links are sent in batches of up to 50 per Apify run. The script waits for each run to finish, then writes the results back to the matching rows.
- **Time limit:** Apps Script stops after 6 minutes, so the script stops starting new batches after 5 minutes. Click GET again to process the remaining rows; rows that were updated longest ago go first.

## Requirements

- A Google account that is allowed to use Apps Script and to connect to external services (`api.apify.com`).
- An [Apify](https://apify.com?fpr=f5khma) account. The Free plan includes USD 5 of credit per month.

## Using Apify

[Apify](https://apify.com?fpr=f5khma) is a cloud platform that runs ready-made scrapers called *Actors*. This tool calls the [`clockworks/tiktok-scraper`](https://apify.com/clockworks/tiktok-scraper) Actor through the Apify API: Google Sheets sends the video links, Apify fetches the data from TikTok on its own servers, and the script reads the results back.

> The sign-up links to apify.com in this README are referral links (`?fpr=f5khma`).

### Create an account

1. Go to [apify.com](https://apify.com?fpr=f5khma) and click **Sign up**.
2. Sign up with Google, GitHub or an email address. No credit card is needed for the Free plan.
3. You land in **Apify Console**, the web dashboard where you manage tokens, runs and billing.

### Get your API token

1. In Apify Console, open **Settings → API & Integrations**.
2. Copy the **Personal API token**.
3. In the Google Sheet, use **TikTok KOL → 2. Nhập Apify API token** and paste it.

Keep the token private: anyone who has it can run Actors and spend your credit. If it leaks, create a new token in the same screen, delete the old one and enter the new token in the sheet.

### Try the Actor in the browser (optional)

You can check that the Actor works before using the sheet:

1. Open the [TikTok Scraper Actor page](https://apify.com/clockworks/tiktok-scraper) and click **Try for free** (or find it in Console → **Store**).
2. In the input form, add a video link to the video URL field (`postURLs`), and leave the video / cover download options turned off.
3. Click **Start**. When the run finishes, the **Output** tab shows fields such as `playCount`, `diggCount`, `commentCount`, `shareCount` and `collectCount`. These are the values the script writes to the sheet.

### Monitor runs and usage

- **Runs:** every click on GET creates one Actor run per batch of up to 50 links. You can see each run, its status, log and results in Console → **Runs**. This is the first place to look when a row shows an Apify error.
- **Usage:** Console → **Billing** shows how much of the monthly credit you have used. Free credit renews every month.
- **Spending cap:** set a limit under **Billing → Usage limits**, especially when several people share one token.

### Pricing and plans

- The Actor charges per result: about **USD 1.70 per 1,000 videos** on the Free plan. Higher Apify plans get lower per-result prices. Check the Actor's **Pricing** tab for current prices.
- The **Free plan** includes USD 5 of credit per month, enough for about 3,000 video lookups.
- When the credit runs out, Apify refuses new runs and the sheet shows `LỖI: Apify HTTP 402 …`. Wait for the monthly reset or upgrade your plan on [apify.com](https://apify.com?fpr=f5khma).
- The script turns off all paid add-ons (video, cover, avatar and subtitle downloads), so you only pay for the basic result.

## Setup

### 1. Get an Apify token

1. Sign up at [apify.com](https://apify.com?fpr=f5khma) (Free plan).
2. Open Apify Console → **Settings → API & Integrations** and copy your **Personal API token**.
3. Recommended: set a spending cap under **Billing → Usage limits**.

See [Using Apify](#using-apify) for details.

### 2. Install the script

1. Create a new Google Sheet.
2. Open **Extensions → Apps Script**, delete the default code, paste the whole of [`Code.gs`](Code.gs) and click **Save**.
3. Reload the sheet. A **TikTok KOL** menu appears.
4. Click **TikTok KOL → 1. Tạo sheet & tiêu đề** (*create sheets & headers*). On first run, Google asks for permission: click **Allow**.
   This creates two sheets: `KOL_Tracking` (main table) and `Lich_Su` (history).
5. Click **TikTok KOL → 2. Nhập Apify API token** (*enter Apify API token*) and paste your token.
6. Optional check: in the Apps Script editor, select `testFetch` and click **Run**. The execution log should print the stats of a sample video.

> If Google shows *"Google hasn't verified this app"*, click **Advanced → Go to … (unsafe)** and then **Allow**. This is normal for a private script that has not been submitted to Google for verification.

### 3. Add the GET button

1. In the `KOL_Tracking` sheet: **Insert → Drawing**, draw a rectangle, type **GET**, then **Save and Close**.
2. Move the button somewhere easy to see.
3. Click the button → the **⋮** menu on it → **Assign script** → type `getStats` → **OK**.
4. Recommended: **Data → Protect sheets and ranges** so that users can only edit column A; the other columns are written by the script.

## Usage

1. Paste 1–20 TikTok video links into **column A**, one per row, starting at row 2.
2. Click **GET** and wait 1–2 minutes.
3. Stats appear in columns B–L. Check the status column (`Trạng thái`): `OK` or `LỖI: …` (*error*) with the reason.

Other menu items:

- **GET — lấy số liệu tất cả link**: same as the button, fetches all links.
- **Chỉ lấy các dòng đang chọn**: fetches only the selected rows.

Notes:

- Every click on GET re-fetches **all** links in column A, and each link uses one Apify result. Remove finished links before pasting a new batch; their numbers stay in the history sheet.
- Drawing buttons do not work in the Google Sheets mobile app. On a phone, open the sheet in a browser and use the **TikTok KOL** menu.

## Sheet layout

`KOL_Tracking` columns (the headers are in Vietnamese):

| Col | Header | Meaning |
|-----|--------|---------|
| A | Link video | Video URL (input) |
| B | KOL (username) | `@username` |
| C | Video ID | TikTok video ID |
| D | Ngày đăng | Posted date |
| E | Views | Play count |
| F | Likes | Like count |
| G | Comments | Comment count |
| H | Shares | Share count |
| I | Saves | Saved / favorited count |
| J | Engagement rate | (likes + comments + shares + saves) / views |
| K | Cập nhật lúc | Last updated at |
| L | Trạng thái | Status: `OK` or `LỖI: …` (error) |

`Lich_Su` (history) gets one row per successful fetch: time, video ID, KOL, views, likes, comments, shares, saves. Use a pivot table or chart on it to track growth.

## Error messages

| Situation | Status shown |
|-----------|--------------|
| Profile link (`tiktok.com/@user`) | `LỖI: Đây là link trang cá nhân…` (this is a profile link, paste a video link). No credits used. |
| Not a TikTok link | `LỖI: Không phải link TikTok`. No credits used. |
| Deleted or private video | `LỖI: NOT_FOUND — …` or another Apify error code |
| Missing token | `LỖI: Chưa nhập Apify API token…` (token not set) |
| Wrong token / out of credit | `LỖI: Apify HTTP 401/402 …` |
| Run took too long | `LỖI: Apify chạy quá lâu…`: click GET again in a few minutes |

When a row fails, its old numbers are cleared so stale data from a previous link is never shown.

## Cost

- The actor is priced at about **USD 1.70 per 1,000 results**. Check the actor's pricing tab for the current price.
- The Apify Free plan includes **USD 5 of credit per month**, about 3,000 results.
- Estimate: number of links × number of GET clicks.
  - Example: 20 links × 5 clicks a day × 30 days = 3,000 results ≈ USD 5 a month.

## Sharing with others

**Option A — each person uses their own copy (recommended for people outside your team)**

1. Share the sheet as **Viewer**.
2. They use **File → Make a copy**; the script, menu and button are copied too.
3. They enter their own Apify token with menu item 2. A copy may carry over your token, so they should always replace it.

**Option B — share one sheet (for your own team)**

- Share as **Editor**; viewers and commenters cannot run the script.
- Everyone uses your token and your Apify credit.
- Editors can open the Apps Script project and see the token in **Project Settings → Script Properties**. Only share with people you trust. If the token leaks, create a new one in Apify and enter it again.

## Limitations

- **Profile links are not supported:** TikTok protects profile pages with an anti-bot check, so the tool cannot list a creator's videos. Paste the link of each video.
- **Rounded numbers:** the TikTok app rounds large numbers (e.g. 19.6K); the sheet shows exact values.
- **Data provider:** results depend on the Apify actor. If it changes its output format, or you switch provider, update `fetchStatsBatch` and `mapResults_` in `Code.gs`.

## Project files

| File | Description |
|------|-------------|
| [`Code.gs`](Code.gs) | The Apps Script code: menu, GET button, Apify client, sheet writer |
| [`README.md`](README.md) | English documentation |
| [`README.vi.md`](README.vi.md) | Vietnamese documentation, including the project task plan |
| [`README.ja.md`](README.ja.md) | Japanese documentation |
