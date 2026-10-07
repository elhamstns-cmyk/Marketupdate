# The Market Update

Branded monthly Greater Vancouver market reports for REALTORS®, sold by subscription.

- `public/` the website: landing page, agent dashboard (`/app`), public branded report (`/r/<agent>`), PDF page, admin page (`/admin`)
- `api/` server functions: sign-in checks, profile, Stripe checkout/billing/webhook, monthly publish + "ready" email
- `supabase/schema.sql` database tables
- `data/seed-report.js` sample month used for the demo report

No packages to install. Preview locally with `npm run dev` (runs in sample mode until keys are added).

## Going live
1. **Supabase**: new project, run `supabase/schema.sql` in the SQL editor. In Authentication > URL Configuration set the Site URL to your domain and add `https://themarketupdate.ca/app` as a redirect URL. In the Magic Link email template, add `{{ .Token }}` so agents also get a code.
2. **Stripe**: run `STRIPE_SECRET_KEY=sk_... npm run stripe:setup` and keep the four lines it prints. Add a webhook to `https://themarketupdate.ca/api/stripe-webhook` for `checkout.session.completed` and `customer.subscription.*`. Turn on the customer portal.
3. **Resend**: verify your domain, create an API key.
4. **Vercel**: import this GitHub repo, add every value from `.env.example`, connect the domain.

## Each month
Open `/admin`, paste the month's report data (same shape as `data/seed-report.js`), send yourself a test, then publish. Every active subscriber gets the "ready" email and their link shows the new month.

Plans: Essentials ($19/mo, $190/yr) is the Greater Vancouver report in a fixed white and blue design, with link and email. Pro ($29/mo, $290/yr) adds custom colours, fonts and styles, every city, PDF and social images. Change prices in `lib/util.js` and `public/index.html`.
