# CARNEVELE — gate de lançamento

Estado de 06/10/2026: **NO-GO**. Uma caixa só deve ser marcada com evidência, responsável e data. `GO` exige zero P0 conhecido. Nunca marcar como feito com base apenas em uma tela ou no código local.

## P0 — bloqueia lançamento

- [ ] Domínio `carnevele.com.br` resolve e HTTPS funciona; `www` redireciona para sem-www.
- [ ] Frontend Vercel em Production verificado, com deployment/rollback identificados.
- [ ] Exportação/restauração de banco testada antes de migrations; versão estável registrada.
- [ ] RLS e grants testados com usuário A, B, admin e anon (pedidos, itens, endereços, perfis, admin, catálogo).
- [ ] RPC administrativa rejeita usuário comum; conta admin protegida e MFA/TOTP verificado.
- [ ] Checkout com JWT ausente/inválido, endereço alheio, variante inativa, tamanho removido, quantidade inválida e preço adulterado testado em preview.
- [ ] Catálogo/variantes com Supabase como fonte de verdade e snapshot histórico intacto.
- [ ] Pré-venda por produto: limite 1000 e contador transacional apenas para pagamento aprovado, sem incremento duplicado.
- [ ] Mercado Pago produção e webhook corretos: assinatura, consulta oficial, vínculo por IDs, valor, moeda, integração, transições e idempotência testados sem compra real.
- [ ] Corrigida a possibilidade de evento pago ser reconhecido com zero pedidos atualizados e de webhook repetido regredir status.
- [ ] E-mail cliente e push admin após primeira aprovação, ambos idempotentes, com fallback seguro.
- [ ] Nenhum secret privilegiado no frontend, GitHub ou logs; env vars de Production/Preview verificadas sem divulgar valores.

## P1 — corrigir antes do lançamento

- [ ] CORS final explícito; remover origem GitHub Pages e previews somente após a migração/testes.
- [ ] Security Definer: revogar EXECUTE desnecessário; testar trigger de cadastro e RPC admin em branch de banco.
- [ ] Supabase Auth: Site URL, redirect URLs, confirmação de e-mail, proteção de senha vazada, força e rate limits verificados.
- [ ] Rota `/admin` disponível, `admin.html` `noindex`, sem dados para anon/cliente comum.
- [ ] Headers de segurança em preview: CSP report-only primeiro, `nosniff`, Referrer-Policy, Permissions-Policy, frame-ancestors; HSTS após domínio estável.
- [ ] Resend: domínio único verificado, SPF, DKIM, DMARC e entrega de teste.
- [ ] Pushover: push e fallback de e-mail testados com fixture, sem PII excessiva.
- [ ] Logs/monitoramento de 500, checkout, webhook e notificações sem tokens/PII.
- [ ] Testes de XSS, IDOR/BOLA, RPC, CORS, CSRF aplicável, replay, rate limit e abuso controlado sem flood.
- [ ] Mobile, desktop, teclado, foco, labels, contraste, modais e formulários revalidados.

## Publicação, privacidade e SEO

- [ ] Canonical, Open Graph, Schema.org, sitemap, robots, manifest e `llms.txt` apontam para `https://carnevele.com.br`.
- [ ] `robots.txt` e `sitemap.xml` respondem no domínio final; admin/conta/carrinho fora do sitemap.
- [ ] Loja GitHub Pages antiga redirecionada/desindexada somente após nova produção estável.
- [ ] Propriedade GA4 existente verificada ou criada uma única vez; ID real e eventos com consentimento.
- [ ] Projeto Clarity existente verificado ou criado uma única vez; ID real, consentimento e masking de PII.
- [ ] Search Console Domain Property verificada por DNS e sitemap enviado.
- [ ] Políticas de privacidade/cookies refletem todos os terceiros efetivos; revisão jurídica profissional solicitada.
- [ ] Imagens, fontes, LCP/CLS/FCP e cache revalidados sem sacrificar segurança.
- [ ] Auditoria de dependências e versões fixas revisadas sem upgrade massivo.

## Evidência atual (não substitui validação do deployment)

- Em 06/10/2026 foram aplicadas dez migrations aditivas: catálogo, 28 variantes, snapshots, fila de notificações, Storage, hardening, proteção de modo, AAL2 no banco, tentativas de checkout/reservas, recuperação de claims de e-mail e inventário de retries acessível apenas pela `service_role`.
- Testes SQL com rollback confirmaram: usuário comum não vê pedidos/endereços alheios; funções de trigger não são executáveis; RPC admin nega usuário comum e aceita admin; produto/variante/tamanho/quantidade inválidos são bloqueados; valor/moeda divergentes são rejeitados; aprovação duplicada incrementa `preorder_sold` exatamente uma vez e cria dois eventos exatamente uma vez.
- Testes AAL1/AAL2 com rollback confirmaram que AAL1 não lê catálogo inativo nem executa `admin_set_order_status`; AAL2 acessa o catálogo administrativo e chega à validação normal da RPC.
- Testes transacionais de checkout confirmaram: repetição do mesmo UUID retorna o mesmo pedido; reserva aumenta uma vez; segunda tentativa ativa do usuário é negada; limites de 10 por produto/20 por carrinho falham sem vazar reserva; RPC legada perdeu EXECUTE de `service_role`.
- Backend: 24 testes automatizados aprovados; check e audit aprovados. Cobertura inclui JWT, CORS explícito, endereço alheio, preço adulterado, tentativa obrigatória, limites, assinatura/frescura, integração/valor/moeda/external reference, duplicidade, reconciliação protegida, retry de notificação aprovada, falha temporária sinalizada sem tocar no pagamento, HTML escapado/acessível, alternativa texto e fallback Pushover→Resend.
- Frontend: build e check aprovados; painel de catálogo, upload seguro, MFA/TOTP e `/admin` implementados; Supabase SDK local fixado; CSP segue em Report-Only até validação em preview.
- Vercel: checks de preview verdes para frontend `393657f` e backend `e1e5f7b`. O primeiro build backend falhou apenas pela ausência do diretório de saída `public`; o commit `8306f87` corrigiu e os checks seguintes passaram. Os previews estão protegidos por Vercel Authentication e a conexão disponível não obteve o bypass, portanto os fluxos HTTP autenticados ainda exigem validação manual no preview.
- Advisors após as migrations: removidos os alertas de FK sem índice e `auth_rls_initplan`; permanecem apenas avisos intencionais de tabelas fechadas, RPCs autenticadas e Leaked Password Protection desativada.

- Em 06/10/2026, Production `api/health` respondeu 200; checkout sem JWT e webhook sem assinatura responderam 401; origem CORS não permitida não recebeu `Access-Control-Allow-Origin`. A nova rota de reconciliação respondeu 404, confirmando que o backend novo não foi promovido.
- `pnpm check`: 7 páginas e 11 assets técnicos aprovados; avisos de IDs GA4/Clarity vazios. `pnpm audit`: zero vulnerabilidades relatadas no lockfile atual.
- Supabase: catálogo, Storage e dez migrations existem no projeto ativo. Não há branch de banco no plano atual; plano Free não garante backup diário automático.
- Domínio final e `www` não resolveram em 06/10/2026; Resend conectado não possuía domínio de envio. Vercel/GA4/Clarity/Mercado Pago exigem verificação no painel correto.
- A varredura Codex Security anterior às correções registrou 2 achados altos e 1 médio; os três receberam patch e teste direcionado. A revisão independente pós-patch não executou por limite de uso da conta e deve ser repetida antes do GO.
