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

## 4. What still needs to happen (as of October 16, 2026)

**Ella's setup steps** (they unlock what is already built):

- ✓ **Ask about my neighbourhood table:** Ella ran `supabase/neighbourhood-requests.sql` in Supabase on October 16. Nothing more to do.

1. Nothing to upload: everything up to S2 Benchmark price over time (back to 2005, events, "Show me" row) is live on GitHub.
2. In Supabase SQL Editor, run `new-database-tables.sql` (the personal links and views tables).
3. In Vercel environment variables, add `CRON_SECRET` (any long random text).
4. **Past months and Client activity (October 15, pushed):** in Supabase SQL Editor run `supabase/client-activity.sql` (adds the `visits` table and a month for personal links).
5. **Fill in older months** so the month button has something to show. It appears once a report has two or more published months. Each older month needs its GVR Stats Package (and the HPI Benchmark Summary Excel for Neighbourhoods) published at `/admin` like a normal month. Before 2025, the 12-month price chart also needs `data/history.js` extended from the benchmark Excel files (2016–2026, already in `~/Downloads/GVR data/`). Claude asks before downloading anything from the GVR portal.

**UI made, waiting for Ella's go-ahead:**


- **Sections panel:** a recommended order with Summary last (the pictures, numbers and short lines are built, see D6 in §9).
- **Template bar:** one slim line with "Save as template" and a ⋯ menu.
- **Interest rates section:** Bank of Canada rate 2.25%, prime 4.45%, next announcement October 28, step graph, plus an admin "confirm each month" box (rates-ui.png).

**Decided October 15 (built, defaults chosen by Claude because they weren't picked):** past months open on **Last 3 years**, "Send a client one month" starts **off**, and personal-link reports show "<Agent> can see when you open this report and which parts you read." Ella can change any of these.

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

**S2 data, once a year or when GVR re-benchmarks:** `python3 scripts/price-history-from-gvr.py "<folder of HPI Benchmark Summary files>"` rebuilds `data/price-long.js`. New months come in automatically from each month's report, so this isn't monthly work.

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
| 1 | **Key numbers** | Built (Oct 15) | One area: four tiles, Average days on market next to Homes sold. Several areas: one panel with a title on top of each column (Benchmark price · Homes sold · Days on market · Homes for sale), one row per area with the number and a plain red/green change (no bars, houses or pills since Oct 16). Greater Vancouver first. Phone: one block per number. One "Every change is since Sep 2025 ⌄" menu: last month, 1, 3, 5, 10 years (`docs/s1-softer-ui.png`) |
| 2 | **Buyer's or seller's market** | Built | Scale per area and home type. GVR thresholds: below 12% buyer's, 12–20% balanced, above 20% seller's |
| 3 | **Benchmark price over time** (S2) | Built Oct 16 | Every month since January 2005. Opens on 1 year; buttons 1 · 5 · 10 years · All, drag or pinch to zoom, + and −, and a strip to drag back in time. 16 orange event dots ("Introduction of the foreign buyers tax" etc.) with a card and the price a year later. "Show me" row under the chart changes this chart only. Full width by default. Agents can switch events off |
| 4 | **Prices by home type** | Built (Option D, Oct 15) | One layout for one city and several: a one-line story, column titles, one blue bar per row, the red/green % with the dollar change under it, and a key. **One city:** a row per home type. **Several:** tap Detached / Townhouse / Condo; cities from highest price first, Greater Vancouver under a dashed line (`docs/s4-option-d-ui.png`). The blue "Sep 2025 ⌄" under "Change since" is a menu like S1: last month, 1, 3, 5, 10 years (`docs/s4-period-ui.png`) |
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
- **"I'm just looking around"** shrinks the blue picker to a slim bar: "Live in Coquitlam? See how your neighbourhood compares. [Pick mine]". "Pick mine" opens the picker again, and ✕ shrinks it back. The phone remembers this, so the next visit shows the slim bar, not the big box. Tapping a neighbourhood → "Make this my area" also works.
- They pick their neighbourhood once, and their phone remembers it (the neighbourhood and its city, not which city they last looked at).
- **Hero card** (in their own city): price, plus the change in dollars and % vs 1 year and 10 years ago, with a 10-year line.
- **In another city,** their area becomes a slim ★ bar (name, city, price, change). Tapping it goes back to their city.
- **Every neighbourhood, one ranked list:** best to worst. Column titles say what each number is ("Benchmark price today", "How much prices changed in 10 years", "Change"). On a phone the price sits under each name as "Benchmark price $1.12M". Top 10, then "Show all". Their own area is highlighted. This replaced the coloured tiles and "Who grew the most". The city as a whole is **not** in the list (Ella: it's shown everywhere else).
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

- **Settings (⚙ on the Neighbourhoods row), kept short:** "What your clients see" (a switch each for Their neighbourhood, Every neighbourhood, Compare two and Your take; Your take then offers "Written for me" or "In my own words"), "It opens on" (City and Home type; "Clients can always pick another"), and "Your clients" → Personal links. "Neighbourhood shown first" and "Compare with" were taken out of the panel on Oct 16 (saved values still work). Tapping a city card in the dashboard saves it as the city it opens on.
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
| D1 Top bar | Tabs Create report · Clients · Saved reports, Save, Share, Preview | `app.js → drawTop()`, `.dbar` |
| D2 Share menu | Copy link, email, QR, personal links, Instagram post and story, PDF | `app.js → shareDrop()`, `openPreview()`, `personalLinks()` |
| D3 Me menu | Your details, account and billing, your reports, log out | `app.js → meMenu()` |
| D4 Report canvas | The report you edit (drag, bin, select) | `board.js → mountReport()` in edit mode |
| D5 Zoom | − 85% + and fit | `app.js → wireZoom()` |
| D6 Sections panel | iPhone-style grouped list: icon and name for each section. Tapping a row picks it and scrolls the report to it; only the picked row shows ⚙ (settings open right under the row, with Done) and a bin (take it off the report). More sections have "+ Add". Whole report; Your details (`docs/d6-sections-ui.png`) | `app.js → drawPanel()`, `secSettings()`, `tapRow()`, `gear()`, `wirePanel()`, `hoodsPanel()`, `addSec()`, `removeSec()` |
| D7 Template bar | "Save as my template", "Back to the default layout" | `app.js → drawPanel()` footer `.pfoot` |
| D8 Preview window | Post / Story / PDF preview, what's on the image, caption, post to Instagram | `app.js → openPreview()`, `social2.js` |
| D9 Client activity | Now inside P10 Clients (Share → Personal links opens Clients): each client's link, how active they are, opens, reading time, sections, what they looked at, one client's details, the Monday email switch (`docs/activity-ui.png`) | `app.js → personalLinks()`, `activity.js` |
| D10 Month settings | Sections panel → Options → Past months: let clients look at past months, how far back (12 months, 3 years, back to 2016), send a client one month (`docs/months-ui.png`) | `app.js → monthsPanel()` |
| D11 What clients can do | Bottom of the Sections panel: Add other cities, Pick their neighbourhood, Ask you about their neighbourhood, Look at past months; When a client asks (Show it right away / Just tell me); Report opens on (`docs/d11-what-clients-can-do-ui.png`) | `app.js → clientsPanel()`; setting `show.clients` = `{pick, ask, reply}` in `layout.js → cleanClients()` |

**Report (what clients see, `/r/<agent>`):**

| Name | What it is | Code |
|---|---|---|
| R1 Report header | Title, month, agent name and photo | `board.js → draw()` |
| R1.1 Month button | The month under the title (no icon); opens the month list (a sheet on a phone). Shows only with two or more months | `board.js → monthPop()` |
| R1.2 Older month line | "You're looking at March 2024. Changes compare with March 2023." and "See the newest month" | `board.js → oldLine()` |
| R2 Area bar | "Show me: Both areas · Coquitlam · Burnaby North · + Add area" and a line saying what the report shows (docs/r2-area-bar-ui.png) | `board.js → areaBar()` |
| S1 Key numbers | `numbers` | `board.js → R.numbers` |
| S2 Benchmark price over time | `trend` (time buttons, zoom, strip, event dots and card, "Show me" row) | `R.trend`, `C.trend`, `events.js` |
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
| P10 Clients | Top tab (Pro): neighbourhood requests (Send their link / Done, red count on the tab), D9 Client activity with the personal link form, What you sent (`docs/p10-clients-ui.png`) | `app.js → drawClients()` → `personalLinks(host)`; `/api/links` (requests, `action: 'request'`) |
| P11 Saved reports | Top tab: reports kept with **Save** on Create report, by month, Open › (`docs/p11-saved-reports-ui.png`). Replaced "My reports" | `app.js → drawSaved()`, `saveReport()`; `exports` kind `save` |
| E1 Emails | "Report ready" (`admin-publish`), welcome (`stripe-webhook`), Monday "who's actively looking" (`weekly`) |
| I1 Instagram images | `social2.js → calmImage()` |

Labelled pictures: `docs/map-*.png`, and Ella's pinned "Market Update Part Names" page on claude.ai.

---

## 9. Feedback log

Add one line per decision (newest first), so later chats know what was decided and why.

| Date | Part | Decision |
|---|---|---|
| 2026-10-16 | S5 settings (D6) | Ella: too many things. Now three short groups: What your clients see (4 switches), It opens on (city, home type), Your clients (personal links). Removed "Neighbourhood shown first" and "Compare with" from the panel. Mockup `docs/s5-settings-ui.png`. Pushed. |
| 2026-10-16 | S1 Key numbers | Removed "Sold in September" (the band over Homes sold and Days on market, and the one-area label): the column titles already say it. Numbers in the several-area table are softer (600 weight, ~15.5px) and changes are plain red/green arrows like the rest of the report, no filled pills (`docs/s1-softer-ui.png`). |
| 2026-10-16 | S2 Benchmark price over time | **Built and pushed:** "Show me: All 3 areas · Coquitlam · …" row under the chart (option A, `docs/s2-areas-ui.png`). It changes this chart only and says so; tapping the area bar at the top takes over again. |
| 2026-10-15 | S2 Benchmark price over time | **Built:** goes back to January 2005, every month (121 monthly GVR benchmark files from the portal, `~/Downloads/GVR data/monthly`). Past prices follow GVR's current figures (GVR re-benchmarked in May 2022), so the line matches GVR's own 1/3/5/10-year changes. Opens on **1 year** (Ella). 16 events, named "Introduction of …" for new rules (Ella's wording), dots that sit close share one dot with a number. Shaded periods and a Bank of Canada rate line were offered, not decided. Full width by default (was half). Mockup: `docs/s2-timeline-ui.png`. |
| 2026-10-16 | S1 Key numbers | Several areas: **removed the bars and little houses** (Ella). Each row is now just the number and its red/green pill, a bit bigger; the house key and the Greater Vancouver note are gone (`docs/s1-softer-ui.png`). |
| 2026-10-16 | S1 Key numbers | The "since" menu lists only the times: Last month · 1 year ago · 3 years ago · 5 years ago · 10 years ago (no "since", no months). The blue words under each number still say "since Sep 2025 ⌄" (`docs/s1-menu-simple-ui.png`). S4's menu (`data-tper`) still uses the older wording; not changed in this chat. |
| 2026-10-15 | S1 Key numbers | **Built and pushed (several areas):** the three tables didn't line up and were hard to read. Tried a one-table layout, bars, little houses, area cards and rings; Ella said no to rings and to the friendly-card look, liked the houses and bars, and wanted titles on top of each column and simpler. Picked `docs/s1-softer-ui.png`: one panel, titles on top on a light blue band, Homes sold and Days on market together under "Sold in September", bars for price and days on market, little houses for sold and for sale (one house = 10/20/50/100 sold, 100–1,000 for sale, picked so the longest row stays short), changes as red/green pills, one "Every change is since …" menu. Greater Vancouver first row, numbers only (it's about 20× a city). Phone: one block per number. Renamed "days to sell" to **Average days on market** (GVR's term) everywhere. |
| 2026-10-15 | S5 Neighbourhoods | List title "Typical price today" is now "Benchmark price today" (phone: "Benchmark price $1.12M"). |
| 2026-10-15 | R1.1 Month button | Calendar icon removed: the button is just the month and ▾. |
| 2026-10-15 | R1.1, R1.2, D10 Past months | **Built** from `docs/months-ui.png` (approved). Clients pick a year, then a month; months with no report are greyed out. An older month shows a blue line with "See the newest month". Clients always open on the newest month; the URL keeps `?m=2024-03` while they look. Agent settings: on/off (starts on), how far back (12 months, 3 years (default), back to 2016), and "Send a client one month" (starts off; adds "Opens on <month>" to the personal link form). Pro only. The button shows only when two or more months are published, so older months need to be published (see §4). |
| 2026-10-15 | D9 Client activity, E1 Monday email | **Built** from `docs/activity-ui.png` (approved). Personal links window renamed Client activity. Per client: Very active (opened 3+ times this week, or twice with 5+ minutes) / Some interest (opened in 30 days) / Quiet lately / Not opened yet; opens, last open, reading time, read to the end, most-looked-at neighbourhood or month. Last 30 days / Last 7 days / All time. Tap a client: visits per week (8 weeks), time per section, last 5 visits in plain words, "Why it matters" (facts only, no guessing), Send them a note, Copy their link. General link: totals only. Monday email lists very active clients first and names links never opened. Reading time counts only while the page is on screen and the client did something in the last 2 minutes. Visits older than 400 days are removed every Monday. |
| 2026-10-15 | S5 Neighbourhoods | Removed the key line above the list ("Prices went up · Prices went down · A longer bar…"). The column titles stay. |
| 2026-10-15 | S1 Key numbers | With several areas, the change is the last column in all three cards so they line up: Homes sold is now Area · Sold · Days to sell · Change since Sep 2025 ⌄. |
| 2026-10-16 | S5 Ask, D11 | **Changed and pushed (Ella: don't ask for name and email, agents already know their clients):** a **personal link** with picking off shows only the client's own neighbourhood ("Your neighbourhood": price, changes, home type, the agent's take) and under the price "Curious about another neighbourhood? Ask Sarah" → only a neighbourhood menu and **Ask Sarah** ("Sarah will be told it's you"). The **general link** (Instagram, website) asks for the neighbourhood and **one "email or phone"** line, no name. "When a client asks" is now **Show it right away** (a personal link for that neighbourhood is made and opens on their screen; also emailed if they gave an email) / **Just tell me**. We can't email personal-link clients: there's no email in the system. Clients rows: "The Chen family … Their personal link" or "Someone … 604-555-0199" with **Call or text** / **Email** and Done. Table `hood_requests` now has `contact` and `from_link` (SQL safe to run again). |
| 2026-10-16 | P10 Clients, P11 Saved reports, D1 tabs | **Built and pushed.** Top tabs on every page: **Create report · Clients · Saved reports** (Clients only for Pro; Account stays under the agent's photo; old `?view=history` opens Saved reports). **Save** on Create report keeps the report as it is (cities, sections, settings) in Saved reports with "✓ Saved. Find it any time in Saved reports" and Open; saving the same report again only updates its time. Saved reports is a plain list by month: the cities it shows, "Saved today, 9:12am", Open › (opens that saved version as a link; PDF is in Share once open). Clients: requests from S5 Ask first (Send their link makes a personal link if needed and emails it from the agent; Done), then Client activity (the D9 window, now a page; the Personal links buttons go here), and What you sent (links, emails, PDFs, images from history). |
| 2026-10-16 | D11 What clients can do, S5 Ask | **Built and pushed.** Rule: **city** (Coquitlam, Burnaby North) and **neighbourhood** (Westwood Plateau), never "area" in anything people read (R2 "Both cities · + Add city", "How cities compare", "Market Report: 2 cities", "Your neighbourhood" in S5). D11 replaces "Whole report" and D10 Past months: four switches with icons and one grey line each, then "When a client asks" (only when picking is off and asking is on), then "Report opens on" (only with 2+ cities). "How far back" choice removed (stays 3 years). "Send a client one month" switch removed: the personal link form always offers "Opens on" when older months exist. "My name and photo at the top" moved to Your details. With picking off, S5 becomes one blue card "What are homes worth in your neighbourhood?" → form (neighbourhood, name, email, consent line) → `/api/ask`. Send it for me: a personal link is made and emailed from the agent (reply goes to the agent), agent emailed too. Just tell me: agent emailed; request waits for P10. Personal links still show the client's own neighbourhood. Same email within a day doesn't send again; 60 a day per agent; hidden field stops robots. Needs `supabase/neighbourhood-requests.sql`. |
| 2026-10-15 | D6 Sections panel | **Built and pushed (option A):** Ella wanted settings to open only on purpose and under the row, not as a second tap, and fewer controls. Rows are just icon and name (switches and › removed). Tapping a row highlights it (light blue, blue left edge) and scrolls the report to it. Only the picked row shows a blue ⚙ and a red-outlined bin (same bin as on the report); on a computer a faint ⚙ shows on the row under the mouse. ⚙ opens the settings right under that row (Areas, Home types, Title, Size, Move up/down, Done); one open at a time. More sections: "+ Add". Tried and dropped: settings sliding up from the bottom of the panel, a gear on every row (too many), − and + circles (− looks like a browser's minimize), and checkmark circles (busier). |
| 2026-10-15 | D6 Sections panel | **Simplified and pushed (Ella: the picture rows were too much):** like iPhone Settings. Grouped white lists on grey; each row is a small blue icon, the name, a switch and ›. No pictures, numbers or descriptions. **First tap** picks the section (light blue) and scrolls the report to it; **second tap** (or ›) slides to its settings page with "‹ Sections" (Areas, Home types as a checklist, Title, Size, Move up / Move down, red "Remove from report"). On the report, the number and name tags are gone: back to "⠿ Drag to move" on hover and on the picked section. Kept: slide out / slide in when removing or adding, no page jump, Undo. UI: `docs/d6-sections-ui.png`. |
| 2026-10-15 | D6 Sections panel | **Built, then replaced the same day (see above):** each row has a small picture of the section and a number; the same number and name sit on a tag at the top of the section on the report (the tag is also the drag handle). Tapping a row opens its settings right under it (What it shows / How it looks / Up, Down, Remove), replacing the separate Edit screen with Data and Settings tabs; tapping a section on the report opens its row too. Opening a row scrolls the report so that section sits just under the top bar, with a soft blue glow. Removing (switch, Remove, or the bin) no longer makes the page jump: if the section is off screen the report glides to it, it slides out to the right and the gap closes, with an Undo message. Adding (+ Add under "You can add", or "+ Add a section" on the report) glides to the new section, which slides in from the left. Report options moved into a "Whole report" box. Panel is 410px wide. Tried and not chosen: a numbered list with icons (A), a small page map of the report (C), and settings in a pop-out card. UI: `docs/d6-sections-ui.png`. Pushed to GitHub at Ella's request. |
| 2026-10-15 | S1 Key numbers | **Fixed:** with several areas, the Homes sold card's "Change" column now has the "since Sep 2025 ⌄" menu too (all three cards have it). "since …" sits on its own line under "Change" so the Homes sold table fits a phone. |
| 2026-10-15 | S4 Prices by home type | **Built and pushed:** the "Change since Sep 2025" date is a menu, the same blue dashed words as S1 (last month, 1, 3, 5, 10 years; opens on 1 year). The %, the dollars, the sentence and the key all follow it ("higher than in Sep 2016"). S4 keeps its own choice, separate from S1, and keeps it when switching home type. Every time has a number for every home type and area: last month from the price history, 3/5/10 years from GVR's stats package (`D.growth[type]`). `typeChange()` in `charts.js`, with tests. |
| 2026-10-15 | S5 Neighbourhoods | **Built:** list column titles and a key (Ella asked what the number and lines meant); a way back after "I'm just looking around" (slim "Pick mine" bar, remembered on the next visit). Mockups `docs/s5-list-labels-ui.png`, `docs/s5-looking-around-ui.png`. Pushed to GitHub at Ella's request. |
| 2026-10-15 | S1 Key numbers | **Built and pushed:** Ella wanted to change "since Sep 2025" to other times (not a side-by-side compare). Picked option 1 from `docs/s1-change-options-ui.png`: the blue dashed "since Sep 2025 ⌄" words are a menu (last month, 1, 3, 5, 10 years); all changes in S1 move together; it opens on 1 year. Average days to sell moved from Homes for sale into Homes sold (GVR's days on market is for homes that sold). Titles: "Key numbers · <area>", "Average days to sell", "Homes for sale: listed at the end of September" (was "now"), "Change since Sep 2025"; a short line under each number says what it means. Icons next to every title. Price uses `growth.composite` for 3/5/10 years; sold, for sale and days to sell have no history before January 2025, so they say "No number yet for Sep 2021". **Open:** fill 3/5/10 years for those three by adding GVR's old September stats packages (one-time). The first page's sample cards (`index.html`) still say "Homes for sale now". |
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
