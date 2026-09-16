# CARNEVELE — runbook operacional

Atualizado em 16/09/2026. **Não alterar pagamento, pedido, banco ou produção para “consertar” um sintoma sem registrar evidência, plano e rollback.** Não compartilhar dados pessoais ou credenciais em tickets ou chat. Referências: [mapa operacional](./ADMIN-OPERATIONS.md), [incidentes](./SECURITY-INCIDENT.md), [checklist](./LAUNCH-CHECKLIST.md).

## Venda, pagamento e notificações

**Recebi uma venda; onde vejo?** Acesse o admin somente com conta autorizada. Compare número do pedido, `payment_status` e `status`; se necessário confira a Order e a transação no painel Mercado Pago da integração correta. `paid`/`approved` é evidência local, não substitui conciliação com o provedor em caso de dúvida.

**Cliente diz que pagou, mas aparece `pending` / webhook não chegou.** Anote número/ID do pedido e horário sem publicar PII. Consulte Logs do projeto `carnevele-api` na Vercel, histórico de webhooks no Mercado Pago e a Order oficial. Confirme `external_reference`, ID da Order, valor, moeda e status. O código atual pode responder 200 a uma notificação que atualizou zero linhas se ela chegou antes de gravar o ID da Order; trate como risco de conciliação. Não marque `payment_status` manualmente nem reenvie o webhook em produção sem plano/controle de idempotência. Escale para reconciliação segura em preview.

**E-mail não chegou.** O envio transacional ainda não está implementado no backend atual; verificar primeiro domínio Resend, DNS SPF/DKIM/DMARC, remetente aprovado, API key presente apenas no backend e logs de entrega. Não pedir ao cliente para repetir a compra. Quando implementado, reenvio deve consultar registro idempotente para não duplicar mensagens.

**Push não chegou.** Pushover ainda não está implementado. Após implementação, verificar nome/presença das variáveis apenas no backend, logs sem PII e fallback por e-mail administrativo. Falha de push nunca deve alterar o resultado financeiro.

## Catálogo e pré-venda

**Trocar imagem, remover PP, trocar preço, cancelar produto ou colocar estoque.** O painel de catálogo e as tabelas `products`/`product_variants` ainda não existem. Hoje frontend, páginas SEO e backend têm partes do catálogo fixas. **Não edite apenas uma delas nem altere produção diretamente.** Registrar a mudança desejada, preparar modelo/migration em branch de banco isolada, compatibilidade com pedidos antigos, testes de checkout/SEO e rollback. Depois da futura centralização, inativar variantes/produtos com histórico em vez de excluir; snapshots de pedido não devem ser sobrescritos. O limite de pré-venda por produto e o incremento somente após aprovação ainda precisam de implementação transacional.

## Indisponibilidade e erro

**Site fora do ar.** Conferir DNS e HTTPS do domínio, projeto frontend na Vercel, deployment em Production e status da Vercel. Em 16/09/2026 o domínio final e `www` não resolviam; a loja antiga no GitHub Pages respondia 200. Não desligar a loja antiga antes de verificar o novo endereço e redirecionamento.

**Backend devolve 500 / checkout falha.** Conferir `api/health` (apenas processo, não dependências), logs Vercel, falhas de Supabase e Mercado Pago por request ID/horário. Não registrar `Authorization`, token MP, service role, endereço ou resposta completa de terceiro. Verificar presença e escopo das env vars sem revelar valores. Se falha iniciou após deploy, avaliar promover deployment anterior com rollback documentado.

**Como vejo logs?** Vercel → projeto `carnevele-api` → Logs para checkout/webhook; Supabase → Logs e Advisors; Mercado Pago → aplicação → Webhooks/eventos. Confirmar projeto e ambiente antes de concluir que um evento não ocorreu.

**Como faço rollback?** Registrar antes de publicar commit frontend/backend, deployment Vercel estável, migration e exportação do banco. Para frontend/backend, promover deployment anterior verificado. Para migration, usar script reversível validado em branch de banco; rollback de esquema não recupera dados excluídos. Não restaurar produção sem avaliar pedidos criados depois do backup. No plano Free do Supabase, não presumir backup diário automático.

## Segurança imediata

Se houver suspeita de segredo vazado, admin comprometido, pedido de outro cliente visível ou webhook forjado: pausar mudanças, preservar evidência sem PII e seguir [SECURITY-INCIDENT.md](./SECURITY-INCIDENT.md). Não executar brute force, flood ou compra real para diagnosticar.
