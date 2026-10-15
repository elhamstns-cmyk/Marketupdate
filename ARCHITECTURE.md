# The Market Update: codebase guide for AI agents

Read this file first. It explains what the product does, how the code is organised, how data flows, the conventions to follow, and where to add new features. It reflects the code as of October 2026.


---

## 1. What the product is

**The Market Update** (themarketupdate.ca) is a paid subscription for Greater Vancouver REALTORS® and mortgage brokers. Every month, the agent gets a market report with their name, photo and contact details on it, built from Greater Vancouver REALTORS® (GVR) statistics. Agents share it as:

- **One link** (`/r/<agent-slug>`) that always shows the newest month
- A **client email** draft
- **Instagram images**: a 1080×1080 post and a 1080×1920 story. Agents can download them or post straight to Instagram.
- A **PDF** (the print page)
- **Personal links** (`/r/<slug>?p=<id>`): one per client, with the client's name and neighbourhood

**Plans** (prices live in `lib/util.js` → `PLANS`):

| Plan | Price | What it includes |
|---|---|---|
| Essentials (`basic`) | $19/mo, $190/yr | Greater Vancouver report only; link and email |
| Pro (`pro`) | $29/mo, $290/yr | Every city and neighbourhood, arranging sections, saved template, images, PDF, Instagram, personal links, weekly "who's curious" email |

**People involved:**

- **Agent:** the subscriber. Uses `/app`, called "the Create page" or "dashboard".
- **Client:** the agent's customer. Opens the public report.
- **Admin:** the owner. Publishes each month's data at `/admin`.

---

## 2. Tech stack and constraints

- **Front end:** plain HTML, CSS and native ES modules in `public/`. No framework, no bundler, no npm packages. Pages import `/js/*.js` directly.
- **Back end:** Vercel serverless (Node 18+ ESM). **Exactly one function**, `api/[fn].js`, routes `/api/<name>` to `lib/routes/<name>.js`. The Vercel Hobby plan allows only 12 functions, so **never add files under `api/`**. Add a route file and register it in the router instead.
- **Database, auth and storage:** Supabase.
  - The server talks to Postgres through the REST API (PostgREST) using the **service key** (`lib/util.js → db()`).
  - The browser talks to Supabase **Auth** directly (`/auth/v1/*` with the anon key) to sign in. It sends the access token to `/api/*` as `Authorization: Bearer …`.
  - Row level security is on for all tables and there are no public policies. Only the server reads and writes tables.
  - Storage bucket `social` is public. Instagram fetches images from it.
- **Payments:** Stripe REST through `fetch` (`util.stripe()`): Checkout, the customer portal, and a webhook with a hand-written signature check.
- **Email:** a raw SMTP client in `lib/smtp.js` (TLS, port 465, Google Workspace app password).
  - `.env.example` still mentions `RESEND_API_KEY`, which is **outdated**. The real settings are `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` and optional `SMTP_HOST`.
- **Instagram:** "Instagram API with Instagram Login" (graph.instagram.com v21.0), handled in `lib/routes/instagram.js`.
- **Data pipeline:** Python scripts in `scripts/` (pandas, pdftotext) turn GVR PDFs and Excel files into report JSON. The scripts run locally, not on Vercel.
- **Cron:** `vercel.json` → `/api/weekly` every Monday at 16:00 UTC (9am Vancouver time). It is protected by `CRON_SECRET`.
- **Demo mode:** when `SUPABASE_URL` is not set, `DEMO = true`.
  - The API serves the built-in seed report.
  - The Create page keeps the profile in `localStorage` under `mup_demo_profile`.
  - Everything runs locally without keys.

### Run locally

```bash
node scripts/dev.mjs          # or: npm run dev   → http://localhost:3000 (PORT env to change)
```

`scripts/dev.mjs` serves `public/`, rewrites `/r/:slug` → `report.html`, `/r/:slug/print` → `print.html` and `/s/:slug` → `share.html`, and calls `api/[fn].js`.

**The dev server imports the API modules once.** After you change anything under `lib/` or `data/`, restart it.

Demo URLs:

- `/r/demo`: sample report
- `/r/demo?p=x`: sample personal link ("the Chen family", Burke Mountain)
- `/app?plan=pro` with `localStorage.mup_demo_profile = {"name":"…","slug":"demo","plan":"pro"}`: the dashboard as a Pro agent

---

## 3. Repository map

```
api/[fn].js                 The only server function. ROUTES map: name → handler.
lib/util.js                 Shared server helpers (see §5). Imports seed + history.
lib/smtp.js                 Minimal SMTP sender: smtpSend(list) → number sent.
lib/routes/*.js             One handler per API address (see §5 table).
data/seed-report.js         `export default {...}`: a full month of report data (demo + fallback).
data/history.js(.json)      Monthly price/sales/listings history since 2025-01 (12-month charts).
scripts/dev.mjs             Local server.
scripts/history-from-gvr.py Build history from GVR stats packages.
scripts/growth-from-gvr.py  Adds "growth" (3/5/10-year % by area and type) from the Stats Package PDF.
scripts/hoods-from-gvr.py   Adds "hoods" (neighbourhood prices) from the HPI Benchmark Summary Excel.
scripts/gvr-neighbourhoods.json  GVR area code → neighbourhood names (which city each belongs to).
scripts/stripe-setup.mjs    Creates Stripe products/prices once.
supabase/schema.sql         All tables (append-only migrations; run in the Supabase SQL editor).
public/index.html           First page + sign-up, white and blue. Draws the real report (mountReport, embedded) as its preview.
public/app.html             Create page shell → /js/app.js
public/report.html          Public report → mountReport() from /js/board.js
public/print.html           PDF/print layout of the report
public/share.html           Share page (copy link / story instructions)
public/admin.html           Admin: publish a month, verify licences, export leads
public/plans.html, privacy.html, terms.html
public/css/site.css         Site + dashboard styles (global class names! see §8)
public/css/board.css        Report styles, all scoped under `.bd`
public/css/report.css       Older report styles still loaded by report.html
public/js/                  ES modules (see §6)
vercel.json                 cleanUrls, rewrites for /r and /s, crons
```

---

## 4. Data model

### 4.1 Monthly report document (`reports.data`, same shape as `data/seed-report.js`)

The client calls this document `D`.

```js
{
  month: "September 2026",          // REQUIRED, "<Month> <YYYY>"; the key is derived: "2026-09"
  asof: "October 2, 2026",
  cities: {                         // detailed cities (9 incl. "Greater Vancouver")
    "Coquitlam": {
      detached: { active:{now,ly,yoy,prev}, sales:{…}, dom:{…}, price:{…}, ratio: 9.8 },
      townhome: {…}, condo: {…}
    }, …
  },
  areas: {                          // all ~20 GVR areas, lighter numbers
    "Burnaby North": { detached:{sales,active,price,yoy}, condo:{…}, townhome:{…} }, …
  },
  growth: {                         // optional: [3y, 5y, 10y] % change
    composite: { "Coquitlam": [-12.7, -4.4, 21.9], … }, detached:{…}, townhome:{…}, condo:{…}
  },
  history: {                        // added server-side from data/history.js if missing
    price:    { composite|detached|townhome|condo: { "<Area>": { "2025-01": 1234567, … } } },
    sales:    { detached|townhome|condo: { "<sales group>": { "2025-01": 123, … } } },
    listings: { … same as sales … }
  },
  hoods: {                          // optional: neighbourhood benchmark prices
    "Coquitlam": {
      "*":              { d:[…], t:[…], c:[…] },   // the whole city
      "Burke Mountain": { d:[price, m1, m3, m6, y1, y3, y5, y10, sinceJan], t:[…] }
    }, …
  }
}
```

**Naming quirks to respect:**

- Home types are `detached`, `townhome` and `condo` in `cities`, `areas`, `history` and `growth`. They are `d`, `t` and `c` in `hoods`.
- Sales history is grouped differently from the area list. For example, Burnaby is combined. `charts.js → salesGroup(area)` maps area to group, and `"Grand Totals"` means Greater Vancouver.
- `report.js → get(D, area, type)` is the one accessor that normalises a city or area into `{price, yoy, prev, sales, salesLy, active, activeLy, dom, domLy, ratio}`. `type: 'all'` gives totals plus the composite price.
- `ratio` is sales ÷ active listings × 100. Below 12 is a buyer's market, 12 to 20 is balanced, above 20 is a seller's market. These thresholds come from GVR.
- In `hoods`, every change is a percentage. `null` means not published. Neighbourhood names drop GVR's area suffix (for example "Eagle Ridge CQ" becomes "Eagle Ridge") when two or more words remain.

### 4.2 Supabase tables (`supabase/schema.sql`)

| Table | Key | Purpose |
|---|---|---|
| `profiles` | `id` (= auth user) | Agent: name, brokerage, phone, `contact_email`, `logo`/`photo` (data URLs ≤400 KB), `slug` (unique, used in `/r/<slug>`), `plan` (`basic`/`pro`), `status` (Stripe: `active`, `trialing`, …), `theme` jsonb (legacy), **`show` jsonb (layout, see §4.3)**, licence fields, `role` (`realtor`/`broker`), `email_verified`, `weekly_email` |
| `reports` | `key` "2026-09" | One row per month: `month`, `data` (the document above) |
| `exports` | `id` (short) | History of what an agent made (link, email, pdf, post, story, caption) with the settings at the time. `/r/<slug>?v=<id>` opens that version |
| `leads` | `email` | Everyone who started sign-up, plus marketing consent |
| `instagram` | `user_id` | Instagram connection: token (server-only), auto-post settings |
| `personal_links` | `id` (short) | Client name, city, hood, type, `month` (a link made for one month, else empty), opens, last_opened_at |
| `visits` | `id` (made by the page) | One report open: `link_id` (null = general link), `month`, `device`, `seconds` (reading time), `reached_end`, `parts` (seconds per section), `acts` (taps: `contact`, `email`, `text`, `copy`, `type:c`, `month:2021-03`, `area:<name>`), `started_at`, `updated_at`. Removed after 400 days by `weekly` |
| `hood_views` | bigserial | What clients looked at in Neighbourhoods: `link_id` (null = anonymous), `hood`, `kind` = `pick`, `peek` or `compare` |

**Migrations:** append `create table if not exists` or `alter table … add column if not exists` to the end of `schema.sql`, and give the owner just the new block to run.

### 4.3 The agent's layout: `profiles.show`

Cleaned on the server by `util.cleanShow()` and on the client by `board.layoutOf()` and `cleanConf()`.

```js
{
  sections: ['numbers','market','trend','types','hoods','sold','growth','contact','summary'], // order shown
  known:    [...all section ids...],   // which sections existed when saved (see "new sections" below)
  areas:    ['Coquitlam','Burnaby North'],   // max 6 (MAX_AREAS)
  agentTop: true,        // agent name/photo at the top
  clientAreas: true,     // clients may add/remove areas
  view: 'side' | 'one',  // what clients see first: all areas together, or the first area (R2 "Show me")
  conf: {                // per-section choices
    trend: { title, areas:[…], types:[…], sub:false, note:false, size:'full' },
    hoods: { city, home, cmp, type:'d'|'t'|'c', off:['rank',…], take:'own'|'off', text }
  },
  template: { …same layout keys… },  // saved "my template"
  mode: 'template' | 'default',
  months: { on: true, back: 36, links: false },  // past months (R1.1): may clients pick an older month, how far back (12, 36, 0 = all), links made for one month
  img: { post:{price,forsale,market,sold,photo}, story:{…} }   // what is on Instagram images
  // + legacy on/off keys (prices, changes, sold, …) from an older design
}
```

**New sections reach existing agents automatically.** `board.js → NEW_SECTIONS` lists them. If a saved layout has no `known` array, each new section is added once, after "Prices by home type". The Create page always saves `known: SEC_IDS`, so if the agent removes the section later, it stays removed. **When you add a section, add its id to `NEW_SECTIONS`.**

---

## 5. Server

### 5.1 `lib/util.js`, the shared helpers

| Export | What it does |
|---|---|
| `DEMO`, `SEED`, `PLANS`, `PRICE_IDS()`, `SITE_NAME`, `DEMO_AGENT` | Constants and flags |
| `json(res, code, obj)`, `query(req)`, `body(req)`, `raw(req)`, `origin(req)` | Request and response helpers |
| `db(path, {method, data, prefer})` | Supabase REST call with the service key. `path` is a PostgREST path, for example `profiles?id=eq.${id}`. Throws on error. |
| `getUser(req)` | Checks the bearer token with Supabase Auth. Returns the user or `null`. |
| `isActive(p)` | `status` is `active` or `trialing` |
| `latestReport()`, `reportFor(key)` | Read from `reports`. Both pass through `withHistory()`. |
| `withHistory(D)` | Fills `history` from `data/history.js`, area by area, when it is missing. Adds the seed's `hoods` when the month matches. |
| `forPlan(D, plan)` | Essentials: keeps only Greater Vancouver and strips `areas`, `hoods` and most history |
| `cleanTheme`, `cleanShow` | Validate agent input before saving. `cleanShow` is re-exported from `public/js/layout.js`, which the browser uses too. |
| `publicAgent(p)` | The fields safe to show on a public report. **Never put personal or private fields in it.** |
| `stripe(path, params)`, `verifyStripe(raw, header, secret)` | Stripe REST call and webhook signature check |
| `sendEmail(msg)`, `smtpSend(list)` | Email |
| `slugify`, `monthKey`, `MONTHS` | Small text and date helpers |

### 5.2 Routes (`lib/routes/<name>.js` → `/api/<name>`)

| Route | Access | Notes |
|---|---|---|
| `report` | Public | `?slug=`. Optional `?v=<export id>` (saved version), `?p=<personal link id>` (adds `personal`, counts the open unless `sw=1`), `?m=2024-03` (an older month, when `months` allows it or it's a link made for that month). Returns `{agent, report, plan, view, personal, months, latest}`: `months` are the month keys the client may pick (newest first, Pro only). In demo, `?p=` returns a sample and `months` has only the sample month. |
| `me` | Agent | GET: profile, `active`, a report trimmed for the plan, and `months` (every published month, Pro). POST: update profile fields, `theme`, `show`. Creates `slug` from the name. |
| `exports` | Agent | Create or list history items. Making the same thing again reuses the same id. |
| `instagram` | Agent (Pro) | GET is the OAuth callback. POST actions: connect URL, settings, post now (`{post, story, caption}` JPEG data URLs → Storage → Graph API). |
| `links` | Agent (Pro) | GET `?days=7\|30\|365`: personal links, most active first, each with `act` (from `activity.js → activity()`) and `looked`, plus `general` (general-link opens), `weekly` and `top`. POST: create (with optional `month`), `{action:'delete'}`, or `{action:'weekly', on}`. |
| `track` | Public | Beacon. `{slug, p, kind: pick\|peek\|compare, city, hood}` → `hood_views`; `{slug, p, kind: 'visit', id, m, sec, end, dev, parts, acts}` → upsert into `visits` (`cleanVisit()` caps numbers and keeps only known sections and taps). Only for active Pro agents. Always returns 200. |
| `weekly` | Cron (`CRON_SECRET`) | Emails each Pro agent which clients were actively looking in the last 7 days (`weeklyLines()`, very active first, plus links never opened and general-link opens). Skips agents with nothing new or with the email turned off. Deletes visits older than 400 days. |
| `checkout`, `portal` | Agent | Stripe Checkout session and billing portal |
| `stripe-webhook` | Stripe | Syncs `status`, `plan` and `period_end`. Sends a welcome email. |
| `subscribe` | Public | Lead capture with consent text |
| `confirm` | Public | Email-confirmation link handler |
| `config` | Public | `{demo, siteName, plans, supabaseUrl, supabaseAnonKey}` for the browser |
| `admin-publish` | `ADMIN_TOKEN` | `validate(report)`, then upsert into `reports`, then optionally email every subscriber "your report is ready" (`testTo` sends one test) |
| `admin-agents` | `ADMIN_TOKEN` | List and verify licence numbers |
| `leads` | `ADMIN_TOKEN` | CSV export |
| `ig-callback` | Meta (signed) | Deauthorise and data-deletion callbacks for the Instagram app review: `POST /api/ig-callback?type=deauth` or `?type=delete`, with a `signed_request` checked against `IG_APP_SECRET`. Removes the agent's Instagram connection. |

**Adding a route:**

1. Create `lib/routes/foo.js` exporting `default async function handler(req, res)`.
2. Import it in `api/[fn].js` and add `'foo': r_foo` to `ROUTES`.
3. Handle `DEMO` (return something harmless).
4. Wrap the handler in `try/catch` that returns a plain-language error.
5. Check `getUser`, `isActive` and `plan` as the route needs.

---

## 6. Front end (`public/js`)

| Module | Role | Key exports |
|---|---|---|
| `layout.js` | **Layout rules shared with the server** (no DOM, no imports). Section list, defaults, `NEW_SECTIONS`, past-month rules, and the cleaning of everything an agent can save. `lib/util.js` imports it too. | `SECTIONS`, `SEC_IDS`, `NEW_SECTIONS`, `DEFAULT_LAYOUT`, `DEFAULT_MONTHS`, `MONTHS_BACK`, `MAX_AREAS`, `TYPE_KEYS`, `HOOD_BLOCK_KEYS`, `cleanAreas`, `cleanHoods`, `cleanConf`, `cleanMonths`, `monthsAllowed(keys, months)`, `cleanLayout`, `cleanShow`, `layoutOf(show, areas)`, `sameLayout` |
| `activity.js` | **Client activity rules, shared with the server** (no DOM, no imports): turns a link's visits and Neighbourhoods views into a level, numbers, time per section, recent visits in plain words, and a "Why it matters" line made only of facts | `activity(link, visits, views, {days, now, latest})`, `LEVEL`, `PART`, `times`, `mins`, `monthName` |
| `visit.js` | The report page's reading tracker: reading time (only while on screen and active in the last 2 minutes), the section in the middle of the screen, read to the end, taps. Sends `kind:'visit'` beacons every 30 s when something changed, and when the page is hidden or closed | `startVisit({slug, p, month, root})` → `{act, month}` |
| `board.js` | **The report renderer.** Used by the public report, the dashboard canvas and previews. | `mountReport(root, D, A, opts)`, `SECTIONS`, `SEC_IDS`, `DEFAULT_LAYOUT`, `layoutOf`, `cleanConf`, `cleanHoods`, `sameLayout`, `MAX_AREAS`, `PAIRABLE`, `USES_TYPES`, `USES_AREAS`, `TYPE_KEYS` |
| `hoods.js` | Neighbourhoods section (its own state and events) | `makeHoods(ctx)`, `HTYPES`, `BLOCKS`, `hoodCities`, `hoodNames`, `defaultCity` |
| `app.js` | The Create page (dashboard). Long file. | Not imported by others. Runs on load (top-level `await`). |
| `report.js` | Shared helpers and older renderers | `get`, `money`, `esc`, `slug`, `areasOf`, `first`, `phoneFmt`, `roleLabel`, `askCopy`, `sourceLine`, `monthKey`, `palette`, `themeVars`, `SAMPLES`, … |
| `charts.js` | Series, simple chart helpers and the one-line stories | `salesGroup`, `priceSeries`, `salesSeries`, `lineChart`, `barChart`, `soldStory`, `typesStoryOne`, `typesStoryAreas`, `dollarChange`, `typeChange` (S4) |
| `social2.js` | Instagram images on canvas (calm blue design) | `calmImage(D, A, area, kind, opts)`, `calmCaption`, `IMG_DEFAULTS`, `IMG_PARTS`, `imgOpts` |
| `exports.js` | Links, email draft, image wrappers | `reportLink`, `emailDraft`, `socialImage` (→ `calmImage`), `caption`, `download` (`*Old` versions are legacy) |
| `share.js` / `qr.js` | Share menu, QR modal, icon set `sv(name)`; QR SVG generator | |

### 6.1 `mountReport(root, D, A, opts)`

- **`A`** is the agent: `publicAgent` plus `show`.
- **`opts`:**
  - `area` or `areas`: the starting area(s)
  - `embedded`: inside a preview
  - `edit(patch)`: agent edit mode. Its presence means the Create page.
  - `selected`, `adding`, `onSelect(k)`, `onAdd()`: edit-mode panel sync
  - `personal`: a personal link's `{id, name, city, hood, type}`
  - `track(kind, data)`: the beacon. It is null in edit or embedded mode.
  - `months`: `{list, latest, onPick(key)}` for the month button (R1.1). `report.html` loads the picked month with `?m=…&sw=1` and mounts the report again, keeping the areas in the URL. Classes are prefixed `mo-`.

**How it works:**

- Each section has a renderer `R[id]()` that returns HTML through `card(id, title, sub, body, extra)`.
- Charts and interactive parts are placeholders `<div data-chart="x">`, filled by `C[x](el)` after the HTML is on the page. A `ResizeObserver` runs `charts()` again when the size changes.
- Sections with a `PAIR` weight (`trend`, `market`, `summary`, `sold`) sit side by side unless their size is set to full.
- **Events:** one delegated `root.onclick` and one `root.onchange`. Add new handlers there, or keep them inside your own module, as `hoods.js` does with `data-h*` attributes. **Don't reuse the `data-*` names already used in `root.onclick`.**
- **Edit mode:** each section is wrapped in `.sx[data-k]` with a "Drag to move" handle (`.dragh`, shown on hover and when selected) and a bin. `saveLayout(patch)` calls `opts.edit(patch)`, and `app.js → setLayout()` saves it to `P.show`. `opts.onRemove(k)` lets the dashboard animate removing a section (the bin calls it instead of removing at once).
- **Homes sold (`sold`):** one area draws `C.sold` (a bar chart). Several areas draw `C.soldm`: the story line, a Greater Vancouver row, the cities' bars or lines (`S.soldView`, buttons `data-sv`) and the change row. Its data comes from `charts.js → salesByArea()` (areas sharing a sales group, such as Burnaby North and South, are counted once) and the story from `soldStory()`, both tested in `tests/sold.test.mjs`. Under 520px wide it shows the last 6 months. Classes are prefixed `sd-`.
- **Key numbers (`numbers`):** `S.nPer` (`m1`, `y1`, `y3`, `y5`, `y10`; opens on `y1`) is picked with the blue "since …" words: a transparent native `<select data-nper>` over a label (`.kn-sel`), handled in `root.onchange`. Changes come from `charts.js → numbersChange(get(D, a, 'all'), per, D.growth.composite[a])` and the month from `periodMonth()` (tested in `tests/numbers.test.mjs`). `get()` also returns `salesPrev`, `activePrev`, `domPrev` for last month. 3/5/10 years give the price only. Classes are prefixed `kn-`.
- **Plain-language summaries** come from `summaryPoints()`. The 12-month line uses `D.history.price.composite`. Areas with no history are listed under the chart.

### 6.2 Neighbourhoods (`hoods.js`)

- **State:** `{city, homeCity, home, type, per, cmp, note, peek, seen, browse, rankAll, allCities, areas, focus, fromTop}`.
  - `city` is the city open on screen. `homeCity` + `home` are the client's own neighbourhood, which can be in another city.
  - `cmp` is `{c, h}` (city, neighbourhood or `'*'` for the whole city). `seen` holds `"city|hood"` strings.
  - The client's area, type and `seen` are kept per agent in `localStorage` under `mup_hood:<slug>` (not the city they last looked at). Nothing is written in edit mode.
  - A personal link sets the home, its city and the type.
- **Following the report:** `board.js → draw()` calls `HO.sync(areas, focus)` before every redraw, with the R2 areas and the area tapped in R2 ("Show me: <area>"). `sync()` holds the rule for which city opens (see HANDOFF §6). Never open on a city without a card.
- **Blocks, in order:**
  - City cards (`.nb-cd`, `data-hcard`), or a grey card for an area without neighbourhoods (`data-hno`) that opens a message (`.nb-msg`). With no area that has neighbourhoods, a city grid instead (`.nb-grid`).
  - Pinned "Your area" bar in their city, or the slim `.nb-away` bar in another city
  - Picker card (when no home is set). After "I'm just looking around" (`S.browse`, saved as `looking`) it shrinks to the `.nb-look` bar; `data-hreopen` opens it again with a ✕ (`S.reopen`, `data-hshrink`)
  - Hero, with the change in dollars and a spark line built from GVR's own % changes
  - Every neighbourhood: one ranked list (`.nb-li`, block key `tiles`) with type and time buttons (`PERIODS`: sj, y1, y3, y5, y10; opens on y5). Neighbourhoods only, no city row. Column titles (`.nb-lh`) sit above it (no key line: Ella removed it)
  - Compare: the client's neighbourhood vs any neighbourhood or whole city in any card city
  - "You also looked at"
  - The agent's take: automatic text, `conf.text`, or off
- **Title:** `HO.title()` gives "Neighbourhoods in <City>" when there's a single card, else "Neighbourhoods".
- **Peek sheet:** appended to `document.body` as `.nb-sheet` (not inside `.bd`). Its styles in `board.css` therefore use fixed colours. `peek(n, city)` works for any city.
- **Tracking:** `ctx.track('pick' | 'peek' | 'compare', {city, hood})`, sent with `navigator.sendBeacon` from `report.html`.
- **Agent settings:** `conf.hoods`, edited in `app.js → hoodsPanel()`. Block keys are `hero`, `tiles`, `compare`, `take` (`rank` was removed; old saved values are dropped by `cleanHoods`). `defaultCity(D, conf, areas)` is the agent-side rule.

### 6.3 The Create page (`app.js`)

- **Global state:**
  - `P`: the profile
  - `D`: the latest report
  - `PS`: the panel state, `{m: 'list' | 'edit' | 'add' | 'details', k, tab}`
  - `HIST`: the exports history
  - `ZOOM`
- **Layout:** top bar (`drawTop`), report canvas `#rp` (`preview()` → `mountReport` with `edit`), right panel `#dpanel` (`drawPanel()` + `wirePanel()`, event delegation, set up once).
- **Sections panel (D6):** like iPhone Settings. `PS = {m: 'list' | 'section' | 'details', k}`. List rows are `.ipsec[data-sk][data-li]` with `SIC[k]` icons; `tapRow(k)`: first tap selects and scrolls the report (`toSec`), second tap `openPage(k)` shows `secPage(k)` (styles `.ip …` in `site.css`). **Add and remove only through `addSec(k)` and `removeSec(k)`:** they animate, and `holdPlace(fn)` redraws the report without the page jumping. `panelTo(k)` scrolls only the panel. `drawPanel()` keeps the panel's scroll position within the same page.
- **Saving:** `touch(key)` marks a field as changed. `saveNow()` sends a debounced POST to `/api/me`. Layout changes always go through `setLayout(patch)` or `setConf(sectionId, patch)`.
- **Share menu:** `shareDrop()`. It opens copy link, email, QR, Personal links (`personalLinks()`), and `openPreview(kind)` for Post, Story and PDF with toggles for "what's on the image", an editable caption, Download, Post to Instagram (`confirmPost`) and Send to my phone (QR).
- **Demo mode:** `cfg.demo`. Exports and personal links are kept in `localStorage` (`mup_demo_exports`, `mup_demo_plinks`).

### 6.4 Styles

- **Report:** `board.css`, every rule under `.bd`.
  - The look is fixed and calm: accent `#1d4fbf`, bars `#4f86e8`, page `#f3f4f7`, ink `#1b2430`, Inter.
  - CSS variables are set on the report root: `--ac`, `--ink`, `--mut`, `--ln`, `--card`, `--up`, `--dn`, `--hl`, `--bar`.
  - Neighbourhoods classes are prefixed `nb-`.
- **Dashboard and site:** `site.css`. Base colours on `:root` are the report's: `--p #1d4fbf`, `--g #4f86e8`, `--tint #eef3fd`, `--ink #1b2430`, `--line #e3e6ec`. Never reintroduce green. The logo is `.dot` (a background image of `/img/logo-mark.svg`); use `<span class="dot"></span>` next to the name. First-page classes start with `lp-`.
  - **It defines global, unprefixed classes such as `.up`, `.me`, `.mine`, `.note`, `.lead`.** They leak into the report when it is shown inside the dashboard.
  - So never use those names in report markup. For example, use `upv` for "up value", not `up`.
  - Check new class names with `grep` in `site.css` before you use them.

---

## 7. Monthly data pipeline

1. **Download from the GVR members' portal** (portal.gvrealtors.ca > Market stats/reports):
   - The **Stats Package PDF** for the month
   - The **HPI Benchmark Summary Excel** for this month and for January
2. **Build `report.json`.** It has the same shape as `data/seed-report.js`: `cities`, `areas`, `month`, `asof`.
3. **Add the extras:**
   - `python3 scripts/growth-from-gvr.py <stats-package.pdf> report.json` adds `growth`
   - `python3 scripts/hoods-from-gvr.py <this-month.xlsx> <january.xlsx> report.json` adds `hoods`
   - The history update uses `scripts/history-from-gvr.py`; see the script's header. `data/history.js` is the fallback.
4. **Publish:** `/admin` → paste the JSON → send a test → publish. `admin-publish → validate()` checks the month, `asof`, the 9 cities × 3 types × 4 metrics, and at least 15 areas. When `growth`, `hoods` or `history` are included, it checks their shape too: at least 100 neighbourhood prices, and a price for the report month in every area.
5. **Optionally refresh the seed:** update `data/seed-report.js` so demo mode and the fallback show the newest month.

Old `.xls` files from before 2024 need LibreOffice (`soffice --convert-to xlsx`) or `xlrd` before pandas can read them.

---

## 8. Conventions (follow these)

**Product and UX rules from the owner:**

- **Show the UI before writing code.** For any visible change, make a mockup (an HTML page screenshotted with Playwright) and wait for approval.
- **Always use red and green for changes:** red for down (`--dn` `#d6452f`) and green for up (`--up` `#1a8f4e`). This applies everywhere, days on market included.
- **One calm, fixed design.** White cards on soft grey, blue accent. Don't offer font, colour or style pickers. Don't mix grey and white text. Don't let text overlap.
- **Counts in sentences read naturally:** never "9 of 9". Use `countPhrase(k, n)` from `hoods.js` ("all 9 neighbourhoods have", "both…", "no neighbourhood has").
- **Plain words for clients,** including older readers: short sentences, labels people recognise, icons next to column titles.
- **The default section order is a recommendation, with Summary last.** Agents can reorder and save a template.
- **Automate for agents.** Every setting starts on a sensible choice, and things update themselves every month.
- **Nothing fake:** no made-up testimonials, user counts or "most popular" claims.
- **Don't show the owner's personal email to agents.** Keep `publicAgent()` minimal.
- **Supabase stays on the free plan.** Avoid paid services.

**Code:**

- No new npm dependencies. Plain ES modules, compact style, comments in plain English on the line above.
- Escape all user and data text with `esc()` before putting it in HTML.
- Validate everything the server saves. **Section ids and layout settings live only in `public/js/layout.js`.** The browser and the server both use it, so change them there and nowhere else. Keep that file free of DOM code and imports.
- Every route works in `DEMO` mode.
- Keep `forPlan()` in step with what Essentials may see.

**Process:**

- **Pushing to `main` deploys the live site.** Commit and push directly, but only after the owner's go-ahead and a passing `npm test`. Run `git pull` first so you build on the latest version.
- Only the owner adds secrets (environment variables). Never ask for them in chat.

---

## 9. How to add common features

| Task | Steps |
|---|---|
| **New report section** | 1) `layout.js`: add it to `SECTIONS` (id, name, description) and `NEW_SECTIONS`. If it has settings, extend `cleanConf` the way `cleanHoods` does. 2) `board.js`: write `R.<id>` (and `C.<id>` if it draws after render), and add it to `PAIRABLE`, `USES_AREAS` or `USES_TYPES` if relevant. 3) `app.js`: an icon in `SIC` and, if needed, a settings block in `drawPanel()` (follow `hoodsPanel`). 4) Styles in `board.css`, under `.bd`. 5) If it needs new data, extend the report JSON, `admin-publish → validate()` and `forPlan()`. |
| **New data in the report** | Add it to the report document, the pipeline script, `seed-report.js` (demo), `withHistory()` (fallback for old months, if sensible), `forPlan()`, the checks in `admin-publish → validate()` and a test in `tests/data.test.mjs`. |
| **New API route** | See §5.2. Register it in `api/[fn].js`, handle `DEMO`, check auth and plan. |
| **New table** | Append it to `supabase/schema.sql` with RLS enabled, and give the owner just that block. |
| **Email** | `smtpSend([{to, subject, html, text}])` returns the number sent. Inline styles only. Plain-text copy too. |
| **Scheduled job** | Add a route protected by `CRON_SECRET` and a `crons` entry in `vercel.json`. Hobby crons run at most once a day. |
| **Instagram image change** | `social2.js → calmImage`. What appears on the image is controlled by `show.img` (`IMG_PARTS`). |

---

## 10. Testing

Run **`npm test`** before every upload. It uses Node's built-in test runner (`node --test`), so there is nothing to install. Everything runs in sample mode, with no database and no emails.

| File | What it checks |
|---|---|
| `tests/layout.test.mjs` | Shared layout rules: unknown sections dropped, area limits, `NEW_SECTIONS` added once, Neighbourhoods settings, `cleanShow`, that the browser and server use the same functions, and that every Neighbourhoods block has a label |
| `tests/activity.test.mjs` | Past-month rules (defaults, how far back), what a visit may store, activity levels and the "Why it matters" line, the Monday email lines |
| `tests/sold.test.mjs` | Homes sold with several areas: numbers per area, missing months, and the story sentence |
| `tests/data.test.mjs` | The built-in month passes the publish checks. Every area has 12 months of price history. Neighbourhood data is well formed. Broken data is rejected. |
| `tests/api.test.mjs` | Every route answers in sample mode: config, report, personal link, tracking, cron password, admin password, 404 |
| `tests/browser.test.mjs` | Real pages in Chromium: the report draws every default section, adding a city adds a chart line, the personal link hero shows, picking and peeking at a neighbourhood work, and the Create page shows the Neighbourhoods settings. **Skipped when Playwright isn't installed.** Set `PLAYWRIGHT_MODULE` to its `index.mjs` if it's installed globally. |
| `tests/helpers.mjs` | `call(path, {method, body, headers})` runs a route the way Vercel does, without a server |

`.github/workflows/test.yml` runs `npm test`, including the browser checks, on GitHub on every push or upload. A red ✗ next to a commit means a check failed.

**Rules:**
- When you fix a bug, add a test that would have caught it.
- When you add a route or a report field, add a test for it.

For visual changes, still take Playwright screenshots at desktop width and at 390px, and show them to the owner. The automatic checks don't judge how something looks.

---

## 11. Known gaps and suggested next work

**Pending owner decisions (UI made, not built):**

- A "Use recommended order" option in the Sections panel
- A slimmer template bar with a ⋯ menu
- An interest rates section (Bank of Canada rate, prime rate, next announcement, step graph)

**Planned:**

- PDF redesign to the calm look
- Instagram app review (rename the app; enter the `/api/ig-callback` URLs in Meta)
- Bulk personal links (CSV upload or a Follow Up Boss connection)
- Publish older months (for the month button) and extend `data/history.js` back to 2016 for the 12-month chart on older months
- Neighbourhood sales counts

**Technical debt:**

- `app.js` and `board.js` are large. Split out the panel, share and preview code.
- `/api/track` has no rate limit. Visit beacons come at most every 30 seconds per open page.
- Logos and photos are stored as data URLs in `profiles`. Move them to Storage.
- `.env.example` and the README still mention Resend and "custom colours/fonts". Both are outdated.
- `report.css`, the `*Old` exports and the legacy `show` on/off keys are leftovers from earlier designs. Check before deleting.
- The browser checks are only a smoke test. Add a test whenever you fix a bug.
