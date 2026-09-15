import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  await readFile(path.join(root, "data", "seo.json"), "utf8"),
);
const siteUrl = config.siteUrl.endsWith("/") ? config.siteUrl : `${config.siteUrl}/`;
if (!siteUrl.startsWith("https://")) throw new Error("siteUrl must use HTTPS");
if (config.ga4Id && !/^G-[A-Z0-9]+$/i.test(config.ga4Id)) throw new Error("Invalid ga4Id");
if (config.clarityId && !/^[a-z0-9]+$/i.test(config.clarityId)) throw new Error("Invalid clarityId");
const sitePath = new URL(siteUrl).pathname;
const absolute = (relative) => new URL(relative.replace(/^\.\//, ""), siteUrl).href;
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const sharedStyles = `
  :root{color-scheme:light;--ink:#20211f;--muted:#6d6d68;--line:#deded9;--soft:#f5f3ee}
  *{box-sizing:border-box}html{font-family:Arial,Helvetica,sans-serif;color:var(--ink);background:#fff}
  body{margin:0}a{color:inherit;text-underline-offset:4px}header,main,footer{width:min(1120px,calc(100% - 36px));margin:auto}
  header{min-height:78px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)}
  .brand{font-family:Georgia,'Times New Roman',serif;font-size:clamp(28px,5vw,42px);text-decoration:none;letter-spacing:-2px}
  nav{display:flex;gap:18px;font-size:12px}main{padding:clamp(44px,8vw,92px) 0}.eyebrow{font-size:12px;letter-spacing:2px;color:var(--muted)}
  h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(44px,9vw,92px);line-height:.92;letter-spacing:-4px;margin:14px 0 24px}
  h2{font-size:22px;margin:38px 0 12px}.lede{max-width:720px;font-size:18px;line-height:1.65;color:#454541}
  .product{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(300px,.9fr);gap:clamp(32px,7vw,90px);align-items:start}
  .product img{display:block;width:100%;height:auto;background:var(--soft)}.price{font-size:24px;font-weight:700;margin:28px 0 8px}
  .status{font-size:12px;letter-spacing:1.6px;color:var(--muted)}.cta{display:inline-block;margin-top:30px;background:var(--ink);color:#fff;text-decoration:none;padding:16px 22px;font-size:12px;font-weight:700;letter-spacing:1.2px}
  .policy{max-width:800px}.policy p,.policy li,.policy td,.policy th{font-size:16px;line-height:1.7}.policy li+li{margin-top:8px}
  table{border-collapse:collapse;width:100%;margin:22px 0}th,td{border:1px solid var(--line);padding:12px;text-align:left;vertical-align:top}th{background:var(--soft)}
  .notice{border-left:3px solid var(--ink);background:var(--soft);padding:16px;margin:28px 0;color:#454541}
  footer{border-top:1px solid var(--line);padding:28px 0 44px;display:flex;justify-content:space-between;gap:20px;font-size:12px;color:var(--muted)}
  @media(max-width:760px){.product{grid-template-columns:1fr}.product-copy{order:-1}header{align-items:flex-start;padding:20px 0;gap:18px}nav{flex-direction:column;gap:7px;text-align:right}h1{letter-spacing:-2px}footer{flex-direction:column}}
`;

function commonHead({ title, description, canonical, image, type = "website", robots = "index,follow,max-image-preview:large" }, depth = "./") {
  return `
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="robots" content="${escapeHtml(robots)}">
    <meta name="theme-color" content="#ffffff">
    <meta name="referrer" content="strict-origin-when-cross-origin">
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <meta property="og:locale" content="pt_BR">
    <meta property="og:site_name" content="${escapeHtml(config.siteName)}">
    <meta property="og:type" content="${escapeHtml(type)}">
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:image" content="${escapeHtml(image)}">
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${escapeHtml(image)}">
    <meta name="twitter:image:alt" content="${escapeHtml(title)}">
    <link rel="icon" href="${depth}favicon.ico" sizes="any">
    <link rel="icon" type="image/png" sizes="32x32" href="${depth}assets/icons/favicon-32x32.png">
    <link rel="apple-touch-icon" sizes="180x180" href="${depth}assets/icons/apple-touch-icon.png">
    <link rel="manifest" href="${depth}site.webmanifest">
    <meta name="carnevele-ga4-id" content="${escapeHtml(config.ga4Id || "")}">
    <meta name="carnevele-clarity-id" content="${escapeHtml(config.clarityId || "")}">
    <link rel="stylesheet" href="${depth}assets/privacy.css">
    <script defer src="${depth}assets/analytics.js"></script>`;
}

function shell(content, head, depth = "./", bodyAttributes = "") {
  return `<!doctype html>
<html lang="pt-BR">
<head>${head}<style>${sharedStyles}</style></head>
<body ${bodyAttributes}>
  <header><a class="brand" href="${depth}">CARNEVELE</a><nav><a href="${depth}#collection">Coleção</a><a href="${depth}privacy.html">Privacidade</a></nav></header>
  <main>${content}</main>
  <footer><span>São Paulo · Brasil</span><span>© 2026 CARNEVELE</span></footer>
</body>
</html>\n`;
}

for (const product of config.products) {
  const canonical = absolute(`products/${product.slug}/`);
  const image = absolute(product.image);
  const title = `${product.name} — ${config.siteName}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: config.siteName, item: siteUrl },
          { "@type": "ListItem", position: 2, name: "First Intentions", item: `${siteUrl}#collection` },
          { "@type": "ListItem", position: 3, name: product.name, item: canonical },
        ],
      },
      {
        "@type": "Product",
        name: product.name,
        image: [image],
        description: product.description,
        sku: product.sku,
        url: canonical,
        brand: { "@type": "Brand", name: config.siteName },
        offers: {
          "@type": "Offer",
          url: canonical,
          priceCurrency: product.currency,
          price: product.price,
          availability: product.availability,
          itemCondition: "https://schema.org/NewCondition",
        },
      },
    ],
  };
  const content = `
    <div class="product">
      <img src="../../${escapeHtml(product.image)}" width="900" height="900" alt="${escapeHtml(product.name)}" decoding="async" fetchpriority="high">
      <div class="product-copy"><span class="eyebrow">FIRST INTENTIONS / PRÉ-VENDA</span><h1>${escapeHtml(product.name)}</h1><p class="lede">${escapeHtml(product.description)}</p><p class="price">R$ ${product.price.replace(".", ",")}</p><p class="status">DISPONÍVEL EM PRÉ-VENDA</p><a class="cta" href="../../${escapeHtml(product.appRoute)}">VER CORES E TAMANHOS →</a></div>
    </div>
    <script type="application/ld+json">${JSON.stringify(structuredData).replaceAll("<", "\\u003c")}</script>`;
  const target = path.join(root, "products", product.slug);
  await mkdir(target, { recursive: true });
  await writeFile(
    path.join(target, "index.html"),
    shell(
      content,
      commonHead({ title, description: product.description, canonical, image, type: "product" }, "../../"),
      "../../",
    ),
  );
}

const privacyTitle = `Política de Privacidade — ${config.siteName}`;
const privacyDescription = "Saiba como a CARNEVELE trata dados pessoais, cookies, pagamentos e métricas de uso.";
const privacyContent = `
  <article class="policy"><span class="eyebrow">PRIVACIDADE / LGPD</span><h1>Política de Privacidade.</h1>
  <p class="lede">Esta página descreve, em linguagem direta, como os dados são usados na experiência digital da CARNEVELE.</p>
  <p class="notice"><strong>Revisão recomendada.</strong> Este texto documenta a implementação técnica atual e não substitui validação jurídica especializada antes do lançamento comercial definitivo.</p>
  <h2>Dados necessários para a loja</h2><p>Ao criar uma conta, fazer login, cadastrar um endereço ou realizar um pedido, a loja trata os dados informados para autenticação, entrega, atendimento e execução da compra. O pagamento é concluído no ambiente do Mercado Pago; a CARNEVELE não deve armazenar dados completos de cartão.</p>
  <h2>Analytics opcionais</h2><p>Google Analytics 4 e Microsoft Clarity somente são carregados depois que você aceita análises. Eles podem medir páginas visitadas, produtos visualizados e interações com a loja. A implementação não envia senha, cartão, token de acesso, CPF, endereço completo, telefone ou e-mail aos eventos de analytics.</p>
  <h2>Gravações e mascaramento</h2><p>Quando o Clarity estiver ativo, áreas de conta, formulários e conteúdo pessoal recebem mascaramento explícito. Campos de entrada também são mascarados pelo próprio serviço. Nenhuma identificação individual de cliente é enviada intencionalmente ao Clarity.</p>
  <h2>Compartilhamento</h2><p>Dados podem ser processados pelos fornecedores necessários à operação, como Supabase para conta e dados da loja, Mercado Pago para pagamentos e, mediante consentimento, Google Analytics e Microsoft Clarity para métricas.</p>
  <h2>Seus direitos</h2><p>Para dúvidas, correção ou solicitação relacionada aos seus dados, escreva para <a href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a>. Solicitações estão sujeitas à verificação de identidade e às obrigações legais aplicáveis.</p>
  <h2>Atualizações</h2><p>Esta versão foi preparada em 15 de setembro de 2026 e deve ser atualizada quando serviços, finalidades ou responsáveis mudarem.</p>
  </article>`;
await writeFile(
  path.join(root, "privacy.html"),
  shell(privacyContent, commonHead({ title: privacyTitle, description: privacyDescription, canonical: absolute("privacy.html"), image: absolute(config.socialImage) })),
);

const cookiesTitle = `Política de Cookies — ${config.siteName}`;
const cookiesDescription = "Conheça os armazenamentos essenciais e opcionais usados no site da CARNEVELE.";
const cookiesContent = `
  <article class="policy"><span class="eyebrow">PRIVACIDADE / PREFERÊNCIAS</span><h1>Política de Cookies.</h1>
  <p class="lede">A loja separa o que é necessário para funcionar das ferramentas opcionais de análise.</p>
  <p class="notice"><strong>Revisão recomendada.</strong> Este inventário reflete a implementação técnica atual e deve receber validação jurídica antes do lançamento comercial definitivo.</p>
  <table><thead><tr><th>Categoria</th><th>Exemplos</th><th>Finalidade</th></tr></thead><tbody>
  <tr><td>Essencial</td><td>Sessão Supabase</td><td>Manter login e proteger o acesso à conta.</td></tr>
  <tr><td>Essencial</td><td>carnevele-bag-v1</td><td>Guardar a bag neste dispositivo.</td></tr>
  <tr><td>Essencial</td><td>carnevele-analytics-consent-v1</td><td>Lembrar a escolha de privacidade.</td></tr>
  <tr><td>Temporário</td><td>carnevele_last_order</td><td>Verificar com segurança o retorno do pedido atual.</td></tr>
  <tr><td>Análise opcional</td><td>_ga, _ga_*</td><td>Métricas agregadas do Google Analytics 4, somente após aceite.</td></tr>
  <tr><td>Análise opcional</td><td>_clck, _clsk</td><td>Análise de experiência do Microsoft Clarity, somente após aceite.</td></tr>
  </tbody></table>
  <h2>Como mudar sua escolha</h2><p>Use o botão abaixo para reabrir as preferências. Recusar impede novos carregamentos opcionais nesta visita; cookies já existentes dos fornecedores também devem ser removidos pelas APIs de consentimento quando disponíveis.</p>
  <p><button class="cta" type="button" data-cookie-preferences>REVER PREFERÊNCIAS</button></p>
  <h2>Contato</h2><p>Dúvidas podem ser enviadas para <a href="mailto:${escapeHtml(config.email)}">${escapeHtml(config.email)}</a>.</p>
  </article>`;
await writeFile(
  path.join(root, "cookies.html"),
  shell(cookiesContent, commonHead({ title: cookiesTitle, description: cookiesDescription, canonical: absolute("cookies.html"), image: absolute(config.socialImage) })),
);

const notFoundTitle = `Página não encontrada — ${config.siteName}`;
await writeFile(
  path.join(root, "404.html"),
  shell(
    `<article class="policy"><span class="eyebrow">ERRO 404</span><h1>Página não encontrada.</h1><p class="lede">O endereço pode ter mudado ou não existir.</p><a class="cta" href="./">VOLTAR À LOJA →</a></article>`,
    commonHead({ title: notFoundTitle, description: "A página solicitada não foi encontrada.", canonical: siteUrl, image: absolute(config.socialImage), robots: "noindex,follow" }),
  ),
);

const sitemapUrls = [
  siteUrl,
  absolute("privacy.html"),
  absolute("cookies.html"),
  ...config.products.map((product) => absolute(`products/${product.slug}/`)),
];
await writeFile(
  path.join(root, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join("\n")}\n</urlset>\n`,
);
await writeFile(
  path.join(root, "robots.txt"),
  `User-agent: *\nAllow: ${sitePath}\nDisallow: ${sitePath}admin.html\n\nSitemap: ${absolute("sitemap.xml")}\n`,
);
await writeFile(
  path.join(root, "llms.txt"),
  `# CARNEVELE\n\n> CARNEVELE é uma marca independente de roupas de São Paulo. First Intentions é sua primeira coleção, com camisetas de algodão 240 GSM em pré-venda.\n\n## Páginas oficiais\n\n- [Loja e coleção First Intentions](${siteUrl})\n${config.products.map((product) => `- [${product.name}](${absolute(`products/${product.slug}/`)})`).join("\n")}\n- [Política de Privacidade](${absolute("privacy.html")})\n- [Política de Cookies](${absolute("cookies.html")})\n\n## Institucional\n\n- Marca: CARNEVELE\n- Local: São Paulo, Brasil\n- Contato: ${config.email}\n- Instagram: https://www.instagram.com/carnevele\n- TikTok: https://www.tiktok.com/@carnevele\n\nAs URLs acima são canônicas. Áreas de conta, administração, APIs e callbacks não fazem parte deste índice.\n`,
);

const indexPath = path.join(root, "index.html");
let indexHtml = await readFile(indexPath, "utf8");
const previousSiteUrl = indexHtml.match(/const SITE_URL = "([^"]+)";/)?.[1];
if (!previousSiteUrl) throw new Error("index.html does not expose SITE_URL for canonical synchronization");
if (previousSiteUrl !== siteUrl) indexHtml = indexHtml.replaceAll(previousSiteUrl, siteUrl);
indexHtml = indexHtml
  .replace(
    /(<meta\s+name="carnevele-ga4-id"\s+content=")[^"]*("\s*\/?>)/,
    `$1${config.ga4Id || ""}$2`,
  )
  .replace(
    /(<meta\s+name="carnevele-clarity-id"\s+content=")[^"]*("\s*\/?>)/,
    `$1${config.clarityId || ""}$2`,
  );
await writeFile(indexPath, indexHtml);

console.log(`Generated ${config.products.length} product pages, policies, sitemap, robots and llms.txt.`);
