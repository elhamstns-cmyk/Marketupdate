# The Market Update: handoff for a new chat

**How to use this:** start a new chat and paste one of the starter messages at the bottom. Claude reads this file from GitHub. Each chat should cover **one part** (see §8 for part names) so feedback stays focused.

For how the code works, read `ARCHITECTURE.md` in the same folder.

---

## 1. The project in one paragraph

**The Market Update** (themarketupdate.ca) is a paid subscription for Greater Vancouver REALTORS® and mortgage brokers, built by Ella Soltani (RE/MAX Masters). Every month the agent gets a branded market report built from Greater Vancouver REALTORS® (GVR) data. They share it with clients as a link, a client email, Instagram post and story images, a PDF, and personal links for individual clients.

- **Essentials:** $19/month. Greater Vancouver report only.
- **Pro:** $29/month. Every city and neighbourhood, arranging sections, a saved template, images, PDF, Instagram posting, personal links, and a weekly "who's curious" email.

---

## 2. Ella's rules (always follow)

1. **Show UI before code.** For anything visible, make a mockup image first and wait for "go ahead" before building.
2. **Always use red and green for any up or down change:** red for down, green for up. That includes days on market and every section.
3. **One calm, fixed design.** White cards on soft grey, blue accent (#1d4fbf). No choices of fonts, colours or styles. No mixed grey and white text. No overlapping text.
4. **Plain words.** Clients include older people. Use icons or small pictures next to titles so things are easy to recognise.
5. **Automate for agents.** Everything starts on a sensible choice and updates itself every month.
6. **Nothing fake.** No made-up testimonials, numbers or "most popular" claims.
7. **Give step-by-step instructions** whenever Ella has to do something herself.
8. **Never paste or ask for secret keys in chat.** Say "don't send it to me" when a key is involved.
9. **Don't show Ella's personal email to agents.**
10. **Supabase stays on the free plan.** Ella doesn't want to pay for extra services.
11. **Don't push to GitHub unless Ella asks.** Pushing makes it live. Normally deliver a `site-update.zip` that she uploads.
12. **Ask before downloading anything** in her browser. Name the file, where it's from and its size.

---

## 3. Where things are

| What | Where |
|---|---|
| Code repository | **GitHub: github.com/elhamstns-cmyk/Marketupdate** (the copy on Ella's Mac was removed). Claude can read it from GitHub but can't push. Changes come back as a zip that Ella uploads with **Add file → Upload files → Commit changes**. On a Mac, press Cmd+Shift+. so hidden files like `.github` are included. |
| Code guide for AI | `ARCHITECTURE.md` in the repository |
| GVR data files | `~/Downloads/GVR data/` (benchmark Excel files 2016–2026, September 2026 stats package) and the monthly stats packages in `~/Downloads/` |
| GVR members' portal | portal.gvrealtors.ca: Stats Centre, Stats Package, HPI Benchmark Summary Excel. Ella is usually logged in to Chrome. |
| Live site | Vercel + Supabase + Stripe; Instagram is connected |

---

## 4. What still needs to happen (as of October 13, 2026)

**Ella's setup steps** (they unlock what is already built):

1. Upload the latest `site-update.zip`. It includes the 12-month chart fix, the Neighbourhoods fill-in, and adding the Neighbourhoods section to existing saved templates once.
2. In Supabase SQL Editor, run `new-database-tables.sql` (the personal links and views tables).
3. In Vercel environment variables, add `CRON_SECRET` (any long random text).

**UI made, waiting for Ella's go-ahead:**

- **First page:** a white and blue landing page that matches the product (landing-ui.png).
- **Sections panel:** each section with an icon and a short line, and a recommended order with Summary last (sections-ui.png).
- **Template bar:** one slim line with "Save as template" and a ⋯ menu.
- **Interest rates section:** Bank of Canada rate 2.25%, prime 4.45%, next announcement October 28, step graph, plus an admin "confirm each month" box (rates-ui.png).
- **S5 Neighbourhoods with several cities:** city cards instead of the small City box. See §6.1 and `docs/s5-*.png`.

**Ideas shown earlier, not decided:**

- **Supply and demand with several cities.** Claude recommended a 10-house picture per city, with monthly bars kept for a single city.
- **Report content restructure:**
  - Price changes vs last month, since January, vs last year and over the years.
  - Days on market, new listings, homes for sale and sales, each with what it means.
  - All of this per city, per home type and per neighbourhood.
  - With 4 or more areas, switch to a side-by-side table.
- **New sections inspired by bchomestats.com:**
  - Trends graph with range buttons
  - Market summary paragraph
  - Months of supply
  - Sold vs asking
  - Price range and bedroom tables
- **GVR's own buyer's/seller's thresholds** (below 12% is a buyer's market, above 20% a seller's market) and comparisons with the 10-year average.

**Later:**

- PDF redesign to the calm look
- Instagram (Meta) app review: rename the app and enter the `/api/ig-callback` URLs in Meta. The route is switched on.
- Test the first real Instagram post
- Bulk personal links (CSV upload or Follow Up Boss connection)
- Code cleanup: the shared layout rules and the tests are done (`npm test`). Still to do: split `app.js` and `board.js` into smaller files.
- UI library: Lucide icons now, Shoelace or Web Awesome for menus and pop-ups later. Recommended; not decided.

---

## 5. The report sections

Recommended order (proposed, Summary last). The status is for each section.

| # | Section | Status | Notes and open feedback |
|---|---|---|---|
| 1 | **Key numbers** | Built | Price, homes sold, homes for sale, days on market |
| 2 | **Buyer's or seller's market** | Built | Scale per area and home type. GVR thresholds: below 12% buyer's, 12–20% balanced, above 20% seller's |
| 3 | **Typical price over 12 months** | Built | Ella likes this graph. Fixed: every added city now shows; missing history is named under the chart |
| 4 | **Prices by home type** | Built | Detached, townhouse, condo, with pictures. Hide when only one type is chosen (idea) |
| 5 | **Neighbourhoods** | Built (new) | See §6 |
| 6 | **Homes sold each month** | Built | Bars brighten and show the number on hover. The story image has a headline and an insight line |
| 7 | **Long-term price growth** | Built | 3, 5 and 10 years from GVR's stats package |
| 8 | **How areas compare** | Built, off by default | Icons in the column titles; tapping adds or removes an area without the page jumping, with an Undo message |
| 9 | **Contact me** | Built | Photo and a message box for clients |
| 10 | **Summary** | Built | Should be last |
| new | **Interest rates** | UI only | Waiting for go-ahead |

---

## 6. Neighbourhoods (built October 2026)

**What clients see:**

- They pick their neighbourhood once, and their phone remembers it.
- "Your area" stays pinned at the top.
- **Hero card:** price, plus the change in dollars and % vs 1 year and 10 years ago, with a 10-year line.
- **Coloured tiles** for every neighbourhood, with buttons for last month, since January, 1 year and 10 years, and tabs for detached, townhouse and condo.
- **Who grew the most:** ranked bars with a city-average line.
- **Compare two:** the client's own area vs the whole city (the default) or any other neighbourhood.
- **Peek card:** tapping another area slides up a card comparing it with theirs, with "Compare with my area" and "Make this my area".
- **"You also looked at"** and the **agent's take**, written automatically from the numbers, in the agent's own words, or turned off.

**What agents get:**

- Settings for city, the neighbourhood shown first, compare with, home type, which blocks show, and their take. All start on sensible choices.
- **Personal links:** from Share, or from the section settings. Client name plus neighbourhood gives the client their own link, which updates itself every month. The list shows what each client looked at, for example "Looked at Westwood Plateau 3 times".
- **Weekly email** on Monday at 9am, listing which clients looked at other areas. It can be turned off.

**Data:** about 230 neighbourhoods in 19 cities, from GVR's HPI Benchmark Summary Excel (`scripts/hoods-from-gvr.py`). It needs this month's file and January's.

### 6.1 Several cities (UI made October 13, 2026, waiting for go-ahead)

**Ella's feedback:** the City box sits far in the corner and is easy to miss. It doesn't follow the cities picked in R2, so clients think their cities were missed (the demo opens S5 on Vancouver West even when the report is on Greater Vancouver). With 4 cities, showing every neighbourhood at once would be far too many (about 53 tiles).

**Mockups:**

- `docs/s5-cities-ui.png`: desktop, the rules, and a first phone view
- `docs/s5-no-hoods-phone-ui.png`: phone, a city with no neighbourhoods
- `docs/s5-switch-cities-ui.png`: phone, switching between cities

**The design: city cards, one city open at a time.**

- **City cards replace the City box.** They sit right under the title, one per R2 area, in the same order and colour dots as R2. Each card shows the city name, the number of neighbourhoods, and the city's 1-year change (red or green). On desktop it also shows the "Smallest drop" (or biggest gain) neighbourhood. A ★ marks the city where the client's own area is.
- **Only the selected city opens below** (blue card): its tiles, "Who grew the most", "Compare two" and the agent's take, as today.
- **1 city:** no cards. The title says "Neighbourhoods in Coquitlam".
- **On a phone,** the cards scroll sideways like the R2 row, with "swipe for more cities →".

**Which city opens:**

- If the client tapped a city in R2, S5 follows it, with the line "Showing Burnaby North, the area you picked at the top."
- On "Compare all", S5 opens on the client's own city (★). Otherwise it opens on the agent's city, if that's one of the chosen cities, or else the first city with neighbourhoods.
- Tapping a card inside S5 changes only S5. The rest of the report stays the same.
- Adding or removing an area in R2 adds or removes its card.

**Switching cities:**

- When the client is looking at a city other than their own, their area shrinks to a slim pinned ★ bar showing the name, the city, the price and the change.
- A "Port Moody overall" line shows the selected city's own price and change.
- The home type (detached, townhouse or condo) and the period are kept when switching.
- **The peek card works across cities.** Tapping Heritage Woods (Port Moody) while the client's area is Burke Mountain (Coquitlam) compares the two, with a plain sentence such as "about $232,700 more". The buttons stay "Compare with my area" and "Make this my area".
- **Code change needed:** today `S.cmp` and the peek only compare within `S.city`. They need to store a city with each neighbourhood, so "Compare two" can also compare across cities.

**Cities with no neighbourhoods (Greater Vancouver, Whistler):**

- They keep a grey, dashed card: "ⓘ No neighbourhoods". Ella wants them shown, not hidden.
- Tapping one opens a blue message under the cards, with a ✕. It stays until it's closed, rather than vanishing on its own. The client stays on the city they were viewing.
- Greater Vancouver message: "**Greater Vancouver has no neighbourhoods.** It's the whole region, so it is made of cities. Its numbers are in the rest of the report. Pick a city here to see its neighbourhoods."
- Whistler message (Ella's choice; don't mention GVR or "publish"): "**Whistler isn't split into neighbourhoods.** It's a smaller market, so prices are shown for Whistler as a whole in the rest of the report. Want to know about a specific street? Ask me." "Ask me" opens S9 Contact me. Write the Greater Vancouver message in the same pattern when building.
- **Greater Vancouver is the only area:** the section says "Greater Vancouver is the whole region. Choose a city to see its neighbourhoods." It shows a grid of cities, each with its number of neighbourhoods, then "Show all 19 cities". It opens on the agent's city.

This builds on the R2 redesign ("Compare all · city · city", `docs/area-toggle-ui.png`). It also works with today's R2.

---

## 7. Starter messages for new chats

Copy one, fill in the part name from §8, and add your feedback:

- **One part:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. We're working only on **[part name, e.g. S5 Neighbourhoods]**. My feedback: …"
- **First page:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. We're working only on the **first page (landing page)**. The UI is landing-ui.png. My feedback: …"
- **Monthly data:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. Help me publish **[Month] 2026**. The GVR files are in ~/Downloads."

**At the end of each chat**, say: "Update HANDOFF.md with what we decided and give me the upload zip." The next chat then starts from where you left off.

---

## 8. Part names (use these in feedback)

The maps are in `docs/`: `map-dashboard.png` and `map-report.png`.

**Dashboard (Create page, `/app`):**

| Name | What it is | Code |
|---|---|---|
| D1 Top bar | "Your reports / September 2026", Preview | `app.js → drawTop()`, `.dbar` |
| D2 Share menu | Copy link, email, QR, personal links, Instagram post and story, PDF | `app.js → shareDrop()`, `openPreview()`, `personalLinks()` |
| D3 Me menu | Your details, account and billing, your reports, log out | `app.js → meMenu()` |
| D4 Report canvas | The report you edit (drag, bin, select) | `board.js → mountReport()` in edit mode |
| D5 Zoom | − 85% + and fit | `app.js → wireZoom()` |
| D6 Sections panel | The list with on/off switches, Edit (Data and Settings), Add a section, Your details | `app.js → drawPanel()`, `wirePanel()`, `hoodsPanel()` |
| D7 Template bar | "Save as my template", "Back to the default layout" | `app.js → drawPanel()` footer `.pfoot` |
| D8 Preview window | Post / Story / PDF preview, what's on the image, caption, post to Instagram | `app.js → openPreview()`, `social2.js` |
| D9 Personal links window | Client links and what they looked at | `app.js → personalLinks()` |

**Report (what clients see, `/r/<agent>`):**

| Name | What it is | Code |
|---|---|---|
| R1 Report header | Title, month, agent name and photo | `board.js → draw()` |
| R2 Area bar | Area chips, + Add area, "Side by side / One at a time" (redesign proposed: docs/area-toggle-ui.png) | `board.js → areaBar()` |
| S1 Key numbers | `numbers` | `board.js → R.numbers` |
| S2 12-month price | `trend` | `R.trend`, `C.trend` |
| S3 Buyer's or seller's market | `market` | `R.market` |
| S4 Prices by home type | `types` | `R.types` |
| S5 Neighbourhoods | `hoods` (picker, hero, tiles, who grew most, compare, take, peek card) | `hoods.js` |
| S6 Long-term growth | `growth` | `R.growth`, `C.growth` |
| S7 Summary | `summary` | `R.summary`, `summaryPoints()` |
| S8 Homes sold each month | `sold` | `R.sold`, `C.sold` |
| S9 Contact me | `contact` | `R.contact` |
| S10 How areas compare | `compare` (off by default) | `R.compare`, `C.rank` |
| S11 Interest rates | Not built yet (rates-ui.png) | — |

**First page and buying a subscription** (the path a new agent takes, in order):

| Name | What it is | Code |
|---|---|---|
| P1 First page | Before logging in. P1.1 top menu, P1.2 sign-up box, P1.3 sample reports, P1.4 make it yours, P1.5 footer | `public/index.html` |
| P2 Pricing page | "Pricing" in the top menu | `public/plans.html` |
| P3 Sign up / Log in | Step 1 (Account) | `app.js → showLogin()`, `showVerify()`, `showForgot()` |
| P4 Your report preview | Step 2: their details next to their report | `app.js → showPreview()` |
| P5 Choose your plan | Step 3: Essentials or Pro, monthly or yearly | `app.js → showPlans()` |
| P6 Payment | Step 4: Stripe Checkout (Stripe's own page) | `lib/routes/checkout.js` |

**Other pages:**

| Name | Where |
|---|---|
| P7 PDF page | `public/print.html` |
| P8 Share page (story link) | `public/share.html` |
| P9 Admin | `public/admin.html` |
| E1 Emails | "Report ready" (`admin-publish`), welcome (`stripe-webhook`), weekly (`weekly`) |
| I1 Instagram images | `social2.js → calmImage()` |

Labelled pictures: `docs/map-*.png`, and Ella's pinned "Market Update Part Names" page on claude.ai.

---

## 9. Feedback log

Add one line per decision (newest first), so later chats know what was decided and why.

| Date | Part | Decision |
|---|---|---|
| 2026-10-13 | S5 Neighbourhoods | Several cities: city cards replace the City box; one city open at a time; S5 follows R2; the client's area is pinned when switching; the peek card works across cities. Greater Vancouver and Whistler get a grey card and a message when tapped. Whistler wording agreed. UI in `docs/s5-*.png` and §6.1. Waiting for go-ahead to build. |
| 2026-10-13 | R2 Area bar | "Side by side / One at a time" doesn't make sense. Proposed: one row "Show: Compare all · Coquitlam · Burnaby North · + Add area" (docs/area-toggle-ui.png). Waiting for go-ahead. |
| 2026-10-13 | Code | Shared layout rules (`public/js/layout.js`) and automatic checks (`npm test`, which also runs on GitHub) are done. |
