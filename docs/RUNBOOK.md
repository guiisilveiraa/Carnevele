# CARNEVELE — runbook operacional

Atualizado em 06/10/2026. **Não alterar pagamento, pedido, banco ou produção para “consertar” um sintoma sem registrar evidência, plano e rollback.** Não compartilhar dados pessoais ou credenciais em tickets ou chat. Referências: [mapa operacional](./ADMIN-OPERATIONS.md), [incidentes](./SECURITY-INCIDENT.md), [checklist](./LAUNCH-CHECKLIST.md).

## Venda, pagamento e notificações

**Recebi uma venda; onde vejo?** Acesse o admin somente com conta autorizada. Compare número do pedido, `payment_status` e `status`; se necessário confira a Order e a transação no painel Mercado Pago da integração correta. `paid`/`approved` é evidência local, não substitui conciliação com o provedor em caso de dúvida.

**Cliente diz que pagou, mas aparece `pending` / webhook não chegou.** Anote número/ID do pedido, horário e `X-Request-ID` sem publicar PII. Consulte Logs do projeto `carnevele-api`, histórico de webhooks no Mercado Pago e a Order oficial. Confirme `external_reference`, ID da Order, aplicação, valor, moeda e status. Pedido ausente/divergente não recebe confirmação 200 e o Mercado Pago pode repetir; não marque `payment_status` manualmente. O cron protegido consulta a Order oficial antes da mesma RPC transacional. Se a notificação ficou `pending`/`failed`, corrija a causa e repita o evento oficial controladamente: a RPC e as chaves de idempotência impedem o segundo incremento/envio normal.

**E-mail não chegou.** Consulte `order_notifications` pelo pedido/canal sem copiar endereço ou corpo. Verifique domínio Resend, SPF/DKIM/DMARC, `RESEND_FROM_EMAIL`, presença da API key e logs de entrega. O cron inclui eventos `pending`, falhas de e-mail com menos de cinco tentativas e claims de e-mail travados há mais de 15 minutos; o envio usa a mesma chave idempotente por pedido/evento/canal. Corrija a causa e deixe a fila fazer o retry: não crie manualmente uma segunda mensagem nem peça ao cliente para repetir a compra.

**Push não chegou.** Verifique presença de `PUSHOVER_APP_TOKEN` e `PUSHOVER_USER_KEY`, sem revelar valores. Uma falha confirmada cria `admin_email_fallback`; a venda permanece aprovada. Pushover não oferece chave de idempotência do provedor, portanto uma interrupção exatamente entre entrega e confirmação local deve ser conciliada pelos logs antes de retry manual.

## Catálogo e pré-venda

**Trocar imagem, remover PP, adicionar GG, trocar preço ou modo de venda.** Use `/admin` → **CATÁLOGO** após autenticação MFA. Edite o produto/variante e salve. Para “remover”, desative; não apague objetos usados em pedidos. Upload aceita somente JPG/JPEG, PNG, WEBP ou AVIF até 5 MB e cria um nome novo, preservando imagens históricas. `preorder_sold` e `stock_reserved` não são editáveis pelo painel. Pedidos antigos continuam usando snapshot de nome, imagem, preço, cor e tamanho.

**Reservas abandonadas.** Checkout pendente reserva capacidade e recebe expiração operacional de 30 minutos. A mesma tentativa é deduplicada, há uma tentativa pendente por usuário e limites de 10 unidades por produto/20 no carrinho. Antes de criar uma nova reserva, o backend reconcilia as vencidas daquele usuário. O cron `/api/reconcile-pending-orders`, autenticado por `CRON_SECRET`, faz reconciliação global diária às 03:00 UTC no agendamento compatível com Hobby. Uma Order vinculada só é atualizada após consulta oficial ao Mercado Pago; status ainda pendente não libera reserva. Pedido local vencido sem Order vinculada é cancelado e liberado. Em plano Pro/Enterprise, avaliar frequência maior com base no limite oficial do plano e no volume real.

**Cron falhou.** Abra Vercel → `carnevele-api` → Cron Jobs e Logs. Confirme apenas a presença de `CRON_SECRET` em Production, sem exibir o valor. Uma chamada sem `Authorization: Bearer ...` deve retornar 401. Não libere reservas por SQL manual: consulte a Order oficial ou reexecute o cron autenticado depois de corrigir a causa.

## Indisponibilidade e erro

**Site fora do ar.** Conferir DNS e HTTPS do domínio, projeto frontend na Vercel, deployment em Production e status da Vercel. Em 06/10/2026 o domínio final e `www` ainda não resolviam. Não desligar a loja antiga antes de verificar o novo endereço e redirecionamento.

**Backend devolve 500 / checkout falha.** Conferir `api/health` (apenas processo, não dependências), logs Vercel, falhas de Supabase e Mercado Pago por request ID/horário. Não registrar `Authorization`, token MP, service role, endereço ou resposta completa de terceiro. Verificar presença e escopo das env vars sem revelar valores. Se falha iniciou após deploy, avaliar promover deployment anterior com rollback documentado.

**Como vejo logs?** Vercel → projeto `carnevele-api` → Logs para checkout/webhook; Supabase → Logs e Advisors; Mercado Pago → aplicação → Webhooks/eventos. Confirmar projeto e ambiente antes de concluir que um evento não ocorreu.

**Como faço rollback?** Registrar antes de publicar commit frontend/backend, deployment Vercel estável, migration e exportação do banco. Para frontend/backend, promover deployment anterior verificado. Os scripts versionados em `carnevele-api/supabase/rollback` restauram policies/grants/funções sem apagar catálogo ou pedidos; o rollback do checkout deve ser coordenado com o deploy da API anterior. Não restaurar produção sem avaliar pedidos criados depois do backup. No plano Free do Supabase, não presumir backup diário automático.

## Segurança imediata

Se houver suspeita de segredo vazado, admin comprometido, pedido de outro cliente visível ou webhook forjado: pausar mudanças, preservar evidência sem PII e seguir [SECURITY-INCIDENT.md](./SECURITY-INCIDENT.md). Não executar brute force, flood ou compra real para diagnosticar.
