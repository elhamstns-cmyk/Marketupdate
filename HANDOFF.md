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
3. **One calm, fixed design.** White cards on soft grey, blue accent (#1d4fbf), on every page including those before login. No green anywhere. Logo: the house-and-bars mark (`public/img/logo-mark.svg`). No choices of fonts, colours or styles. No mixed grey and white text. No overlapping text.
4. **Plain words.** Clients include older people. Use icons or small pictures next to titles so things are easy to recognise.
5. **Automate for agents.** Everything starts on a sensible choice and updates itself every month.
6. **Nothing fake.** No made-up testimonials, numbers or "most popular" claims.
7. **Give step-by-step instructions** whenever Ella has to do something herself.
8. **Never paste or ask for secret keys in chat.** Say "don't send it to me" when a key is involved.
9. **Don't show Ella's personal email to agents.**
10. **Supabase stays on the free plan.** Ella doesn't want to pay for extra services.
11. **Claude commits and pushes to GitHub itself** (Ella connected GitHub on October 15, 2026). Pushing makes it live, so push only after Ella says "go ahead" on the UI and `npm test` passes. Always pull the latest from GitHub first, so one chat never undoes another. No more zips to upload.
12. **Ask before downloading anything** in her browser. Name the file, where it's from and its size.
13. **Counts read like a person wrote them.** Never "9 of 9": say "all 9", "both", "no neighbourhood" or "the only one". In code, use `countPhrase()` from `hoods.js`.

---

## 3. Where things are

| What | Where |
|---|---|
| Code repository | **GitHub: github.com/elhamstns-cmyk/Marketupdate** (the copy on Ella's Mac was removed). Claude commits and pushes directly (connected October 15, 2026). |
| Code guide for AI | `ARCHITECTURE.md` in the repository |
| GVR data files | `~/Downloads/GVR data/` (benchmark Excel files 2016–2026, September 2026 stats package) and the monthly stats packages in `~/Downloads/` |
| GVR members' portal | portal.gvrealtors.ca: Stats Centre, Stats Package, HPI Benchmark Summary Excel. Ella is usually logged in to Chrome. |
| Live site | Vercel + Supabase + Stripe; Instagram is connected |

---

## 4. What still needs to happen (as of October 15, 2026)

**Ella's setup steps** (they unlock what is already built):

1. Nothing to upload: everything up to R2 "Show me", S8 Homes sold and S4 Prices by home type is live on GitHub.
2. In Supabase SQL Editor, run `new-database-tables.sql` (the personal links and views tables).
3. In Vercel environment variables, add `CRON_SECRET` (any long random text).

**UI made, waiting for Ella's go-ahead:**

- **S5 list labels:** column titles ("Typical price today", "How much prices changed in 10 years", "Change"), a key (green up, red down, longer bar = bigger change), and "Price today" under each name on a phone (`docs/s5-list-labels-ui.png`). Ella asked what the number and the lines meant.
- **Sections panel:** each section with an icon and a short line, and a recommended order with Summary last (sections-ui.png).
- **Template bar:** one slim line with "Save as template" and a ⋯ menu.
- **Interest rates section:** Bank of Canada rate 2.25%, prime 4.45%, next announcement October 28, step graph, plus an admin "confirm each month" box (rates-ui.png).

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
| 4 | **Prices by home type** | Built (Option D, Oct 15) | One layout for one city and several: a one-line story, column titles ("Typical price today", "Change since September 2025"), one blue bar per row, the red/green % with the dollar change under it, and a key. **One city:** a row per home type. **Several:** tap Detached / Townhouse / Condo; cities from highest price first, Greater Vancouver under a dashed line as the yardstick (`docs/s4-option-d-ui.png`) |
| 5 | **Neighbourhoods** | Built | City cards, ranked list, 5 time buttons. See §6 |
| 6 | **Homes sold each month** | Built | One area: bars that brighten and show the number on hover. **Several areas (Oct 14):** a one-line story, Greater Vancouver on its own row, every city's bars side by side with a Bars / Lines switch, and each city's number and change from a year ago under the chart (`docs/s8-cities-ui.png`). Idea not decided: a "When do homes sell?" busy-season grid |
| 7 | **Long-term price growth** | Built | 3, 5 and 10 years from GVR's stats package |
| 8 | **How areas compare** | Built, off by default | Icons in the column titles; tapping adds or removes an area without the page jumping, with an Undo message |
| 9 | **Contact me** | Built | Photo and a message box for clients |
| 10 | **Summary** | Built | Should be last |
| new | **Interest rates** | UI only | Waiting for go-ahead |

---

## 6. Neighbourhoods (built October 2026, several cities added October 13)

**What clients see:**

- **City cards** at the top: one per area picked in R2, in the same order and colour dots. Each card shows the number of neighbourhoods with prices for the chosen home type and the city's change for the chosen period. On a computer it also shows "Grew most" or "Smallest drop". A ★ after the name marks the city with the client's own area. One city is open at a time. On a phone the cards scroll sideways.
- They pick their neighbourhood once, and their phone remembers it (the neighbourhood and its city, not which city they last looked at).
- **Hero card** (in their own city): price, plus the change in dollars and % vs 1 year and 10 years ago, with a 10-year line.
- **In another city,** their area becomes a slim ★ bar (name, city, price, change). Tapping it goes back to their city.
- **Every neighbourhood, one ranked list:** best to worst, with the price, a red or green bar from a zero line, and the change. Top 10, then "Show all". Their own area is highlighted. This replaced the coloured tiles and "Who grew the most". The city as a whole is **not** in the list (Ella: it's shown everywhere else).
- **Time buttons:** Since January · 1 year · 3 years · 5 years · 10 years (short labels on a phone). It opens on **5 years**. "Last month" was removed because small neighbourhoods jump around too much.
- **Compare two:** their own area vs the whole city (the default) or any neighbourhood in any city that has a card.
- **Peek card:** tapping a neighbourhood slides up a card comparing it with theirs, also across cities ("about $232,700 more than Burke Mountain (Coquitlam)"), with "Compare with my area" and "Make this my area".
- **"You also looked at"** and the **agent's take**, written automatically from the numbers, in the agent's own words, or turned off.

**Which city opens** (it only ever opens on a city that has a card):

1. A personal link's city.
2. The client's own city, when it's one of the R2 areas.
3. An area tapped in R2 ("Show me: Burnaby North"). S5 follows it, with "Showing Burnaby North, the area you picked at the top."
4. The agent's "City shown first", when it's one of the R2 areas.
5. The first R2 area with neighbourhoods.

- Tapping a card inside S5 changes only S5. Adding or removing an area in R2 adds or removes its card.
- If the client's own city isn't one of the R2 areas, it still gets a card (at the end) so they can get back to it.
- **1 city:** no cards, and the title says "Neighbourhoods in Coquitlam".
- **No R2 area has neighbourhoods** (Greater Vancouver alone): "Greater Vancouver is the whole region. Choose a city to see its neighbourhoods." A grid of 6 cities, then "Show all 19 cities". It opens on the agent's city, else Vancouver West.

**Cities with no neighbourhoods (Greater Vancouver, Whistler):** a grey dashed card, "ⓘ No neighbourhoods". Tapping it opens a message under the cards that stays until ✕ is tapped, and the open city doesn't change.

- Greater Vancouver: "**Greater Vancouver isn't split into neighbourhoods.** It's the whole region, made up of cities. Its numbers are in the rest of the report. Tap a city here to see its neighbourhoods."
- Whistler (Ella's wording): "**Whistler isn't split into neighbourhoods.** It's a smaller market, so prices are shown for Whistler as a whole in the rest of the report. Want to know about a specific street? Ask me." "Ask me" scrolls to S9 Contact me (shown only when that section is on).

**Why (Ella's feedback, October 13):** the old City box sat far in the corner and was easy to miss. It didn't follow R2, so clients thought their cities were missed (a report on Greater Vancouver, Coquitlam, West Vancouver and North Vancouver opened on Port Moody, from the browser's memory or an old agent setting). All the neighbourhoods of 4 cities at once would be about 53 tiles, too many to read. Mockups: `docs/s5-*.png`.

**What agents get:**

- Settings for "City shown first" (used when it's one of the report's areas, or when the report is only Greater Vancouver), the neighbourhood shown first, compare with, home type, which blocks show (their neighbourhood, every neighbourhood, compare two, their take), and their take. All start on sensible choices. Tapping a city card in the dashboard saves it as "City shown first".
- **Personal links:** from Share, or from the section settings. Client name plus neighbourhood gives the client their own link, which updates itself every month. The list shows what each client looked at, for example "Looked at Westwood Plateau 3 times".
- **Weekly email** on Monday at 9am, listing which clients looked at other areas. It can be turned off.

**Data:** about 230 neighbourhoods in 19 cities, from GVR's HPI Benchmark Summary Excel (`scripts/hoods-from-gvr.py`). It needs this month's file and January's. Every neighbourhood has since January, 1, 3, 5 and 10-year changes.

---

## 7. Starter messages for new chats

Copy one, fill in the part name from §8, and add your feedback:

- **One part:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. We're working only on **[part name, e.g. S5 Neighbourhoods]**. My feedback: …"
- **First page:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. We're working only on the **first page (landing page)**. The UI is landing-ui.png. My feedback: …"
- **Monthly data:** "Read HANDOFF.md and ARCHITECTURE.md from github.com/elhamstns-cmyk/Marketupdate. Help me publish **[Month] 2026**. The GVR files are in ~/Downloads."

**At the end of each chat**, say: "Update HANDOFF.md with what we decided and push it." The next chat then starts from where you left off.

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
| R2 Area bar | "Show me: Both areas · Coquitlam · Burnaby North · + Add area" and a line saying what the report shows (docs/r2-area-bar-ui.png) | `board.js → areaBar()` |
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
| P1 First page | Before logging in. P1.1 top menu, P1.2 sign-up box with the real report preview, P1.3 sample reports, P1.4 ready to share (3 steps), P1.5 footer | `public/index.html` |
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
| 2026-10-15 | S1 Key numbers, all sections | **Built and pushed:** Ella: say "benchmark price", never "typical". Every "Typical home price" / "Typical price" / "the typical home is…" is now "Benchmark price" across S1–S10, the area table, Instagram images and caption, PDF, CSV export, first page preview and dashboard hints. No "typical" left in the site's words. |
| 2026-10-15 | Whole site, P1–P5, emails | **Built and pushed:** every page before login now uses the report's white and blue (the old green is gone; `site.css` base colours changed, so Pricing, Privacy, Terms and the sign-up steps follow). The dashboard's brighter blue `#2f6fe0` became the report's `#1d4fbf`. New logo picked by Ella: **B, house and bars** (`docs/logo-options-ui.png`), in the top menu of every page, the browser tab, and at the top of all three emails (`emailLogo()` in `lib/util.js`, PNG because email apps don't show SVG). New first page (`docs/landing-ui.png`): white and blue, the real report drawn in the preview (updates itself every month), three sample agents with one real number each, 3 steps, footer. Removed every "your own colours, fonts and styles" promise (Pricing, plan step, README); Pro now lists its real features. Pro badge reads "Includes every city" instead of "Recommended". New checks: first page draws, and no green on /, /plans, /privacy, /terms. |
| 2026-10-15 | S4 Prices by home type | **Built Option D** (picked from options A–G: `docs/s4-one-city-options-ui.png`, `docs/s4-cities-options-ui.png`). Ella: put something over the red numbers so people know what the change is from. Added the column title "Change since September 2025" ("Sep 2025" on a phone), the dollar change under each %, and a key. One city uses the same layout with home types as rows. Bars are all the report's blue (city colour only on the dot) so green still only means up. Tabs use the same style as Long-term growth. Areas with no price for a type say "Not enough sales to publish a price" and go to the bottom. Stories: `typesStoryOne()`, `typesStoryAreas()` in `charts.js`, with tests. |
| 2026-10-15 | D2 Share menu | **Fixed:** on a phone the Share menu opened half off the left edge of the screen (it lined up with the Share button's right edge and was wider than the space to its left). Now `fitMenu()` in `app.js` keeps the Share and Me menus on screen: full width under the button on a phone, lined up with the button on a computer, scrolls if it's taller than the screen, and closes when the phone is turned. Test added. |
| 2026-10-15 | Process | GitHub connected: Claude commits and pushes itself (after go-ahead and passing tests), always starting from the latest GitHub version. No more site-update.zip. |
| 2026-10-14 | R2 Area bar | **Built:** "Side by side / One at a time" replaced. One row: "Show me: Both areas (All 3 areas for 3+) · each area · + Add area". Tapping an area shows the whole report for it; a line under the row says "Every section below compares Coquitlam and Burnaby North" or "…is about Coquitlam only. Tap Both areas to compare." The ✕ shows only on the selected area. On a phone the row scrolls sideways. Dashboard setting renamed "When clients open the report, show: All areas together / The first area" (saved values `side`/`one` unchanged). UI: `docs/r2-area-bar-ui.png`. |
| 2026-10-14 | S8 Homes sold | **Built:** with several areas, every city at once instead of one at a time. One-line story written from the numbers; Greater Vancouver on its own row (it sells about 10 times more than a city and squashed the bars); city bars side by side, with a Bars / Lines switch (opens on Bars); under the chart, each city's number and red/green change "vs September 2025". Phone and half-width cards show the last 6 months. Tried and dropped: a table under the chart, last-year circles on the lines, and house/calendar icons (too much). Ella liked the busy-season grid (option D); it can't be per neighbourhood because GVR publishes only prices for neighbourhoods. Not decided where it goes. |
| 2026-10-14 | S5 Neighbourhoods | Removed the "<City> overall" row from the ranked list. The take now says "all 9 neighbourhoods" instead of "9 of 9" (`countPhrase()`, with a test). City cards count only neighbourhoods with prices for the chosen home type. |
| 2026-10-13 | S5 Neighbourhoods | **Built:** city cards (one city open at a time, follow R2, only open on a city that has a card), one ranked list instead of the tiles and "Who grew the most", time buttons Since January · 1 · 3 · 5 · 10 years (opens on 5 years; "Last month" dropped), comparisons across cities. In site-update.zip. |
| 2026-10-13 | S5 Neighbourhoods | Several cities: city cards replace the City box; one city open at a time; S5 follows R2; the client's area is pinned when switching; the peek card works across cities. Greater Vancouver and Whistler get a grey card and a message when tapped. Whistler wording agreed. UI in `docs/s5-*.png`. |
| 2026-10-13 | R2 Area bar | "Side by side / One at a time" doesn't make sense. Proposed: one row "Show: Compare all · Coquitlam · Burnaby North · + Add area" (docs/area-toggle-ui.png). Waiting for go-ahead. |
| 2026-10-13 | Code | Shared layout rules (`public/js/layout.js`) and automatic checks (`npm test`, which also runs on GitHub) are done. |
