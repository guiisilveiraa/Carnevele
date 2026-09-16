# CARNEVELE — mapa operacional

Estado verificado em 16/09/2026. Este documento não contém credenciais. A loja **não está liberada para lançamento**; use [LAUNCH-CHECKLIST.md](./LAUNCH-CHECKLIST.md) como gate.

## Acessos e responsáveis

| Área | Link | Situação / uso |
| --- | --- | --- |
| Site final | https://carnevele.com.br | DNS não resolvia na verificação de 16/09/2026. |
| Admin final desejado | https://carnevele.com.br/admin | Rota ainda não implementada/verificada. Atualmente há `admin.html`. |
| Frontend GitHub | https://github.com/guiisilveiraa/Carnevele | Branch de preparação: `chore/seo-analytics-final`. Não fazer merge sem autorização. |
| PR de preparação | https://github.com/guiisilveiraa/Carnevele/pull/1 | Revisar antes de qualquer publicação. |
| Backend GitHub | https://github.com/guiisilveiraa/carnevele-api | Checkout e webhook em produção; alterações exigem preview e aprovação. |
| Equipe Vercel | https://vercel.com/carnevele | A conexão disponível não confirmou os projetos; abrir no painel com a conta da equipe. |
| Supabase | https://supabase.com/dashboard/project/bbrdcgjkxkdsrrvmcfal | Projeto “Carnevele Project”, ativo em `sa-east-1`. |
| API | https://carnevele-api.vercel.app | `api/health` respondeu 200 em 16/09/2026; não comprova dependências. |
| Mercado Pago | https://www.mercadopago.com.br/developers/panel | Conferir a aplicação CARNEVELE, credenciais, webhooks e histórico de eventos no painel da conta. |
| Resend | https://resend.com/domains | Na conta conectada não havia domínio de envio em 16/09/2026. |
| Pushover | https://pushover.net/ | Conta/aplicação não verificadas. |
| Google Analytics | https://analytics.google.com/ | Propriedade não verificada; `ga4Id` está vazio no código. |
| Microsoft Clarity | https://clarity.microsoft.com/ | Projeto não verificado; `clarityId` está vazio no código. |
| Search Console | https://search.google.com/search-console/ | Propriedade do domínio não verificada. |

### Vercel — confirmar os links exatos no painel

O conector de leitura não listou os projetos da equipe. Portanto **não trate URLs presumidas como verificadas**. No painel da equipe, localizar `carnevelefront` e `carnevele-api` e registrar aqui, após conferir: URL exata de cada projeto, Production deployment, Deployments, Domains, Environment Variables e Logs. Não copiar **valores** de variáveis. Registrar apenas nome, ambiente (`Production`/`Preview`) e presença.

### Supabase — caminhos de operação

Abrir o [projeto](https://supabase.com/dashboard/project/bbrdcgjkxkdsrrvmcfal) e usar os menus **Table Editor**, **Authentication → Users**, **Authentication → URL Configuration**, **Storage**, **SQL Editor**, **Database**, **Logs** e **Advisors → Security**. Os caminhos internos do dashboard podem mudar; confirme no próprio painel antes de salvar links profundos. Nunca cole dados de clientes, tokens ou chaves no chat.

As tabelas atuais são `profiles`, `addresses`, `orders`, `order_items`, `admin_users`, `newsletter_subscribers` e `keep_alive`, todas com RLS habilitado. Não há `products`, `product_variants` nem bucket Storage no inventário de 16/09/2026. Não há migrations ou branches Supabase registradas. `admin_users` tem RLS sem policy intencional: **não adicionar uma policy liberal** só para remover o aviso.

### Pagamentos e atendimento

O preço e o total são calculados no backend atual. Não confundir `status` operacional com `payment_status`. O painel administrativo pode alterar andamento por `admin_set_order_status`, mas **não pode declarar um pagamento aprovado**. Para confirmar pagamento, conferir o identificador da Order no Mercado Pago, a transação, o valor, a moeda e o pedido local antes de ação manual; nunca confiar só na URL de retorno do navegador.

Um webhook sem assinatura é rejeitado, e o handler consulta a API do Mercado Pago. Existem, porém, riscos ainda abertos de idempotência/concorrência e reconciliação financeira. Consulte [RUNBOOK.md](./RUNBOOK.md) antes de tratar pedido `pending` após pagamento.

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
| GA4 | [Analytics](https://analytics.google.com/) → Admin → Data streams | ID real `G-...` após confirmar se já existe propriedade | Credenciais da conta | DebugView recebe eventos somente após consentimento; `purchase` só para pedido pago. |
| Clarity | [Clarity](https://clarity.microsoft.com/) → projeto → Settings | ID real após confirmar projeto existente; masking de PII | Credenciais da conta | Nenhum script antes do aceite; replay não mostra PII. |
| Search Console | [Search Console](https://search.google.com/search-console/) → Add property | Domain Property `carnevele.com.br`, verificação DNS, envio de `https://carnevele.com.br/sitemap.xml` | Acesso ao registrador | Propriedade verificada e sitemap processado. |
| Backup | Supabase → Database → Backups; procedimento de exportação | Exportação lógica testada e cópia fora do projeto antes de migration | Dump com PII, senhas e tokens | Restaurar em ambiente isolado e conferir contagens. |

O projeto Supabase estava no plano Free em 16/09/2026. Não presumir backup diário automático; [a documentação oficial](https://supabase.com/docs/guides/platform/backups) recomenda exportações regulares para esse plano. Objetos Storage exigem estratégia separada.
