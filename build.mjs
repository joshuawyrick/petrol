import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, "website");
const dest = path.join(__dirname, "dist");

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}

copyDir(src, dest);

const redirects = `# Migration redirects
/petrol-transport-inc-benefits  /petrol-transport-inc-benefits/ 301
`;
fs.writeFileSync(path.join(dest, "_redirects"), redirects);

const headers = `/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`;
fs.writeFileSync(path.join(dest, "_headers"), headers);

const notFound = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Not Found | Petrol Transport Inc.</title>
  <meta name="robots" content="noindex">
  <link rel="icon" href="/assets/images/favicon.png" type="image/png">
  <link rel="stylesheet" href="/assets/css/site.css">
</head>
<body>
<a class="skip-link" href="#main">Skip to main content</a>
<header class="site-header">
  <div class="nav-shell">
    <a class="brand" href="/" aria-label="Petrol Transport Inc. home"><img src="/assets/images/petrol-transport-logo.png" alt="Petrol Transport Inc." width="2172" height="724"></a>
    <nav class="desktop-nav" aria-label="Primary navigation"><a href="/">Home</a><a href="/petroleum-transport-bakersfield">Transportation</a><a href="/service-areas">Service Areas</a><a href="/about-us">About</a><a href="/careers">Careers</a><a href="/contact-us">Contact</a></nav>
  </div>
</header>
<main id="main">
<section class="page-hero"><div class="page-hero-inner"><div><p class="eyebrow">Error 404</p><h1>Page Not Found</h1><p>The page you are looking for may have been moved or no longer exists. Please use the navigation above or return to the homepage.</p><div class="hero-actions"><a class="btn btn-primary" href="/">Return Home</a><a class="btn btn-outline" href="tel:+16613936514">Call 661-393-6514</a></div></div></div></section>
</main>
<footer class="site-footer">
  <div class="footer-grid">
    <div><img class="footer-logo" src="/assets/images/petrol-transport-logo.png" alt="Petrol Transport Inc." width="2172" height="724"><p class="footer-copy">Crude oil and petroleum transportation throughout California. Serving customers since 1979 with 24/7 dispatch in Bakersfield.</p></div>
  </div>
  <div class="footer-bottom"><span>© <span data-year></span> Petrol Transport Inc. All rights reserved.</span></div>
</footer>
<script src="/assets/js/site.js" defer></script>
</body>
</html>
`;
fs.writeFileSync(path.join(dest, "404.html"), notFound);

console.log("Build complete. dist/ created.");
