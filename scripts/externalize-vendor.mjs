import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(root, "index.html");
const vendorDir = path.join(root, "assets", "vendor");
const html = await readFile(indexPath, "utf8");
const pattern = /<script>\s*(\/\*\*\s*\* Skipped minification[\s\S]*?)<\/script>\s*(?=<script>\s*\/\/ Supabase account flows)/;
const match = html.match(pattern);

if (!match) {
  console.log("Supabase vendor script was already external or could not be located.");
  process.exit(0);
}

await mkdir(vendorDir, { recursive: true });
await writeFile(
  path.join(vendorDir, "supabase-2.116.0.js"),
  `${match[1].trim()}\n`,
  "utf8",
);
await writeFile(
  indexPath,
  html.replace(pattern, '<script src="./assets/vendor/supabase-2.116.0.js"></script>\n'),
  "utf8",
);
console.log("Externalized the Supabase browser client for independent caching.");
