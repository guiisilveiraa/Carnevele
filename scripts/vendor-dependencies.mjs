import { copyFile, mkdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, "node_modules/@supabase/supabase-js/dist/umd/supabase.js");
const target = resolve(root, "assets/vendor/supabase-2.116.0.js");

if (process.argv.includes("--check")) {
  const [expected, actual] = await Promise.all([readFile(source), readFile(target)]);
  if (!expected.equals(actual)) throw new Error("Vendored Supabase SDK is not the pinned 2.116.0 build");
} else {
  await mkdir(dirname(target), { recursive: true });
  await copyFile(source, target);
}
