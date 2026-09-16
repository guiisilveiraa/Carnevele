import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const types = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

http.createServer((request, response) => {
  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relativePath = urlPath.replace(/^\/+/, "");
  let filePath = path.resolve(root, relativePath || "index.html");
  if (!filePath.startsWith(`${root}${path.sep}`) && filePath !== path.join(root, "index.html")) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) filePath = path.join(filePath, "index.html");
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) filePath = path.join(root, "404.html");
  response.setHeader("Content-Type", types[path.extname(filePath).toLowerCase()] || "application/octet-stream");
  response.setHeader("Cache-Control", "no-store");
  response.writeHead(filePath.endsWith("404.html") ? 404 : 200);
  fs.createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`CARNEVELE preview: http://127.0.0.1:${port}`);
});
