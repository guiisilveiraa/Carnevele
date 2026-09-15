# CARNEVELE — SEO, indexação, analytics e operação

Data da revisão técnica: 15 de setembro de 2026.

## Estado encontrado antes das alterações

- Site público: `https://guiisilveiraa.github.io/Carnevele/`.
- Repositório público: `guiisilveiraa/Carnevele`, branch principal `main`.
- A loja era uma página estática com navegação por hash, sem páginas indexáveis por produto.
- O `index.html` tinha aproximadamente 4.925.105 bytes, principalmente por fontes, imagens e a biblioteca Supabase embutidas em base64/JavaScript.
- Havia título, descrição, canonical e Open Graph básicos, mas faltavam imagem social completa, Twitter Card completa, manifest, conjunto de ícones, sitemap, robots, `llms.txt`, políticas e dados estruturados por produto.
- `admin.html` não declarava `noindex`.
- Não havia carregamento de GA4 ou Microsoft Clarity nem IDs desses serviços no código.
- O checkout já usava `https://carnevele-api.vercel.app/api/create-checkout`; essa integração, o fluxo Orders do Mercado Pago e o webhook não foram substituídos.
- O banco Supabase existente confirmou os quatro produtos e o preço de R$ 199,90. As tabelas de pedidos possuem RLS e políticas de leitura do próprio usuário.

## Implementação

### Indexação e presença técnica

- Metadados completos na home e páginas públicas: title, description, canonical, robots, theme-color, Open Graph e Twitter Card.
- Favicon `.ico`, PNG 16/32, Apple Touch Icon 180 e ícones 192/512 para o manifest.
- Imagem social oficial 1200 × 630 em `assets/og-carnevele.png`.
- JSON-LD da home com `Organization`, `WebSite` e `ItemList`.
- Páginas estáticas rastreáveis para os quatro produtos, cada uma com canonical, conteúdo visível, `BreadcrumbList`, `Product` e `Offer` em pré-venda. Nenhuma avaliação ou nota foi inventada.
- `sitemap.xml`, `robots.txt`, `llms.txt`, `404.html`, `privacy.html` e `cookies.html`.
- `admin.html` marcado como `noindex,nofollow,noarchive` e mascarado para o Clarity.

### Analytics e privacidade

- Consentimento opt-in: GA4 e Clarity não são baixados até o aceite.
- Preferência salva localmente e reaberta pelo botão “PREFERÊNCIAS DE COOKIES”.
- Consent Mode do GA com publicidade negada e analytics somente após aceite.
- ConsentV2 do Clarity com `ad_Storage` negado e `analytics_Storage` concedido somente após aceite.
- Rotas, formulários de conta, newsletter e painel possuem mascaramento explícito quando aplicável.
- URLs de page view são sanitizadas: parâmetros de autenticação e dados arbitrários não são enviados.

Eventos implementados:

| Evento | Momento | Fonte dos valores |
| --- | --- | --- |
| `page_view` | Home, páginas estáticas e mudança de rota da loja | URL sanitizada e metadados atuais |
| `view_item` | Exibição de produto/cor | Catálogo público |
| `add_to_cart` | Item incluído na bag | Catálogo e quantidade local |
| `view_cart` | Abertura manual da bag | Conteúdo atual da bag |
| `begin_checkout` | Usuário autenticado com endereço válido, antes de chamar a API | Conteúdo atual da bag |
| `purchase` | Somente após reler no Supabase um pedido do usuário com `status=paid` e `payment_status=approved` | Total e itens persistidos no pedido |
| `login` / `sign_up` | Sucesso do Supabase Auth | Apenas `method=email` |

O evento `purchase` usa o número do pedido como `transaction_id`, mantém uma lista local dos pedidos já enviados e remove o pedido pendente somente depois do envio. E-mail, telefone, CPF, endereço, senha, token e dados de cartão não entram nos payloads.

### Desempenho

- Assets base64 foram extraídos para arquivos cacheáveis e deduplicados.
- O bundle Supabase foi externalizado para `assets/vendor/supabase-2.116.0.js`.
- O `index.html` passou de aproximadamente 4.925.105 para 152.028 bytes, redução de 96,9% no documento inicial.
- Imagens não críticas permanecem lazy; hero e primeiro produto mantêm prioridade apropriada.
- Vídeo de entrada usa poster, dimensões reservadas e `preload=metadata`. O arquivo foi verificado e não possui faixa de áudio; por isso é tratado como mídia decorativa para acessibilidade.

## Fonte de configuração e comandos

Edite `data/seo.json` para definir domínio canônico, IDs de analytics e catálogo SEO. Depois execute:

```powershell
node scripts/generate-seo-pages.mjs
node scripts/check-seo.mjs
```

O gerador atualiza páginas de produto, políticas, 404, sitemap, robots, `llms.txt`, URLs canônicas da home e IDs GA4/Clarity. Use `node scripts/serve.mjs` para a prévia local em `http://127.0.0.1:4173`.

Formato dos IDs:

- `ga4Id`: measurement ID como `G-XXXXXXXXXX`.
- `clarityId`: project ID exibido no snippet oficial do projeto existente.

Não grave chaves secretas nesse arquivo. A chave Supabase presente no frontend é publishable e depende de RLS; service-role e credenciais do Mercado Pago devem continuar apenas no backend.

## Validação executada

- Gerador e check executados com sucesso.
- Sete páginas públicas validadas, incluindo unicidade de title, description e canonical.
- JSON-LD parseado; nenhuma propriedade de review/rating encontrada.
- Links e assets locais verificados; sitemap não inclui admin, conta, checkout, API ou callback.
- JavaScript inline e arquivos principais compilados pelo parser do Node sem erro.
- Desktop 1264 px e mobile 390 × 844 testados em Chrome, sem overflow horizontal e sem erros de console.
- Consentimento recusado testado: zero requests para Google Tag Manager e Clarity.
- Rotas e payloads de `view_item`, `add_to_cart` e `view_cart` verificados no navegador.
- `purchase` testado com resposta de pedido paga simulada: um único evento, valores vindos do pedido e deduplicação persistida. Nenhum checkout ou pagamento real foi iniciado.
- Axe 4.12.1: zero violações WCAG 2 A/AA; permaneceu uma checagem manual de contraste por causa do fundo visual da tela de entrada.
- Medição local sem throttling, em navegação reaproveitada: TTFB 1,6 ms, FCP 64 ms, LCP 116 ms e CLS 0. Esses números são apenas um teste de regressão; dados de campo devem ser acompanhados após produção.

## Pendências externas antes do lançamento

1. Confirmar o domínio público final. O repositório só comprova hoje o subdiretório do GitHub Pages. Nesse formato, `robots.txt` não fica na raiz do host `guiisilveiraa.github.io`; um domínio próprio apontando para a raiz elimina essa limitação.
2. Entrar na conta Google que possui a propriedade existente. O navegador chegou à tela de login; por isso não foi possível descobrir o measurement ID, verificar Search Console nem enviar o sitemap.
3. Entrar na conta Microsoft que possui o projeto Clarity existente. O navegador mostrou a página pública deslogada; nenhum projeto novo foi criado.
4. Autenticar a Vercel CLI se o frontend final for hospedado na Vercel. A CLI está deslogada e não existe no código um project ID confirmado para o frontend.
5. Inserir `ga4Id` e `clarityId` em `data/seo.json`, regenerar e validar.
6. Publicar primeiro em preview, revisar URLs/callbacks e somente então promover para produção.
7. Criar ou confirmar a propriedade de domínio no Search Console, concluir a verificação por DNS e enviar a URL canônica de `sitemap.xml`.
8. Fazer revisão jurídica final das políticas de privacidade e cookies.

## Checklist de publicação e rollback

Antes de publicar:

- Confirmar domínio e alterar `siteUrl` em `data/seo.json`.
- Confirmar que redirects do Supabase Auth e retornos do Mercado Pago incluem o domínio final.
- Rodar build/check e abrir home, quatro produtos, políticas, 404 e admin em preview.
- Testar consentimento aceito e recusado; conferir DebugView do GA4 e Live Users/Setup do Clarity.
- Fazer uma compra real controlada somente com autorização financeira e confirmar um único `purchase`.
- Validar o sitemap e amostras de páginas no Rich Results Test/Search Console.

Rollback recomendado: reverter o commit desta fase ou restaurar o deployment anterior. A mudança não altera schema, RLS, webhook, credenciais, estoque nem histórico de pedidos.
