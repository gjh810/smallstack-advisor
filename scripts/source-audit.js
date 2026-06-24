const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const reportsDir = path.join(root, "reports");
const products = JSON.parse(fs.readFileSync(path.join(root, "data/products.json"), "utf8"));
const strict = process.env.STRICT_SOURCE_AUDIT === "1";

function collectUrls() {
  return [...new Set(products.flatMap((product) => [
    product.website,
    product.pricingUrl,
    ...(product.sourceUrls || [])
  ]).filter(Boolean))];
}

async function auditUrl(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "SmallStackAdvisorSourceAudit/1.0" }
    });
    if ([403, 405, 406].includes(response.status)) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "SmallStackAdvisorSourceAudit/1.0" }
      });
    }
    return {
      url,
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") || ""
    };
  } catch (error) {
    return { url, ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function runLimited(items, limit, worker) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main() {
  const urls = collectUrls();
  const results = await runLimited(urls, 6, auditUrl);

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "source-audit.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    urls: urls.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    results
  }, null, 2));

  const failures = results.filter((result) => !result.ok);
  if (failures.length) {
    console.warn(`Source audit completed with ${failures.length} warnings.`);
    for (const failure of failures.slice(0, 10)) {
      console.warn(`- ${failure.url}: ${failure.status || failure.error}`);
    }
    if (strict) process.exit(1);
    return;
  }

  console.log(`Source audit passed for ${results.length} URLs.`);
}

main();
