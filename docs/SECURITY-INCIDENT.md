# CARNEVELE — resposta a incidentes

Atualizado em 06/10/2026.

Este é um procedimento operacional, não um local para armazenar segredos. Não incluir PII, dumps, URLs de recuperação, cookies de sessão ou valores de env vars em chats, commits, logs ou screenshots públicos.

## Primeiros passos

1. Registrar horário, sintoma, ambiente, sistemas afetados e pessoa responsável. Preservar logs e evidência com acesso restrito.
2. Conter sem destruir provas: bloquear acesso suspeito, pausar deploys e evitar alterações em pedidos enquanto se determina o impacto. Se checkout estiver inseguro, decidir com o responsável pela loja se deve ser temporariamente desabilitado.
3. Identificar o que vazou e seu alcance. Rotacionar a credencial **no provedor de origem**, depois atualizar somente os ambientes Vercel corretos e fazer deploy controlado; nunca colar valores no chat.
4. Revogar sessões/acessos quando possível, revisar logs e pedidos desde a primeira exposição, testar com fixture/preview, documentar impacto e comunicar pessoas afetadas conforme avaliação jurídica/LGPD.
5. Encerrar somente após confirmar novos acessos, integridade de pagamentos/dados, monitoramento e plano de prevenção.

## Cenários

| Cenário | Contenção e recuperação |
| --- | --- |
| Conta admin comprometida | Suspender sessão/acesso da conta, redefinir senha, reconfigurar TOTP/recovery codes, revisar `admin_users`, RPCs administrativas, alterações de status, logins e pedidos. Não adicionar outro admin sem trilha de aprovação. |
| GitHub comprometido | Revogar sessões/tokens/chaves, revisar colaboradores, branches, commits, Actions e secrets; congelar merge/deploy automático; identificar credenciais que tenham aparecido no histórico e rotacioná-las. |
| Vercel comprometida | Revogar membros/tokens, revisar env vars, deploys, domínios, logs e alterações de configuração; rotacionar credenciais acessíveis à equipe/ambiente afetado; promover deployment confiável somente após verificar integridade. |
| Supabase publishable key exposta | A chave publishable é pública por design; investigar **RLS, grants e abuso**, não presumir vazamento de service role. Rotacionar se houver motivo operacional. |
| Supabase service role/secret key exposta | Tratar como acesso privilegiado ao banco: revogar/rotacionar imediatamente no Supabase, atualizar backend, revisar queries/logs/exportações, sessões e PII possivelmente acessadas. A RLS não protege contra service role. |
| Token Mercado Pago exposto | Revogar/rotacionar na aplicação correta, atualizar backend, revisar Orders, pagamentos, webhooks, valores e alterações na integração. Conciliar pedidos locais com o provedor. |
| Webhook secret exposto | Rotacionar no Mercado Pago e backend de forma coordenada para não perder eventos. Revisar notificações e transições desde a exposição, reconciliar com a API oficial e não confiar no payload recebido. |
| Resend API key exposta | Revogar/rotacionar na conta Resend, atualizar backend, revisar envios/domínios/logs e possíveis mensagens fraudulentas. |
| Pushover token/user key expostos | Revogar/rotacionar no Pushover, atualizar backend e revisar notificações enviadas. |
| Catálogo adulterado / stored XSS | Desativar produto/variante afetado sem apagar histórico, preservar valores e logs, revisar conta admin/MFA e Storage. Campos do catálogo devem continuar escapados no storefront e no e-mail; não reutilizar SVG ou URL insegura. |
| Contador/reserva divergente | Pausar checkout do produto, conciliar pedidos e pagamentos oficiais, comparar `preorder_sold`, `preorder_reserved`, itens e eventos. Não corrigir contador à mão sem lista de pedidos, aprovação e migration auditável. |
| Reservas pendentes em massa | Suspender temporariamente novos checkouts se a capacidade estiver indisponível, preservar request/order IDs, verificar tentativas por usuário e executar a reconciliação autenticada. Nunca liberar Order vinculada apenas pelo relógio; confirmar status na API oficial do Mercado Pago. Revisar abuso de criação de contas sem executar flood. |
| Notificação duplicada/ausente | Verificar `order_notifications`, idempotency key e logs de Resend/Pushover. Não alterar o pagamento. Em ambiguidade de Pushover, prefira conciliar a repetir o push; o fallback por e-mail é canal separado. |

## Evidência e correlação

Checkout, webhook e reconciliação emitem `X-Request-ID` e registram apenas IDs operacionais, status, canal, contagens e código HTTP. Nunca adicionar ao log `Authorization`, JWT, service role, `CRON_SECRET`, tokens de Mercado Pago/Resend/Pushover, senha, cartão ou endereço. Preserve os IDs de correlação com o horário UTC e o deployment/commit analisado.

## Critérios para reabrir

- Credenciais e sessões comprometidas revogadas; acesso mínimo restabelecido.
- Pedidos afetados conciliados com Mercado Pago e estados locais corrigidos por procedimento auditável.
- Logs preservados, impacto documentado, responsáveis notificados e testes de não regressão concluídos.
- Quando houver dados pessoais, buscar avaliação jurídica especializada para obrigações de comunicação.
