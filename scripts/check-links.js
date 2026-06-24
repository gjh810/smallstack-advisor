const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const reportsDir = path.join(root, "reports");
const checkExternal = process.env.CHECK_EXTERNAL === "1";
const failures = [];
const external = [];

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

function extractRefs(html) {
  const refs = [];
  const attrPattern = /\b(?:href|src|action)="([^"]+)"/g;
  let match;
  while ((match = attrPattern.exec(html))) {
    refs.push(match[1]);
  }
  return refs;
}

function internalTargetExists(ref) {
  const url = new URL(ref, "https://local.test");
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === "/") {
    return fs.existsSync(path.join(dist, "index.html"));
  }

  const direct = path.join(dist, pathname);
  if (path.extname(pathname)) {
    return fs.existsSync(direct);
  }

  return fs.existsSync(path.join(direct, "index.html"));
}

async function fetchStatus(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    let response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "SmallStackAdvisorLinkCheck/1.0" }
    });
    if (response.status === 405 || response.status === 403) {
      response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "SmallStackAdvisorLinkCheck/1.0" }
      });
    }
    return { url, ok: response.ok, status: response.status };
  } catch (error) {
    return { url, ok: false, error: error.message };
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  const files = walk(dist);
  for (const filePath of files) {
    const route = routeForFile(filePath);
    const html = fs.readFileSync(filePath, "utf8");
    for (const ref of extractRefs(html)) {
      if (!ref || ref.startsWith("#") || ref.startsWith("mailto:") || ref.startsWith("tel:")) continue;
      if (/^https?:\/\//.test(ref)) {
        external.push(ref);
        continue;
      }
      if (ref.startsWith("/")) {
        if (!internalTargetExists(ref)) {
          failures.push(`${route} links to missing internal target: ${ref}`);
        }
      }
    }
  }

  const externalResults = [];
  if (checkExternal) {
    const uniqueExternal = [...new Set(external)];
    for (const url of uniqueExternal) {
      externalResults.push(await fetchStatus(url));
    }
    for (const result of externalResults) {
      if (!result.ok) {
        failures.push(`External check failed: ${result.url} (${result.status || result.error})`);
      }
    }
  }

  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "link-check.json"), JSON.stringify({
    generatedAt: new Date().toISOString(),
    checkedExternal: checkExternal,
    internalPages: files.length,
    externalLinks: [...new Set(external)].length,
    externalResults,
    failures
  }, null, 2));

  if (failures.length) {
    console.error(`Link check failures (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }

  console.log(`Link check passed for ${files.length} HTML files. External checks ${checkExternal ? "enabled" : "skipped"}.`);
}

main();
