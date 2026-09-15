import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(fs.readFileSync(path.join(root, "data", "seo.json"), "utf8"));
const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    fail(`Arquivo ausente: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function extractAttribute(html, selector, attribute = "content") {
  const tags = html.match(/<(?:meta|link)\b[^>]*>/gi) || [];
  const [name, expected] = selector;
  const tag = tags.find((candidate) => {
    const match = candidate.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"));
    return match?.[1].toLowerCase() === expected.toLowerCase();
  });
  return tag?.match(new RegExp(`\\b${attribute}=["']([^"']*)["']`, "i"))?.[1] || "";
}

function extractTitle(html) {
  return html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim() || "";
}

const publicPages = [
  "index.html",
  "privacy.html",
  "cookies.html",
  ...config.products.map((product) => `products/${product.slug}/index.html`),
];
const specialPages = ["404.html"];
const allHtmlPages = [...publicPages, ...specialPages, "admin.html"];
const seenTitles = new Map();
const seenDescriptions = new Map();
const seenCanonicals = new Map();

for (const relativePath of publicPages) {
  const html = read(relativePath);
  if (!html) continue;
  const title = extractTitle(html);
  const description = extractAttribute(html, ["name", "description"]);
  const canonical = extractAttribute(html, ["rel", "canonical"], "href");
  const robots = extractAttribute(html, ["name", "robots"]);
  const expected = [
    ["title", title],
    ["meta description", description],
    ["canonical", canonical],
    ["robots", robots],
    ["og:title", extractAttribute(html, ["property", "og:title"])],
    ["og:description", extractAttribute(html, ["property", "og:description"])],
    ["og:url", extractAttribute(html, ["property", "og:url"])],
    ["og:image", extractAttribute(html, ["property", "og:image"])],
    ["og:image:alt", extractAttribute(html, ["property", "og:image:alt"])],
    ["twitter:card", extractAttribute(html, ["name", "twitter:card"])],
    ["twitter:title", extractAttribute(html, ["name", "twitter:title"])],
    ["twitter:description", extractAttribute(html, ["name", "twitter:description"])],
    ["twitter:image", extractAttribute(html, ["name", "twitter:image"])],
    ["twitter:image:alt", extractAttribute(html, ["name", "twitter:image:alt"])],
  ];
  for (const [label, value] of expected) {
    if (!value) fail(`${relativePath}: ${label} ausente`);
  }
  if (!/^https:\/\//.test(canonical)) fail(`${relativePath}: canonical não é absoluto HTTPS`);
  if (!/\bindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) {
    fail(`${relativePath}: robots deve permitir index e follow`);
  }
  for (const [value, label, map] of [
    [title, "title", seenTitles],
    [description, "description", seenDescriptions],
    [canonical, "canonical", seenCanonicals],
  ]) {
    if (value && map.has(value)) fail(`${relativePath}: ${label} duplica ${map.get(value)}`);
    if (value) map.set(value, relativePath);
  }

  const jsonLdBlocks = [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  if ((relativePath === "index.html" || relativePath.startsWith("products/")) && !jsonLdBlocks.length) {
    fail(`${relativePath}: JSON-LD ausente`);
  }
  for (const [, jsonText] of jsonLdBlocks) {
    try {
      const value = JSON.parse(jsonText);
      const serialized = JSON.stringify(value);
      if (/aggregateRating|reviewCount|ratingValue|"review"/i.test(serialized)) {
        fail(`${relativePath}: dados de avaliação não comprovados no JSON-LD`);
      }
    } catch (error) {
      fail(`${relativePath}: JSON-LD inválido (${error.message})`);
    }
  }
}

const indexHtml = read("index.html");
if (/data:[^;]+;base64,/i.test(indexHtml)) fail("index.html ainda contém asset base64 inline");
for (const type of ["Organization", "WebSite", "ItemList"]) {
  if (!indexHtml.includes(`"@type": "${type}"`) && !indexHtml.includes(`"@type":"${type}"`)) {
    fail(`index.html: schema ${type} ausente`);
  }
}
for (const eventName of ["page_view", "view_item", "add_to_cart", "view_cart", "begin_checkout", "purchase", "login", "sign_up"]) {
  const analyticsSource = read("assets/analytics.js") + indexHtml;
  if (!analyticsSource.includes(`"${eventName}"`)) fail(`Evento GA4 ausente: ${eventName}`);
}
if (!/status\s*===\s*["']paid["']/.test(indexHtml) || !/payment_status\s*===\s*["']approved["']/.test(indexHtml)) {
  fail("purchase não exige status paid e payment_status approved");
}
if (!indexHtml.includes("carnevele-purchase-events-v1")) fail("purchase não possui deduplicação persistente");

const adminHtml = read("admin.html");
const adminRobots = extractAttribute(adminHtml, ["name", "robots"]);
if (!/noindex/i.test(adminRobots) || !/nofollow/i.test(adminRobots)) fail("admin.html deve ser noindex,nofollow");

for (const relativePath of allHtmlPages) {
  const html = read(relativePath);
  for (const script of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = script[1];
    const body = script[2].trim();
    if (!body || /\bsrc\s*=|application\/ld\+json/i.test(attributes)) continue;
    try {
      new vm.Script(body, { filename: relativePath });
    } catch (error) {
      fail(`${relativePath}: JavaScript inline inválido (${error.message})`);
    }
  }
}

const requiredFiles = [
  "favicon.ico",
  "site.webmanifest",
  "assets/icons/favicon-16x16.png",
  "assets/icons/favicon-32x32.png",
  "assets/icons/apple-touch-icon.png",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/og-carnevele.png",
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
];
for (const relativePath of requiredFiles) read(relativePath);

const sitemap = read("sitemap.xml");
const robots = read("robots.txt");
const llms = read("llms.txt");
for (const relativePath of publicPages) {
  const expectedUrl = relativePath === "index.html"
    ? config.siteUrl
    : new URL(relativePath.replace(/index\.html$/, ""), config.siteUrl).href;
  if (!sitemap.includes(`<loc>${expectedUrl}</loc>`)) fail(`sitemap.xml não contém ${expectedUrl}`);
}
for (const privateTerm of ["admin", "login", "account", "/api/", "checkout", "callback"]) {
  if (sitemap.toLowerCase().includes(privateTerm)) fail(`sitemap.xml expõe rota privada: ${privateTerm}`);
}
if (!robots.includes(`Sitemap: ${new URL("sitemap.xml", config.siteUrl).href}`)) fail("robots.txt não aponta ao sitemap canônico");
const sitePath = new URL(config.siteUrl).pathname;
if (!robots.includes(`Allow: ${sitePath}`)) fail("robots.txt não permite o caminho público canônico");
if (!robots.includes(`Disallow: ${sitePath}admin.html`)) fail("robots.txt não bloqueia o painel no caminho canônico");
for (const product of config.products) {
  if (!llms.includes(product.name)) fail(`llms.txt não contém ${product.name}`);
}

function localTarget(fromHtml, rawValue) {
  if (!rawValue || rawValue.includes("${") || /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i.test(rawValue)) return null;
  const clean = rawValue.split(/[?#]/)[0];
  if (!clean) return null;
  const fromDir = path.dirname(path.join(root, fromHtml));
  let target = path.resolve(fromDir, clean);
  if (clean.endsWith("/") || (fs.existsSync(target) && fs.statSync(target).isDirectory())) target = path.join(target, "index.html");
  return target;
}

for (const relativePath of allHtmlPages) {
  const html = read(relativePath);
  const refs = [
    ...html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/gi),
    ...html.matchAll(/\bsrcset=["']([^"']+)["']/gi),
  ];
  for (const match of refs) {
    const candidates = match[0].toLowerCase().startsWith("srcset")
      ? match[1].split(",").map((entry) => entry.trim().split(/\s+/)[0])
      : [match[1]];
    for (const candidate of candidates) {
      const target = localTarget(relativePath, candidate);
      if (target && !fs.existsSync(target)) fail(`${relativePath}: referência local ausente (${candidate})`);
    }
  }
}

for (const relativePath of ["assets/analytics.js", "assets/vendor/supabase-2.116.0.js"]) {
  const source = read(relativePath);
  try {
    new vm.Script(source, { filename: relativePath });
  } catch (error) {
    fail(`${relativePath}: JavaScript inválido (${error.message})`);
  }
}

const analytics = read("assets/analytics.js");
if (!analytics.includes('consent !== "granted"')) fail("Analytics não está protegido por opt-in explícito");
if (!analytics.includes("safePageUrl")) fail("Analytics não sanitiza a URL antes de enviar page_view");
if (!indexHtml.includes("data-clarity-mask") || !adminHtml.includes("data-clarity-mask")) {
  fail("Clarity: campos de conta/admin precisam de data-clarity-mask");
}
if (!extractAttribute(indexHtml, ["name", "carnevele-ga4-id"])) warn("GA4 ainda não configurado: meta carnevele-ga4-id vazia");
if (!extractAttribute(indexHtml, ["name", "carnevele-clarity-id"])) warn("Clarity ainda não configurado: meta carnevele-clarity-id vazia");

if (errors.length) {
  console.error(`Falharam ${errors.length} verificações:`);
  for (const error of errors) console.error(`- ${error}`);
  if (warnings.length) {
    console.error("Avisos:");
    for (const message of warnings) console.error(`- ${message}`);
  }
  process.exit(1);
}

console.log(`OK: ${publicPages.length} páginas públicas validadas; ${requiredFiles.length} assets técnicos presentes.`);
for (const message of warnings) console.log(`AVISO: ${message}`);
