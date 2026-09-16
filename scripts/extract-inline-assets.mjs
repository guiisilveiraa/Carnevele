import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(projectRoot, "index.html");
const outputDir = path.join(projectRoot, "assets", "media");

const extensionByMime = new Map([
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/jpeg", "jpg"],
  ["image/svg+xml", "svg"],
  ["video/mp4", "mp4"],
  ["font/woff2", "woff2"],
  ["font/woff", "woff"],
]);

let html = await readFile(indexPath, "utf8");
const dataUrlPattern = /data:([^;,]+);base64,([A-Za-z0-9+/=]+)/g;
const uniqueAssets = new Map();

for (const match of html.matchAll(dataUrlPattern)) {
  const [, mime, encoded] = match;
  const extension = extensionByMime.get(mime);
  if (!extension) throw new Error(`Unsupported inline asset type: ${mime}`);
  const bytes = Buffer.from(encoded, "base64");
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  const filename = `${digest}.${extension}`;
  uniqueAssets.set(filename, bytes);
}

await mkdir(outputDir, { recursive: true });
await Promise.all(
  [...uniqueAssets].map(([filename, bytes]) =>
    writeFile(path.join(outputDir, filename), bytes),
  ),
);

html = html.replace(dataUrlPattern, (_dataUrl, mime, encoded) => {
  const extension = extensionByMime.get(mime);
  const bytes = Buffer.from(encoded, "base64");
  const digest = createHash("sha256").update(bytes).digest("hex").slice(0, 12);
  return `./assets/media/${digest}.${extension}`;
});

await writeFile(indexPath, html, "utf8");
console.log(`Extracted ${uniqueAssets.size} unique assets from index.html.`);
