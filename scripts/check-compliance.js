const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const products = readJson("data/products.json");
const articles = readJson("data/articles.json");
const failures = [];
const warnings = [];

const forbiddenPhrases = [
  "guaranteed profit",
  "guaranteed income",
  "risk-free profit",
  "make money fast",
  "we personally tested",
  "personally tested",
  "hands-on tested",
  "official ranking",
  "best guaranteed"
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
    } else if (entry.name.endsWith(".html")) {
      files.push(filePath);
    }
  }
  return files;
}

function routeForFile(filePath) {
  const relative = path.relative(dist, filePath).replace(/\\/g, "/");
  if (relative === "index.html") return "/";
  return `/${relative.replace(/\/index\.html$/, "/")}`;
}

function bodyAttr(html, attr) {
  const match = html.match(new RegExp(`data-${attr}="([^"]+)"`));
  return match ? match[1] : "";
}

function validateData() {
  const articleSlugs = new Set();
  for (const article of articles) {
    if (articleSlugs.has(article.slug)) failures.push(`Duplicate article slug: ${article.slug}`);
    articleSlugs.add(article.slug);
    if (!article.title || !article.keyword || !article.products?.length) {
      failures.push(`Article is missing required fields: ${article.slug}`);
    }
  }

  if (articles.length < 30) {
    failures.push(`Expected at least 30 launch articles, found ${articles.length}.`);
  }

  for (const product of products) {
    const required = ["slug", "name", "website", "pricingUrl", "commissionType", "regions", "categories", "sourceUrls", "lastCheckedAt"];
    for (const field of required) {
      if (!product[field] || (Array.isArray(product[field]) && product[field].length === 0)) {
        failures.push(`Product ${product.slug || product.name} is missing ${field}.`);
      }
    }
    for (const url of [product.website, product.pricingUrl, product.affiliateUrl, ...(product.sourceUrls || [])].filter(Boolean)) {
      try {
        new URL(url);
      } catch {
        failures.push(`Invalid URL for ${product.slug}: ${url}`);
      }
    }
    if (!product.affiliateUrl) {
      warnings.push(`No affiliate URL configured for ${product.name}; official link fallback is active.`);
    }
  }
}

function validateHtmlFiles() {
  const files = walk(dist);
  if (!files.length) {
    failures.push("No built HTML files found. Run the build first.");
    return;
  }

  for (const filePath of files) {
    const html = fs.readFileSync(filePath, "utf8");
    const route = routeForFile(filePath);
    const pageKind = bodyAttr(html, "page-kind");
    const requiresSources = bodyAttr(html, "requires-sources") === "true";
    const isCommercial = ["home", "category", "product", "best", "comparison"].includes(pageKind);
    const lower = html.toLowerCase();

    for (const phrase of forbiddenPhrases) {
      if (lower.includes(phrase)) {
        failures.push(`${route} contains forbidden phrase: ${phrase}`);
      }
    }

    if (isCommercial && !html.includes("Affiliate disclosure")) {
      failures.push(`${route} is commercial but has no visible affiliate disclosure.`);
    }

    if (requiresSources && !html.includes('data-source-link="true"')) {
      failures.push(`${route} requires official sources but has no source links.`);
    }

    const affiliateLinks = html.match(/<a\b[^>]*data-affiliate="true"[^>]*>/g) || [];
    for (const link of affiliateLinks) {
      if (!/rel="[^"]*sponsored[^"]*nofollow[^"]*"/.test(link)) {
        failures.push(`${route} has affiliate link missing sponsored nofollow rel: ${link}`);
      }
      if (!/target="_blank"/.test(link)) {
        failures.push(`${route} has affiliate link missing target blank: ${link}`);
      }
    }

    const monetizedLinks = html.match(/<a\b[^>]*data-track="outbound"[^>]*>/g) || [];
    for (const link of monetizedLinks) {
      if (!/rel="[^"]*nofollow[^"]*"/.test(link)) {
        failures.push(`${route} has outbound commercial link missing nofollow rel: ${link}`);
      }
    }
  }
}

function main() {
  validateData();
  validateHtmlFiles();

  if (warnings.length) {
    console.warn(`Compliance warnings (${warnings.length}):`);
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (failures.length) {
    console.error(`Compliance failures (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Compliance check passed with ${articles.length} articles and ${products.length} products.`);
}

main();
