# SmallStack Advisor

Static affiliate-ready content site for small business software comparisons.

The site is intentionally simple: structured JSON data, dependency-free Node scripts, static HTML output, and automated checks that block risky commercial content before publishing.

## What is included

- 30 launch buying-intent pages under `/guides/` and `/comparisons/`.
- Product profiles under `/products/`.
- Category pages, homepage selector, affiliate disclosure, privacy page, checklist page, sitemap, and robots file.
- Compliance checks for disclosures, official source links, risky phrases, and affiliate link attributes.
- Link checks for internal pages and optional external URL checks.
- Source audit and daily/weekly report generation.
- GitHub Actions workflow for scheduled verification and report artifacts.

## Local commands

```bash
npm run build
npm run check:compliance
npm run check:links
npm run audit:sources
npm run report:daily
npm run report:weekly
```

This project has no npm package dependencies. It only needs Node.js 18 or newer.

## Launch setup

1. Buy a domain and point it to Cloudflare Pages or Vercel.
2. Set the build command to `npm run build`.
3. Set the output directory to `dist`.
4. Update `data/site.json`:
   - `baseUrl`
   - `contactEmail`
   - `analytics.googleAnalyticsId`
   - `analytics.searchConsoleVerification`
   - `newsletter.formActionUrl` after connecting an email provider.
5. Apply to affiliate programs for the products that appear most often in guides.
6. Replace approved product links in `data/products.json` using `affiliateUrl`.
7. Run `npm run build && npm run check:compliance && npm run check:links` before every publish.

## Affiliate workflow

Before approval, buttons use the vendor's official website. After approval, add the approved tracking URL to `affiliateUrl` for that product. The build will then mark the link as sponsored and nofollow:

```json
{
  "slug": "example-product",
  "affiliateUrl": "https://approved-network.example/track?id=..."
}
```

Do not add affiliate URLs unless the account is approved and the terms allow the placement.

## Content workflow

Edit `data/articles.json` for buying guides and comparisons. Each article must include:

- `slug`
- `type`
- `category`
- `title`
- `keyword`
- `audience`
- `products`
- `scenario`
- `buyingQuestions`
- `updatedAt`

Edit `data/products.json` for vendor profiles. Every product needs official source URLs so commercial pages stay verifiable.

## Automation

The GitHub workflow in `.github/workflows/site-automation.yml` runs on pushes, daily schedule, and manual dispatch:

- Build static pages.
- Run compliance checks.
- Run internal link checks.
- Audit official source URLs.
- Generate daily and weekly reports.
- Upload report artifacts.

External source audits can fail because some vendor sites block bots. By default, source audit warnings do not fail the workflow. Set `STRICT_SOURCE_AUDIT=1` if you want failed source checks to block publishing.

## Manual account tasks

You only need to help with account login and verification:

- Domain registrar
- Cloudflare Pages or Vercel
- GitHub
- Google Analytics and Search Console
- Affiliate networks such as PartnerStack, Impact, CJ, Amazon Associates, or direct SaaS partner programs
- Email provider for checklist delivery
- PayPal, Stripe, bank, or affiliate payout account

## Guardrails

- No automatic trading.
- No fake reviews.
- No paid placement disguised as independent ranking.
- No bulk low-value AI pages.
- No cold-email spam.
- No guaranteed income claims.
