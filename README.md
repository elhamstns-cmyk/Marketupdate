# The Market Update

Branded monthly Greater Vancouver market reports for REALTORS®, sold by subscription.

- `public/` the website: landing page, agent dashboard (`/app`), public branded report (`/r/<agent>`), PDF page, admin page (`/admin`)
- `api/[fn].js` is the one server function (Vercel Hobby allows 12); each address is handled by its file in `lib/routes/`: sign-in checks, profile, Stripe checkout/billing/webhook, monthly publish + "ready" email
- `supabase/schema.sql` database tables
- `data/seed-report.js` sample month used for the demo report

No packages to install. Preview locally with `npm run dev` (runs in sample mode until keys are added). Run the checks with `npm test` before every upload. For how the code fits together, read `ARCHITECTURE.md`.

## Going live
1. **Supabase**: new project, run `supabase/schema.sql` in the SQL editor. In Authentication > URL Configuration set the Site URL to your domain and add `https://themarketupdate.ca/app` as a redirect URL. In the Magic Link email template, add `{{ .Token }}` so agents also get a code.
2. **Stripe**: run `STRIPE_SECRET_KEY=sk_... npm run stripe:setup` and keep the four lines it prints. Add a webhook to `https://themarketupdate.ca/api/stripe-webhook` for `checkout.session.completed` and `customer.subscription.*`. Turn on the customer portal.
3. **Resend**: verify your domain, create an API key.
4. **Vercel**: import this GitHub repo, add every value from `.env.example`, connect the domain.

## Each month
Open `/admin`, paste the month's report data (same shape as `data/seed-report.js`), send yourself a test, then publish. Every active subscriber gets the "ready" email and their link shows the new month.

Plans: Both plans use the same fixed white and blue design. Essentials ($19/mo, $190/yr) is the Greater Vancouver report, with link and email. Pro ($29/mo, $290/yr) adds every city and neighbourhood, arranging sections, a saved template, PDF, Instagram images, personal links and the weekly email. Change prices in `lib/util.js` and `public/plans.html`.

## Long-term price growth
The report's "Long-term price growth" section uses the 3, 5 and 10-year changes from the MLS® HPI tables in GVR's monthly Stats Package. Add them to the month's report data before publishing:
`python3 scripts/growth-from-gvr.py GVR-Stats-Package-October-2026.pdf report.json`
If a month has no growth data, that section is simply left out.

## Neighbourhoods
The "Neighbourhoods" section uses GVR's **HPI Benchmark Summary Excel** (GVR portal > Market stats/reports > HPI Benchmark Summary Excel). Download this month's file and January's, then:
`python3 scripts/hoods-from-gvr.py "2026-10-GVR Benchmark Summary Report.xlsx" "2026-01-GVR Benchmark Summary Report.xlsx" report.json`
In January, leave out the second file. `scripts/gvr-neighbourhoods.json` says which city each neighbourhood is in (from the GVR Stats Centre area list).
