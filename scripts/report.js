const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportsDir = path.join(root, "reports");
const products = readJson("data/products.json");
const articles = readJson("data/articles.json");
const site = readJson("data/site.json");
const mode = process.argv[2] === "weekly" ? "weekly" : "daily";

function readJson(relativePath, fallback = null) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function maybeReport(name) {
  return readJson(`reports/${name}.json`, null);
}

function byCategory(items, key = "category") {
  return items.reduce((counts, item) => {
    const category = item[key];
    counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});
}

function nextKeywordIdeas() {
  const counts = byCategory(articles);
  return Object.entries(site.categories)
    .filter(([category]) => counts[category])
    .sort((a, b) => (counts[a[0]] || 0) - (counts[b[0]] || 0))
    .slice(0, 5)
    .map(([category, details]) => `best ${details.label.toLowerCase()} software for small business teams`);
}

function dailyReport() {
  const linkCheck = maybeReport("link-check");
  const sourceAudit = maybeReport("source-audit");
  const index = readJson("dist/site-index.json", {});
  return `# Daily Site Report

Generated: ${new Date().toISOString()}

## Inventory
- Built routes: ${index.routes?.length || "not built"}
- Launch articles: ${articles.length}
- Product profiles: ${products.length}
- Products with affiliate links configured: ${products.filter((product) => product.affiliateUrl).length}
- Products using official-link fallback: ${products.filter((product) => !product.affiliateUrl).length}

## Quality Checks
- Internal link check: ${linkCheck ? (linkCheck.failures.length ? "failures found" : "passed") : "not run"}
- External link check: ${linkCheck?.checkedExternal ? "enabled" : "skipped"}
- Source audit: ${sourceAudit ? `${sourceAudit.passed}/${sourceAudit.urls} passed` : "not run"}

## Manual Account Tasks
- Connect Search Console after the production domain is live.
- Paste approved affiliate URLs into data/products.json.
- Connect an email provider endpoint for checklist delivery.
`;
}

function weeklyReport() {
  const categoryCounts = byCategory(articles);
  const productCounts = products.reduce((counts, product) => {
    for (const category of product.categories) counts[category] = (counts[category] || 0) + 1;
    return counts;
  }, {});

  return `# Weekly Growth Plan

Generated: ${new Date().toISOString()}

## Current Coverage
${Object.entries(site.categories)
  .filter(([category]) => categoryCounts[category] || productCounts[category])
  .map(([category, details]) => `- ${details.label}: ${categoryCounts[category] || 0} guides, ${productCounts[category] || 0} products`)
  .join("\n")}

## Next Keyword Ideas
${nextKeywordIdeas().map((idea) => `- ${idea}`).join("\n")}

## Partner Follow-up
- Prioritize affiliate applications for tools already appearing in 3 or more guides.
- Replace only approved URLs, then rerun compliance checks before publishing.
- Keep official pricing and feature source URLs visible on every commercial page.
`;
}

function main() {
  fs.mkdirSync(reportsDir, { recursive: true });
  const filename = mode === "weekly" ? "weekly-plan.md" : "daily-report.md";
  const content = mode === "weekly" ? weeklyReport() : dailyReport();
  fs.writeFileSync(path.join(reportsDir, filename), content, "utf8");
  console.log(`Wrote reports/${filename}.`);
}

main();
