# CARNEVELE — mapa operacional

Estado verificado em 06/10/2026. Este documento não contém credenciais. A loja **não está liberada para lançamento**; use [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md) como gate.

## Acessos e responsáveis

| Área | Link | Situação / uso |
| --- | --- | --- |
| Site final | https://carnevele.com.br | DNS não resolvia na verificação de 16/09/2026. |
| Admin final desejado | https://carnevele.com.br/admin | Rewrite e painel de pedidos/catálogo/MFA implementados na branch; falta validar no preview e publicar. |
| Frontend GitHub | https://github.com/guiisilveiraa/Carnevele | Branch de preparação: `chore/seo-analytics-final`. Não fazer merge sem autorização. |
| PR de preparação | https://github.com/guiisilveiraa/Carnevele/pull/1 | Revisar antes de qualquer publicação. |
| Backend GitHub | https://github.com/guiisilveiraa/carnevele-api | Checkout e webhook em produção; alterações exigem preview e aprovação. |
| Equipe Vercel | https://vercel.com/carnevele | O conector listou `carnevelefront` e `carnevele-api`, mas a inspeção detalhada retornou 403 por escopo; confirmar no painel da equipe. |
| Supabase | https://supabase.com/dashboard/project/bbrdcgjkxkdsrrvmcfal | Projeto “Carnevele Project”, ativo em `sa-east-1`. |
| API | https://carnevele-api.vercel.app | `api/health` respondeu 200 em 16/09/2026; não comprova dependências. |
| Mercado Pago | https://www.mercadopago.com.br/developers/panel | Conferir a aplicação CARNEVELE, credenciais, webhooks e histórico de eventos no painel da conta. |
| Resend | https://resend.com/domains | Na conta conectada não havia domínio de envio em 16/09/2026. |
| Pushover | https://pushover.net/ | Conta/aplicação não verificadas. |
| Google Analytics | https://analytics.google.com/ | Propriedade não verificada; `ga4Id` está vazio no código. |
| Microsoft Clarity | https://clarity.microsoft.com/ | Projeto não verificado; `clarityId` está vazio no código. |
| Search Console | https://search.google.com/search-console/ | Propriedade do domínio não verificada. |

### Vercel — confirmar os links exatos no painel

O conector de leitura listou os projetos `carnevelefront` e `carnevele-api`, mas não conseguiu inspecioná-los sob o escopo `carnevele` (403), e a CLI Vercel não está instalada neste ambiente. Portanto **não trate plano, env vars ou deployments como verificados**. No painel da equipe, conferir: Production deployment, Deployments, Domains, Environment Variables e Logs. Não copiar **valores** de variáveis. Registrar apenas nome, ambiente (`Production`/`Preview`) e presença.

### Supabase — caminhos de operação

Abrir o [projeto](https://supabase.com/dashboard/project/bbrdcgjkxkdsrrvmcfal) e usar os menus **Table Editor**, **Authentication → Users**, **Authentication → URL Configuration**, **Storage**, **SQL Editor**, **Database**, **Logs** e **Advisors → Security**. Os caminhos internos do dashboard podem mudar; confirme no próprio painel antes de salvar links profundos. Nunca cole dados de clientes, tokens ou chaves no chat.

As tabelas atuais incluem `products`, `product_variants` e `order_notifications`, além das tabelas históricas. O bucket público `product-images` aceita somente JPG/JPEG, PNG, WEBP e AVIF até 5 MB; upload exige admin com AAL2 e nomes imutáveis. Nove migrations estavam registradas em 06/10/2026. A exigência AAL2 foi aplicada no banco: a consulta de membership em AAL1 existe apenas para o bootstrap do enrollment, enquanto pedidos, catálogo, upload e RPC administrativa exigem AAL2. Até o administrador cadastrar e testar TOTP, o lançamento permanece bloqueado. `admin_users` e `order_notifications` permanecem intencionalmente sem policy cliente: **não criar policy liberal para remover o aviso**.

### Pagamentos e atendimento

O preço e o total são calculados no backend atual. Não confundir `status` operacional com `payment_status`. O painel administrativo pode alterar andamento por `admin_set_order_status`, mas **não pode declarar um pagamento aprovado**. Para confirmar pagamento, conferir o identificador da Order no Mercado Pago, a transação, o valor, a moeda e o pedido local antes de ação manual; nunca confiar só na URL de retorno do navegador.

O novo webhook da branch consulta a API oficial e delega a transição a uma RPC transacional que valida Order, `external_reference`, valor, moeda e Payment ID. A primeira aprovação movimenta reserva/contador e cria eventos de notificação uma vez. Um pedido ausente ou divergente retorna erro para permitir retry, em vez de confirmar 200 com zero atualizações. Até a branch do backend ser publicada e as env vars conferidas, produção continua sendo tratada como **NO-GO**.

## Implementação de 06/10/2026

- Supabase é a fonte oficial do catálogo; quatro produtos e 28 variantes foram seedados preservando nomes, preços, imagens, PP/P/M/G e limite de pré-venda 1000 por produto.
- Checkout novo recebe somente produto/cor/tamanho/quantidade do navegador. Preço, nome, imagem e modo de venda vêm do banco e são gravados como snapshot.
- Reservas de pré-venda/estoque são atômicas. Aprovação duplicada não incrementa `preorder_sold`; cancelamento antes de aprovação libera reserva. Refund preserva o contador histórico de unidades vendidas.
- Cada tentativa de checkout possui UUID estável por carrinho/endereço, chave única por usuário e limite de uma reserva pendente por cliente. O limite é 20 unidades por carrinho e 10 por produto, aplicado no API e novamente no banco.
- Reservas vencem operacionalmente após 30 minutos, mas uma Order já vinculada só é alterada após consulta oficial ao Mercado Pago. Há reconciliação preguiçosa antes de novo checkout e endpoint protegido por `CRON_SECRET`; o agendamento versionado diário é compatível com Hobby e deve ser aumentado somente se o plano Vercel confirmado permitir.
- `handle_new_carnevele_user()` e `rls_auto_enable()` não podem mais ser chamados por `anon`/`authenticated`. `is_admin()` e `admin_set_order_status()` continuam expostas somente a `authenticated` por necessidade funcional e validam autorização internamente.
- O admin usa o bundle local e fixado `@supabase/supabase-js@2.116.0`; o domínio jsDelivr foi removido da política de scripts.
- As env vars do backend são: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `MP_APPLICATION_ID`, `MP_WEBHOOK_MAX_AGE_SECONDS`, `SITE_URL`, `PREVIEW_ORIGINS`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PUSHOVER_APP_TOKEN`, `PUSHOVER_USER_KEY`, `ADMIN_EMAIL`, `CRON_SECRET`. Registrar apenas presença/ambiente, nunca valores.

## Configurações manuais de lançamento

| Etapa | Menu/link | Valor esperado | Não colar no chat | Verificação |
| --- | --- | --- | --- | --- |
| DNS | Painel do registrador do domínio → zona DNS; Vercel → Domains | `carnevele.com.br` no frontend; `www` redireciona para sem-www | Credenciais DNS e tokens | Ambos resolvem, HTTPS válido, `www` faz redirect. |
| Supabase Auth | Projeto → Authentication → URL Configuration | Site URL `https://carnevele.com.br`; redirects `https://carnevele.com.br/**`, `https://www.carnevele.com.br/**` e apenas previews necessários | Tokens, links de recuperação individuais | Cadastro e recuperação em contas de teste voltam ao domínio correto. |
| Senhas vazadas | Projeto → Authentication → Security and Protection / Password Security | Proteção ativada se disponível no plano | Senhas de teste/reais | Advisor não aponta proteção desativada; teste controlado. |
| MFA admin | Projeto → Authentication; painel admin | Admin inscrito em TOTP e ação sensível condicionada a AAL adequado | Segredo TOTP, recovery codes | Login de teste exige segundo fator; conta comum continua negada. |
| Mercado Pago | Painel de Desenvolvedores → Suas integrações → aplicação → Webhooks | URL exata `https://carnevele-api.vercel.app/api/mercado-pago-webhook`; ambiente de teste e produção separados | Access token e webhook secret | Evento de teste assinado é recebido e conciliado uma vez; sem compra real. |
| Resend | [Domains](https://resend.com/domains) | Um único domínio/subdomínio verificado para envio, remetente operacional como `pedido@carnevele.com.br` se aprovado | API key | SPF, DKIM e DMARC publicados e domínio verificado; e-mail de teste entregue. |
| Pushover | [Dashboard](https://pushover.net/) | Aplicação e usuário destinados às vendas; fallback por e-mail admin | App token e user key | Fixture em preview produz um push e fallback controlado. |
| Cron Vercel | Projeto `carnevele-api` → Settings → Environment Variables | `CRON_SECRET` forte em Production; `vercel.json` chama `/api/reconcile-pending-orders` às 03:00 UTC | Valor do secret | Invocação sem bearer retorna 401; Cron Jobs mostra execução 200 e contagens sem PII. |
| GA4 | [Analytics](https://analytics.google.com/) → Admin → Data streams | ID real `G-...` após confirmar se já existe propriedade | Credenciais da conta | DebugView recebe eventos somente após consentimento; `purchase` só para pedido pago. |
| Clarity | [Clarity](https://clarity.microsoft.com/) → projeto → Settings | ID real após confirmar projeto existente; masking de PII | Credenciais da conta | Nenhum script antes do aceite; replay não mostra PII. |
| Search Console | [Search Console](https://search.google.com/search-console/) → Add property | Domain Property `carnevele.com.br`, verificação DNS, envio de `https://carnevele.com.br/sitemap.xml` | Acesso ao registrador | Propriedade verificada e sitemap processado. |
| Backup | Supabase → Database → Backups; procedimento de exportação | Exportação lógica testada e cópia fora do projeto antes de migration | Dump com PII, senhas e tokens | Restaurar em ambiente isolado e conferir contagens. |

O projeto Supabase estava no plano Free em 16/09/2026. Não presumir backup diário automático; [a documentação oficial](https://supabase.com/docs/guides/platform/backups) recomenda exportações regulares para esse plano. Objetos Storage exigem estratégia separada.
