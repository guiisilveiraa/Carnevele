import fs from "node:fs";
import vm from "node:vm";

for (const file of ["index.html", "admin.html"]) {
  const html = fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  if (/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js/i.test(html)) {
    throw new Error(`${file}: floating remote Supabase SDK is forbidden`);
  }
  if (!html.includes('src="./assets/vendor/supabase-2.116.0.js"')) {
    throw new Error(`${file}: pinned local Supabase SDK is missing`);
  }
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
  let checked = 0;
  for (const [, attributes, source] of scripts) {
    if (/\bsrc\s*=|application\/ld\+json/i.test(attributes)) continue;
    new vm.Script(source, { filename: `${file}:inline-${checked + 1}` });
    checked += 1;
  }
  console.log(`${file}: ${checked} inline script(s) parsed`);
}

JSON.parse(fs.readFileSync(new URL("../vercel.json", import.meta.url), "utf8"));
console.log("vercel.json: valid JSON");
