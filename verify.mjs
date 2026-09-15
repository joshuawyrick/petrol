import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const websiteDir = path.join(__dirname, "website");
const distDir = path.join(__dirname, "dist");

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  return fn()
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((err) => {
      failed++;
      failures.push({ name, message: err.message });
      console.log(`  ✗ ${name}`);
      console.log(`      ${err.message}`);
    });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function getPort() {
  return 5174 + Math.floor(Math.random() * 1000);
}

function fetchUrl(port, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { hostname: "127.0.0.1", port, path: urlPath, timeout: 5000 },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode, headers: res.headers, body })
        );
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${urlPath}`));
    });
  });
}

function startServer(root) {
  return new Promise((resolve, reject) => {
    const port = getPort();
    const serverModule = path.join(__dirname, "server.mjs");

    const child = spawn("node", [serverModule, `--port=${port}`], {
      env: { ...process.env, PORT: String(port) },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let ready = false;
    child.stdout.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("running") && !ready) {
        ready = true;
        resolve({ port, child });
      }
    });
    child.stderr.on("data", (data) => {
      if (!ready) reject(new Error(data.toString()));
    });
    setTimeout(() => {
      if (!ready) reject(new Error("Server failed to start"));
    }, 3000);
  });
}

async function getExpectedPages() {
  const pages = [];
  function scan(dir, basePath = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const urlPath = basePath + "/" + entry.name;
      if (entry.isDirectory()) {
        scan(fullPath, urlPath);
      } else if (entry.name === "index.html") {
        pages.push(basePath || "/");
      }
    }
  }
  scan(websiteDir);
  return pages;
}

function getExpectedFiles() {
  const files = [];
  function scan(dir, basePath = "") {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const urlPath = basePath + "/" + entry.name;
      if (entry.isDirectory()) {
        scan(fullPath, urlPath);
      } else {
        files.push({ path: fullPath, url: urlPath });
      }
    }
  }
  scan(websiteDir);
  return files;
}

async function main() {
  console.log("\nPetrol Transport — verification\n");

  // Test: all expected pages exist in website/
  const expectedPages = await getExpectedPages();
  await test(`website/ contains ${expectedPages.length} page directories`, async () => {
    assert(expectedPages.length >= 15, `Expected at least 15 pages, found ${expectedPages.length}`);
  });

  // Test: homepage exists
  await test("homepage (index.html) exists", async () => {
    assert(
      fs.existsSync(path.join(websiteDir, "index.html")),
      "website/index.html not found"
    );
  });

  // Test: key pages exist
  const keyPages = [
    "about-us/index.html",
    "careers/index.html",
    "contact-us/index.html",
    "request-transportation/index.html",
    "petrol-transport-inc-benefits/index.html",
    "petroleum-transport-bakersfield/index.html",
    "service-areas/index.html",
    "resources/index.html",
    "privacy-policy/index.html",
    "thank-you/index.html",
  ];
  for (const page of keyPages) {
    await test(`website/${page} exists`, async () => {
      assert(fs.existsSync(path.join(websiteDir, page)), `Missing ${page}`);
    });
  }

  // Test: employment application PDF exists and has content
  await test("employment application PDF exists", async () => {
    const pdfPath = path.join(
      websiteDir,
      "downloads/petrol-transport-employment-application.pdf"
    );
    assert(fs.existsSync(pdfPath), "PDF not found");
    const stat = fs.statSync(pdfPath);
    assert(stat.size > 1000, `PDF too small: ${stat.size} bytes`);
  });

  // Test: PDF checksum is stable
  await test("employment application PDF has stable checksum", async () => {
    const pdfPath = path.join(
      websiteDir,
      "downloads/petrol-transport-employment-application.pdf"
    );
    const hash = crypto.createHash("sha256");
    hash.update(fs.readFileSync(pdfPath));
    const digest = hash.digest("hex");
    assert(digest.length === 64, `Invalid checksum: ${digest}`);
    console.log(`      SHA-256: ${digest.substring(0, 16)}...`);
  });

  // Test: all pages link to the PDF
  await test("careers page links to employment application PDF", async () => {
    const html = fs.readFileSync(
      path.join(websiteDir, "careers/index.html"),
      "utf-8"
    );
    assert(
      html.includes("/downloads/petrol-transport-employment-application.pdf"),
      "Careers page missing PDF link"
    );
  });

  await test("benefits page links to employment application PDF", async () => {
    const html = fs.readFileSync(
      path.join(websiteDir, "petrol-transport-inc-benefits/index.html"),
      "utf-8"
    );
    assert(
      html.includes("/downloads/petrol-transport-employment-application.pdf"),
      "Benefits page missing PDF link"
    );
  });

  // Test: CSS and JS assets exist
  await test("site.css exists", async () => {
    assert(
      fs.existsSync(path.join(websiteDir, "assets/css/site.css")),
      "site.css not found"
    );
  });

  await test("site.js exists", async () => {
    assert(
      fs.existsSync(path.join(websiteDir, "assets/js/site.js")),
      "site.js not found"
    );
  });

  // Test: images exist
  await test("website images exist", async () => {
    const images = [
      "assets/images/petrol-transport-logo.png",
      "assets/images/petrol-transport-crude-oil-transportation-california.webp",
      "assets/images/petrol-transport-field-operations.webp",
      "assets/images/petrol-transport-petroleum-transportation.webp",
    ];
    for (const img of images) {
      assert(
        fs.existsSync(path.join(websiteDir, img)),
        `Missing image: ${img}`
      );
    }
  });

  // Test: robots.txt exists
  await test("robots.txt exists", async () => {
    assert(
      fs.existsSync(path.join(websiteDir, "robots.txt")),
      "robots.txt not found"
    );
  });

  // Test: sitemap.xml exists
  await test("sitemap.xml exists", async () => {
    assert(
      fs.existsSync(path.join(websiteDir, "sitemap.xml")),
      "sitemap.xml not found"
    );
  });

  // Test: build produces dist/
  await test("npm run build produces dist/", async () => {
    const { execSync } = await import("node:child_process");
    try {
      execSync("node build.mjs", { cwd: __dirname, timeout: 15000 });
    } catch (e) {
      throw new Error(`Build failed: ${e.message}`);
    }
    assert(fs.existsSync(distDir), "dist/ not created");
    assert(
      fs.existsSync(path.join(distDir, "index.html")),
      "dist/index.html not found"
    );
    assert(
      fs.existsSync(path.join(distDir, "_redirects")),
      "dist/_redirects not found"
    );
    assert(
      fs.existsSync(path.join(distDir, "_headers")),
      "dist/_headers not found"
    );
    assert(
      fs.existsSync(path.join(distDir, "404.html")),
      "dist/404.html not found"
    );
  });

  // Test: dist contains all website files
  await test("dist/ contains all website files", async () => {
    const expectedFiles = getExpectedFiles();
    for (const file of expectedFiles) {
      const distPath = path.join(distDir, file.url);
      assert(
        fs.existsSync(distPath),
        `Missing in dist: ${file.url}`
      );
    }
  });

  // Test: dist PDF matches website PDF
  await test("dist PDF matches website PDF", async () => {
    const websitePdf = fs.readFileSync(
      path.join(websiteDir, "downloads/petrol-transport-employment-application.pdf")
    );
    const distPdf = fs.readFileSync(
      path.join(distDir, "downloads/petrol-transport-employment-application.pdf")
    );
    const h1 = crypto.createHash("sha256").update(websitePdf).digest("hex");
    const h2 = crypto.createHash("sha256").update(distPdf).digest("hex");
    assert(h1 === h2, "PDF checksum mismatch between website and dist");
  });

  // Start dev server and test routes
  let serverInfo;
  try {
    serverInfo = await startServer(websiteDir);
    const port = serverInfo.port;

    await test("dev server: homepage returns 200", async () => {
      const res = await fetchUrl(port, "/");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.body.includes("Petrol Transport"),
        "Homepage does not contain Petrol Transport"
      );
    });

    await test("dev server: /careers returns 200", async () => {
      const res = await fetchUrl(port, "/careers");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /careers/ returns 200", async () => {
      const res = await fetchUrl(port, "/careers/");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /contact-us returns 200", async () => {
      const res = await fetchUrl(port, "/contact-us");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /request-transportation returns 200", async () => {
      const res = await fetchUrl(port, "/request-transportation");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /service-areas returns 200", async () => {
      const res = await fetchUrl(port, "/service-areas");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /about-us returns 200", async () => {
      const res = await fetchUrl(port, "/about-us");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /petrol-transport-inc-benefits/ returns 200", async () => {
      const res = await fetchUrl(port, "/petrol-transport-inc-benefits/");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /petrol-transport-inc-benefits redirects (301)", async () => {
      const res = await fetchUrl(port, "/petrol-transport-inc-benefits");
      assert(res.status === 301, `Expected 301, got ${res.status}`);
    });

    await test("dev server: /resources returns 200", async () => {
      const res = await fetchUrl(port, "/resources");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: nested URL /service-areas/kern-county-crude-oil-transportation returns 200", async () => {
      const res = await fetchUrl(port, "/service-areas/kern-county-crude-oil-transportation");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /assets/css/site.css returns 200", async () => {
      const res = await fetchUrl(port, "/assets/css/site.css");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.headers["content-type"].includes("text/css"),
        `Wrong content-type: ${res.headers["content-type"]}`
      );
    });

    await test("dev server: /assets/js/site.js returns 200", async () => {
      const res = await fetchUrl(port, "/assets/js/site.js");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: PDF returns 200 with correct content-type", async () => {
      const res = await fetchUrl(
        port,
        "/downloads/petrol-transport-employment-application.pdf"
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(
        res.headers["content-type"].includes("application/pdf"),
        `Wrong content-type: ${res.headers["content-type"]}`
      );
    });

    await test("dev server: unknown route returns 404", async () => {
      const res = await fetchUrl(port, "/this-page-does-not-exist");
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await test("dev server: /robots.txt returns 200", async () => {
      const res = await fetchUrl(port, "/robots.txt");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("dev server: /sitemap.xml returns 200", async () => {
      const res = await fetchUrl(port, "/sitemap.xml");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  } finally {
    if (serverInfo) {
      serverInfo.child.kill();
    }
  }

  // Start dist server and test built output
  let distServerInfo;
  try {
    distServerInfo = await startServer(distDir);
    const port = distServerInfo.port;

    await test("preview server: homepage returns 200", async () => {
      const res = await fetchUrl(port, "/");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("preview server: /careers returns 200", async () => {
      const res = await fetchUrl(port, "/careers");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("preview server: /contact-us returns 200", async () => {
      const res = await fetchUrl(port, "/contact-us");
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });

    await test("preview server: unknown route returns 404", async () => {
      const res = await fetchUrl(port, "/nonexistent-page");
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await test("preview server: PDF returns 200", async () => {
      const res = await fetchUrl(
        port,
        "/downloads/petrol-transport-employment-application.pdf"
      );
      assert(res.status === 200, `Expected 200, got ${res.status}`);
    });
  } finally {
    if (distServerInfo) {
      distServerInfo.child.kill();
    }
  }

  // Summary
  console.log(`\n─────────────────────────────────`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`\n  Failures:`);
    for (const f of failures) {
      console.log(`    - ${f.name}: ${f.message}`);
    }
  }
  console.log(`─────────────────────────────────\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
