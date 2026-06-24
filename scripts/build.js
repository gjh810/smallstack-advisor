const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const site = readJson("data/site.json");
const products = readJson("data/products.json");
const articles = readJson("data/articles.json");
const productBySlug = new Map(products.map((product) => [product.slug, product]));
const routes = [];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeRoute(route, html) {
  const normalized = route === "/" ? "/" : `/${route.replace(/^\/|\/$/g, "")}/`;
  const filePath =
    normalized === "/"
      ? path.join(dist, "index.html")
      : path.join(dist, normalized, "index.html");
  ensureDir(filePath);
  fs.writeFileSync(filePath, html, "utf8");
  routes.push(normalized);
}

function writeFile(relativePath, content) {
  const filePath = path.join(dist, relativePath);
  ensureDir(filePath);
  fs.writeFileSync(filePath, content, "utf8");
}

function copyDir(src, target) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(from, to);
    } else {
      fs.copyFileSync(from, to);
    }
  }
}

function absoluteUrl(route) {
  const base = site.baseUrl.replace(/\/$/, "");
  return `${base}${route}`;
}

function categoryLabel(category) {
  return site.categories[category]?.label || titleCase(category);
}

function titleCase(value) {
  return String(value)
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pathForArticle(article) {
  return article.type === "comparison"
    ? `/comparisons/${article.slug}/`
    : `/guides/${article.slug}/`;
}

function linkToProduct(product) {
  return `/products/${product.slug}/`;
}

function commercialLink(product, label = "Visit official site") {
  const isAffiliate = Boolean(product.affiliateUrl);
  const href = isAffiliate ? product.affiliateUrl : product.website;
  const rel = isAffiliate ? "sponsored nofollow noopener" : "nofollow noopener";
  const note = isAffiliate ? "Partner link" : "Official site";
  return `<a class="button primary" href="${escapeHtml(href)}" rel="${rel}" target="_blank" data-affiliate="${isAffiliate}" data-track="outbound" data-product="${escapeHtml(product.slug)}">${escapeHtml(label)} <span aria-hidden="true">-></span><span class="sr-only"> (${escapeHtml(note)}, opens in a new tab)</span></a>`;
}

function sourceLinks(product) {
  return unique([product.pricingUrl, ...product.sourceUrls]).map((url) => {
    return `<a href="${escapeHtml(url)}" rel="nofollow noopener" target="_blank" data-source-link="true">Source</a>`;
  }).join("");
}

function disclosureNote() {
  return `
    <aside class="disclosure-note" aria-label="Affiliate disclosure">
      <strong>Disclosure:</strong> Some outbound links may become sponsored after partner approval. We mark paid links, keep vendor sources visible, and do not publish paid placement as an independent ranking.
      <a href="/affiliate-disclosure/">Read the full disclosure</a>.
    </aside>
  `;
}

function layout({ title, description, route, body, pageKind = "standard", requiresSources = false }) {
  const navCategories = ["scheduling", "invoicing", "crm", "email", "forms"]
    .map((category) => `<a href="/categories/${category}/">${escapeHtml(categoryLabel(category))}</a>`)
    .join("");
  const analyticsHead = site.analytics?.googleAnalyticsId ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(site.analytics.googleAnalyticsId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag("js", new Date());
    gtag("config", "${escapeHtml(site.analytics.googleAnalyticsId)}");
  </script>` : "";
  const searchConsoleMeta = site.analytics?.searchConsoleVerification
    ? `<meta name="google-site-verification" content="${escapeHtml(site.analytics.searchConsoleVerification)}">`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} | ${escapeHtml(site.siteName)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  ${searchConsoleMeta}
  <link rel="canonical" href="${escapeHtml(absoluteUrl(route))}">
  <link rel="stylesheet" href="/assets/site.css">
  <script defer src="/assets/site.js"></script>
  ${analyticsHead}
</head>
<body data-page-kind="${escapeHtml(pageKind)}" data-requires-sources="${requiresSources}">
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="${escapeHtml(site.siteName)} home">
        <span class="brand-mark" aria-hidden="true">SS</span>
        <span>
          <strong>${escapeHtml(site.siteName)}</strong>
          <small>${escapeHtml(site.tagline)}</small>
        </span>
      </a>
      <nav class="main-nav" aria-label="Primary navigation">
        ${navCategories}
        <a href="/affiliate-disclosure/">Disclosure</a>
      </nav>
    </div>
  </header>
  <main id="main">
    ${body}
  </main>
  <footer class="site-footer">
    <div>
      <strong>${escapeHtml(site.siteName)}</strong>
      <p>Practical software shortlists for small businesses. Always confirm current pricing and terms on the vendor site before buying.</p>
    </div>
    <nav aria-label="Footer navigation">
      <a href="/affiliate-disclosure/">Affiliate disclosure</a>
      <a href="/privacy/">Privacy</a>
      <a href="/checklist/">Software checklist</a>
      <a href="/sitemap.xml">Sitemap</a>
    </nav>
  </footer>
</body>
</html>`;
}

function productCard(product, options = {}) {
  const sourceMarkup = sourceLinks(product);
  return `
    <article class="product-card">
      <div class="card-topline">
        <span class="product-icon" aria-hidden="true">${escapeHtml(product.name.slice(0, 2).toUpperCase())}</span>
        <span>${escapeHtml(product.categories.map(categoryLabel).join(" + "))}</span>
      </div>
      <h3><a href="${linkToProduct(product)}">${escapeHtml(product.name)}</a></h3>
      <p>${escapeHtml(product.bestFor)}</p>
      <ul class="compact-list">
        ${product.coreFeatures.slice(0, options.featureLimit || 3).map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
      </ul>
      <div class="card-actions">
        ${commercialLink(product)}
        <a class="button secondary" href="${linkToProduct(product)}">Read profile</a>
      </div>
      <div class="source-row">${sourceMarkup}</div>
    </article>
  `;
}

function comparisonTable(articleProducts) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Tool</th>
            <th>Best fit</th>
            <th>Core strengths to verify</th>
            <th>Watchout</th>
          </tr>
        </thead>
        <tbody>
          ${articleProducts.map((product) => `
            <tr>
              <td><a href="${linkToProduct(product)}">${escapeHtml(product.name)}</a></td>
              <td>${escapeHtml(product.bestFor)}</td>
              <td>${escapeHtml(product.coreFeatures.slice(0, 4).join(", "))}</td>
              <td>${escapeHtml(product.watchouts[0] || "Confirm fit against current vendor docs.")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function homePage() {
  const featuredArticles = articles.slice(0, 9);
  const categoryCards = Object.entries(site.categories)
    .filter(([category]) => ["scheduling", "invoicing", "crm", "email", "forms", "accounting"].includes(category))
    .map(([category, details]) => {
      const count = articles.filter((article) => article.category === category).length;
      return `
        <a class="category-card" href="/categories/${category}/" data-category="${escapeHtml(category)}">
          <span class="category-symbol" aria-hidden="true">${escapeHtml(details.label.slice(0, 1))}</span>
          <strong>${escapeHtml(details.label)}</strong>
          <span>${escapeHtml(details.description)}</span>
          <small>${count} buying guides</small>
        </a>
      `;
    }).join("");

  const body = `
    <section class="hero-band">
      <div class="hero-grid">
        <div>
          <p class="eyebrow">Small business software selector</p>
          <h1>Pick the next tool in your stack with fewer tabs open.</h1>
          <p class="hero-copy">Use the selector, compare shortlists, then verify pricing and feature details from official vendor sources before you buy.</p>
          ${disclosureNote()}
        </div>
        <form class="selector-panel" id="software-selector" action="/categories/scheduling/">
          <img class="workflow-visual" src="/assets/stack-workflow.svg" alt="" loading="eager">
          <label for="category">I need help with</label>
          <select id="category" name="category">
            <option value="scheduling">Scheduling and booking</option>
            <option value="invoicing">Invoices and billing</option>
            <option value="crm">CRM and follow-up</option>
            <option value="email">Email marketing</option>
            <option value="forms">Forms and intake</option>
          </select>
          <label for="business-type">Business type</label>
          <input id="business-type" name="business" type="text" placeholder="consultant, salon, agency, studio">
          <button class="button primary full" type="submit">Show matches <span aria-hidden="true">-></span></button>
          <p class="panel-note">Compare shortlists without creating an account.</p>
        </form>
      </div>
    </section>
    <section class="content-section">
      <div class="section-heading">
        <p class="eyebrow">Browse by job</p>
        <h2>Start with the workflow you are fixing.</h2>
      </div>
      <div class="category-grid">${categoryCards}</div>
    </section>
    <section class="content-section muted-section">
      <div class="section-heading">
        <p class="eyebrow">Buying-intent guides</p>
        <h2>Guides for purchase-ready questions.</h2>
      </div>
      <div class="guide-list">
        ${featuredArticles.map((article) => articleListItem(article)).join("")}
      </div>
    </section>
    ${newsletterBlock()}
  `;
  return layout({
    title: "Small Business Software Selector",
    description: "Compare scheduling, invoicing, CRM, email, and form software for small businesses using official vendor sources.",
    route: "/",
    pageKind: "home",
    body
  });
}

function articleListItem(article) {
  const route = pathForArticle(article);
  return `
    <article class="guide-row" data-keywords="${escapeHtml(`${article.keyword} ${article.audience} ${article.category}`)}">
      <div>
        <span class="pill">${escapeHtml(categoryLabel(article.category))}</span>
        <h3><a href="${route}">${escapeHtml(article.title)}</a></h3>
        <p>${escapeHtml(article.scenario)}</p>
      </div>
      <a class="text-link" href="${route}">Open guide <span aria-hidden="true">-></span></a>
    </article>
  `;
}

function newsletterBlock() {
  const newsletter = site.newsletter || {};
  const action = newsletter.formActionUrl || "/checklist/";
  const method = newsletter.method || "get";
  return `
    <section class="newsletter-band" id="newsletter">
      <div>
        <p class="eyebrow">Checklist</p>
        <h2>Get the small business software checklist.</h2>
        <p>Use it to compare price page details, required integrations, migration risk, and follow-up tasks before opening a trial.</p>
      </div>
      <form class="newsletter-form" id="newsletter-form" action="${escapeHtml(action)}" method="${escapeHtml(method)}">
        <label for="email">Work email</label>
        <div class="inline-form">
          <input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
          <button class="button primary" type="submit">Get checklist</button>
        </div>
        <p class="form-status" aria-live="polite"></p>
      </form>
    </section>
  `;
}

function categoryPage(category, details) {
  const categoryArticles = articles.filter((article) => article.category === category);
  const categoryProducts = products.filter((product) => product.categories.includes(category));
  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">${escapeHtml(details.label)}</p>
      <h1>${escapeHtml(details.label)} software for small businesses</h1>
      <p>${escapeHtml(details.description)}</p>
      ${disclosureNote()}
    </section>
    <section class="content-section">
      <div class="section-heading">
        <h2>Guides</h2>
        <p>${categoryArticles.length} buying pages in this category.</p>
      </div>
      <div class="guide-list">
        ${categoryArticles.map((article) => articleListItem(article)).join("")}
      </div>
    </section>
    <section class="content-section muted-section">
      <div class="section-heading">
        <h2>Products covered</h2>
        <p>Profiles link to official pricing and feature sources.</p>
      </div>
      <div class="card-grid">
        ${categoryProducts.map((product) => productCard(product)).join("")}
      </div>
    </section>
  `;
  return layout({
    title: `${details.label} Software`,
    description: details.description,
    route: `/categories/${category}/`,
    pageKind: "category",
    requiresSources: true,
    body
  });
}

function productPage(product) {
  const relatedArticles = articles.filter((article) => article.products.includes(product.slug)).slice(0, 6);
  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">${escapeHtml(product.categories.map(categoryLabel).join(" + "))}</p>
      <h1>${escapeHtml(product.name)} profile</h1>
      <p>${escapeHtml(product.bestFor)}</p>
      <div class="hero-actions">
        ${commercialLink(product)}
        <a class="button secondary" href="${escapeHtml(product.pricingUrl)}" rel="nofollow noopener" target="_blank" data-source-link="true">Check pricing <span aria-hidden="true">-></span></a>
      </div>
      ${disclosureNote()}
    </section>
    <section class="content-section two-column">
      <div>
        <h2>What it is usually used for</h2>
        <p>${escapeHtml(product.bestFor)}</p>
        <h2>Core features to verify</h2>
        <ul class="check-list">
          ${product.coreFeatures.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}
        </ul>
      </div>
      <aside class="fact-panel">
        <h2>Commercial data</h2>
        <dl>
          <dt>Partner status</dt>
          <dd>${escapeHtml(product.partnerNetwork)}</dd>
          <dt>Commission type</dt>
          <dd>${escapeHtml(product.commissionType)}</dd>
          <dt>Regions</dt>
          <dd>${escapeHtml(product.regions.join(", "))}</dd>
          <dt>Last checked</dt>
          <dd>${escapeHtml(product.lastCheckedAt)}</dd>
        </dl>
      </aside>
    </section>
    <section class="content-section muted-section">
      <div class="section-heading">
        <h2>Watchouts</h2>
        <p>Use these as prompts before starting a trial.</p>
      </div>
      <ul class="check-list">
        ${product.watchouts.map((watchout) => `<li>${escapeHtml(watchout)}</li>`).join("")}
        <li>Confirm the current plan limits, regional availability, and payment terms on the official vendor site.</li>
      </ul>
      <div class="source-row large">${sourceLinks(product)}</div>
    </section>
    <section class="content-section">
      <div class="section-heading">
        <h2>Related guides</h2>
        <p>Pages that include ${escapeHtml(product.name)} in the shortlist.</p>
      </div>
      <div class="guide-list">
        ${relatedArticles.map((article) => articleListItem(article)).join("") || "<p>No related guides yet.</p>"}
      </div>
    </section>
  `;
  return layout({
    title: `${product.name} Review Profile`,
    description: `${product.name} profile with best-fit notes, official sources, partner status, and related small-business buying guides.`,
    route: `/products/${product.slug}/`,
    pageKind: "product",
    requiresSources: true,
    body
  });
}

function articlePage(article) {
  const articleProducts = article.products.map((slug) => productBySlug.get(slug)).filter(Boolean);
  const sources = unique(articleProducts.flatMap((product) => [product.pricingUrl, ...product.sourceUrls]));
  const route = pathForArticle(article);
  const body = `
    <article class="article-page">
      <header class="article-header">
        <p class="eyebrow">${escapeHtml(categoryLabel(article.category))} guide</p>
        <h1>${escapeHtml(article.title)}</h1>
        <p>${escapeHtml(article.scenario)}</p>
        <div class="meta-row">
          <span>Audience: ${escapeHtml(article.audience)}</span>
          <span>Updated: ${escapeHtml(article.updatedAt)}</span>
        </div>
        ${disclosureNote()}
      </header>
      <section class="content-section">
        <h2>Fast recommendation</h2>
        <p>Start by choosing the tool that matches your workflow, then verify the current plan page before opening a trial. This guide does not rank vendors by paid placement.</p>
        ${comparisonTable(articleProducts)}
      </section>
      <section class="content-section muted-section">
        <div class="section-heading">
          <h2>Shortlist</h2>
          <p>Use these notes to decide which vendor pages deserve your time.</p>
        </div>
        <div class="card-grid">
          ${articleProducts.map((product) => productCard(product, { featureLimit: 4 })).join("")}
        </div>
      </section>
      <section class="content-section two-column">
        <div>
          <h2>Questions before you buy</h2>
          <ul class="check-list">
            ${article.buyingQuestions.map((question) => `<li>${escapeHtml(question)}</li>`).join("")}
            <li>What data will you need to migrate if you switch tools later?</li>
          </ul>
        </div>
        <aside class="fact-panel">
          <h2>Selection rule</h2>
          <p>Pick the narrowest tool that solves the workflow you have today, but avoid tools that block a realistic next step such as adding a teammate, collecting payment, or exporting customer data.</p>
        </aside>
      </section>
      <section class="content-section">
        <h2>Official sources checked</h2>
        <p>Pricing and feature pages change. Confirm plan limits, fees, regions, and terms directly with the vendor.</p>
        <div class="source-list">
          ${sources.map((url) => `<a href="${escapeHtml(url)}" rel="nofollow noopener" target="_blank" data-source-link="true">${escapeHtml(url)}</a>`).join("")}
        </div>
      </section>
    </article>
  `;
  return layout({
    title: article.title,
    description: `${article.title}: compare ${articleProducts.map((product) => product.name).join(", ")} for ${article.audience}.`,
    route,
    pageKind: article.type,
    requiresSources: true,
    body
  });
}

function disclosurePage() {
  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">Disclosure</p>
      <h1>Affiliate disclosure</h1>
      <p>SmallStack Advisor may earn commissions from qualifying purchases or partner referrals after affiliate approval.</p>
    </section>
    <section class="content-section narrow">
      <h2>How links work</h2>
      <p>Some outbound links may be ordinary links today and sponsored links later if a vendor or network approves the site. Sponsored links are marked in the HTML with sponsored/no-follow relationship attributes.</p>
      <h2>Editorial policy</h2>
      <p>Pages are built from structured vendor data, official pricing and feature sources, and workflow-based selection criteria. We do not claim hands-on testing unless that evidence is added to the content data.</p>
      <h2>Your responsibility</h2>
      <p>Always confirm current pricing, plan limits, regional availability, taxes, processing fees, and contract terms on the vendor website before buying.</p>
    </section>
  `;
  return layout({
    title: "Affiliate Disclosure",
    description: "Affiliate and editorial disclosure for SmallStack Advisor.",
    route: "/affiliate-disclosure/",
    pageKind: "policy",
    body
  });
}

function privacyPage() {
  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">Privacy</p>
      <h1>Privacy policy</h1>
      <p>This static site is designed to collect the minimum data needed for analytics, outbound click tracking, and optional email signup.</p>
    </section>
    <section class="content-section narrow">
      <h2>Data we may collect</h2>
      <p>When analytics or an email provider is connected, the site may process page views, outbound clicks, email signup details, and technical information such as browser and device data.</p>
      <h2>Email</h2>
      <p>If you request a checklist or newsletter, your email address is used to send the requested material and related software buying updates. Every email should include an unsubscribe link through the configured provider.</p>
      <h2>Affiliate links</h2>
      <p>Affiliate networks may use cookies or tracking parameters when you click a partner link. Their privacy terms apply after you leave this site.</p>
      <h2>Contact</h2>
      <p>Email <a href="mailto:${escapeHtml(site.contactEmail)}">${escapeHtml(site.contactEmail)}</a> for privacy or correction requests.</p>
    </section>
  `;
  return layout({
    title: "Privacy Policy",
    description: "Privacy policy for SmallStack Advisor.",
    route: "/privacy/",
    pageKind: "policy",
    body
  });
}

function checklistPage() {
  const body = `
    <section class="page-hero compact">
      <p class="eyebrow">Checklist</p>
      <h1>Small business software buying checklist</h1>
      <p>Use this before opening a trial or adding a paid seat.</p>
    </section>
    <section class="content-section two-column">
      <div>
        <h2>Before trial</h2>
        <ul class="check-list">
          <li>Write the workflow you are fixing in one sentence.</li>
          <li>List the current tool or spreadsheet this will replace.</li>
          <li>Confirm the current pricing page, plan limits, and add-on fees.</li>
          <li>Check whether the tool supports your country, currency, tax needs, and payment processor.</li>
        </ul>
        <h2>During trial</h2>
        <ul class="check-list">
          <li>Create one real workflow with sample data.</li>
          <li>Invite the teammate or accountant who will actually use it.</li>
          <li>Test export, cancellation, and support response paths.</li>
          <li>Record the exact plan needed for your use case.</li>
        </ul>
      </div>
      <aside class="fact-panel">
        <h2>Launch target</h2>
        <p>Choose one tool only when it saves repeated manual work, has a clear owner, and will not create a second place where customer or billing data must be maintained.</p>
      </aside>
    </section>
  `;
  return layout({
    title: "Software Buying Checklist",
    description: "A practical checklist for small businesses comparing software before opening a trial.",
    route: "/checklist/",
    pageKind: "checklist",
    body
  });
}

function sitemapXml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes.map((route) => `  <url><loc>${escapeHtml(absoluteUrl(route))}</loc></url>`).join("\n")}
</urlset>
`;
}

function robotsTxt() {
  return `User-agent: *
Allow: /
Sitemap: ${site.baseUrl.replace(/\/$/, "")}/sitemap.xml
`;
}

function validateData() {
  const missingProducts = [];
  for (const article of articles) {
    for (const slug of article.products) {
      if (!productBySlug.has(slug)) {
        missingProducts.push(`${article.slug}: ${slug}`);
      }
    }
  }
  if (missingProducts.length) {
    throw new Error(`Articles reference unknown products:\n${missingProducts.join("\n")}`);
  }
  if (articles.length < 30) {
    throw new Error(`Expected at least 30 articles, found ${articles.length}.`);
  }
}

function build() {
  validateData();
  cleanDir(dist);
  copyDir(path.join(root, "public"), dist);

  writeRoute("/", homePage());
  writeRoute("/affiliate-disclosure/", disclosurePage());
  writeRoute("/privacy/", privacyPage());
  writeRoute("/checklist/", checklistPage());

  for (const [category, details] of Object.entries(site.categories)) {
    const hasContent =
      articles.some((article) => article.category === category) ||
      products.some((product) => product.categories.includes(category));
    if (hasContent) {
      writeRoute(`/categories/${category}/`, categoryPage(category, details));
    }
  }

  for (const product of products) {
    writeRoute(`/products/${product.slug}/`, productPage(product));
  }

  for (const article of articles) {
    writeRoute(pathForArticle(article), articlePage(article));
  }

  writeFile("sitemap.xml", sitemapXml());
  writeFile("robots.txt", robotsTxt());
  writeFile("site-index.json", JSON.stringify({
    generatedAt: new Date().toISOString(),
    routes,
    products: products.length,
    articles: articles.length
  }, null, 2));

  console.log(`Built ${routes.length} routes into ${path.relative(root, dist)}.`);
}

build();
