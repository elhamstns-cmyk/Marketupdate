# The Market Update: handoff for a new chat

**How to use this:** start a new chat, attach this file (or point Claude to it in `~/repos/Marketupdate`), and paste one of the starter messages at the bottom. Each chat should cover **one section** so feedback stays focused.

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
| Code repository | `~/repos/Marketupdate` on Ella's Mac (GitHub: elhamstns-cmyk/Marketupdate) |
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
4. Push the local commit that adds `ARCHITECTURE.md`: in GitHub Desktop, press **Push origin**.

**UI made, waiting for Ella's go-ahead:**

- **First page:** a white and blue landing page that matches the product (landing-ui.png).
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
- Instagram (Meta) app review: register `ig-callback` and rename the app
- Test the first real Instagram post
- Bulk personal links (CSV upload or Follow Up Boss connection)
- Code cleanup: shared layout rules, tests, splitting big files. Claude recommended this; Ella hasn't decided.
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

---

## 7. Starter messages for new chats

Copy one and add your feedback:

- **One section:** "Read HANDOFF.md and ARCHITECTURE.md in ~/repos/Marketupdate. We're working only on the **[section name]** section. Here is my feedback: …"
- **First page:** "Read HANDOFF.md and ARCHITECTURE.md in ~/repos/Marketupdate. We're working only on the **first page (landing page)**. The UI is landing-ui.png. My feedback: …"
- **Dashboard (Create page):** "Read HANDOFF.md and ARCHITECTURE.md in ~/repos/Marketupdate. We're working only on the **dashboard: Sections panel and template bar**. My feedback: …"
- **Instagram and sharing:** "Read HANDOFF.md and ARCHITECTURE.md in ~/repos/Marketupdate. We're working only on **Share: Instagram post and story, PDF, personal links**. My feedback: …"
- **Monthly data:** "Read HANDOFF.md and ARCHITECTURE.md in ~/repos/Marketupdate. Help me publish **[Month] 2026**. The GVR files are in ~/Downloads."

**Tip:** at the end of each chat, ask Claude to update HANDOFF.md with what changed, so the next chat starts current.
