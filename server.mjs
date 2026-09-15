import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const useDist = process.argv.includes("--dist");
const root = useDist
  ? path.join(__dirname, "dist")
  : path.join(__dirname, "website");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

const REDIRECTS = [
  { from: "/petrol-transport-inc-benefits", to: "/petrol-transport-inc-benefits/" },
];

function resolveFile(urlPath) {
  let pathname = decodeURIComponent(urlPath.split("?")[0]);

  for (const r of REDIRECTS) {
    if (pathname === r.from) {
      return { redirect: r.to };
    }
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(root, pathname);

  if (filePath.startsWith(root) === false) {
    return { status: 403 };
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return { filePath };
  }

  const indexPath = path.join(filePath, "index.html");
  if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
    return { filePath: indexPath };
  }

  const withHtml = filePath + ".html";
  if (fs.existsSync(withHtml) && fs.statSync(withHtml).isFile()) {
    return { filePath: withHtml };
  }

  return { status: 404 };
}

const server = http.createServer((req, res) => {
  const result = resolveFile(req.url);

  if (result.redirect) {
    res.writeHead(301, { Location: result.redirect });
    res.end();
    return;
  }

  if (result.status) {
    if (result.status === 404) {
      const notFoundPath = path.join(root, "404.html");
      if (fs.existsSync(notFoundPath)) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        fs.createReadStream(notFoundPath).pipe(res);
        return;
      }
    }
    res.writeHead(result.status);
    res.end();
    return;
  }

  const ext = path.extname(result.filePath).toLowerCase();
  const contentType = MIME[ext] || "application/octet-stream";

  try {
    const stat = fs.statSync(result.filePath);
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": stat.size,
    });
    fs.createReadStream(result.filePath).pipe(res);
  } catch {
    res.writeHead(500);
    res.end("Internal server error");
  }
});

const portArg = process.argv.find((a) => a.startsWith("--port="));
const PORT = portArg ? portArg.split("=")[1] : process.env.PORT || 5173;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`Petrol Transport server running at http://${HOST}:${PORT}`);
  console.log(`Serving: ${root}`);
});
