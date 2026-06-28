# Migração do backend (`backend/`, Fastify) para a raiz do repositório (Next.js)

Status: **implementado.** O backend Fastify foi removido; toda a lógica vive agora em `app/api/v1/**` (Route Handlers). Este documento começou como plano (formato de Análise de Impacto do `AGENTS.md`, seções 9 e 11) e foi atualizado após a execução com o que de fato mudou — ver "Implementação realizada" no final.

## Decisão tomada (seção 6, respondida)

Arquitetura escolhida: **unificar tudo num único app na raiz do repositório** — sem backend separado, sem Dockerfile/Fly dedicados à API. O app inteiro (páginas + API) deploya na Vercel; o `Dockerfile` na raiz existe apenas como opção de self-host alternativa (ver `docs/deploy-fly.md`).

## 1. Por que considerar isso

- O frontend já migrou de Vite/`frontend/` para Next.js. Hoje o app tem dois serviços/runtimes (Fastify em `backend/`, Next.js no app principal) que só se conectam via HTTP (`NEXT_PUBLIC_API_URL`/`apiFetch`), apesar de já compartilharem `@pimbas/domain` e do frontend já rodar em Node/Next em produção.
- Manter dois serviços tem custo recorrente de sincronização que **já causou um incidente real nesta sessão**: o `Dockerfile` e `docs/deploy-fly.md` ainda fazem `COPY frontend ./frontend` e esperam `frontend/dist`, caminhos que não existem mais desde a migração do frontend. Um `fly deploy` hoje provavelmente falha no build da imagem. Unificar tudo elimina essa classe de drift (não há mais dois projetos para manter sincronizados).
- CORS, dois Dockerfiles/processos, e duas pipelines de typecheck/lint deixam de ser necessários se tudo roda como um único app Next.js.

## 2. Estado atual (fatos observados)

- `backend/` é Fastify 5 + Prisma 7 (`@prisma/adapter-pg`) + Zod + Argon2 + `@fastify/jwt` (access/refresh, namespaces separados) + `@fastify/rate-limit` (global: false, por rota) + `@fastify/cors` + `@fastify/static` (serve o SPA antigo em produção).
- Módulos de rota: `auth/routes.ts` (42 linhas: signup/login/refresh), `users/routes.ts` (9 linhas), `players/routes.ts` (23 linhas), `groups/routes.ts` (89 linhas), `matches/routes.ts` (191 linhas: amistosos, gols, undo, finish, ranking, pair-stats). Total ~354 linhas de lógica de rota, todas validando entrada com Zod e delegando regras de negócio para `@pimbas/domain`.
- Auth: JWT via Bearer token (não cookie). Frontend guarda os tokens em `localStorage` (`lib/auth.ts`) e manda `Authorization: Bearer ...` (`lib/http-data-client.ts` + `apiFetch`). **Isso não precisa mudar na migração** — é um detalhe de transporte HTTP, não de framework.
- Prisma schema (`backend/prisma/schema.prisma`) tem 9 models: `User`, `PlayerProfile`, `Group`, `GroupMember`, `Match`, `MatchPair`, `PairPlayer`, `Goal`, `Tournament` — o model `Tournament` **já existe no schema**, mas nenhuma rota o usa ainda (consistente com o README: "Backend ainda não expõe endpoints" de torneio).
- Frontend hoje opera em modo mock por padrão (`lib/data-client-switch.ts`) e só usa `httpDataClient` quando `NEXT_PUBLIC_API_URL`/equivalente está definido — ou seja, a troca de transporte é uma única chave, já desenhada para isso.
- Deploy de produção é Fly.io, instância única: Fastify builda e serve o SPA + API na mesma origem (`docs/deploy-fly.md`). Suporte experimental a Vercel foi removido explicitamente ("O suporte experimental a Vercel ... foi removido. O caminho principal de produção é Fly + Docker").

## 3. Arquitetura alvo (proposta)

- Rotas REST atuais (`/api/v1/...`) tornam-se **Next.js Route Handlers** em `app/api/v1/**/route.ts`, um arquivo por recurso (mesma granularidade dos módulos atuais: `auth`, `players`, `groups`, `matches`).
- `@pimbas/domain` continua exatamente como está — já é consumido pelos dois lados, nenhuma mudança necessária. (Atualização: posteriormente movido para `domain/` no app principal, já que deixou de ter outro consumidor — ver "Implementação realizada".)
- Prisma move para a raiz (schema, migrations, client gerado) ou para um novo `packages/database` compartilhado caso surja outro consumidor no futuro. Recomendação: mover direto para `prisma/` por simplicidade — não há hoje nenhum outro consumidor real de Prisma fora do backend.
- JWT: substituir `@fastify/jwt` por uma função de assinar/verificar baseada em `jose` (ou `jsonwebtoken`), mantendo o mesmo payload (`AuthJwtPayload`: `sub`, `tokenVersion`, `kind`) e os mesmos nomes de secret (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`) — zero mudança de contrato para o cliente.
- Argon2 (hash de senha) continua igual; Route Handlers do Next.js rodam em runtime Node por padrão (não Edge), então o binário nativo do Argon2 continua funcionando sem mudança.
- CORS: **removido** — não existe mais front e back em origens diferentes em produção.
- Rate limiting: `@fastify/rate-limit` (em memória, por instância) não tem equivalente built-in no Next.js. Recomendação: implementar um limiter simples em memória (mesma garantia que hoje, já que a instância é única) só nas rotas de auth, como módulo utilitário em `lib/server/rate-limit.ts`. Não é bloqueante para o primeiro corte da migração — pode ficar para uma fase 2 se necessário.
- Middleware de autenticação (`requireAuth`, `requireGroupMember`, `requireGroupAdmin`) torna-se uma função utilitária (`lib/server/auth.ts`) chamada no início de cada Route Handler, em vez de um plugin Fastify.

## 4. Fases propostas

1. **Preparação (sem mudança de comportamento)**
   - Mover `backend/prisma/` → `prisma/`, ajustar `package.json` (scripts `db:generate`/`db:migrate`/`db:seed`, dependências `@prisma/client`, `@prisma/adapter-pg`) e `turbo.json`.
   - Criar `lib/server/` com `prisma.ts` (client singleton), `jwt.ts` (assinar/verificar, mesmo payload), `auth.ts` (helpers `requireAuth`/`requireGroupMember`/`requireGroupAdmin` adaptados para `Request`/`NextResponse`), `errors.ts` (equivalente a `backend/lib/errors.ts`).
   - Adicionar testes de integração para esses helpers antes de migrar qualquer rota (reaproveitar os testes existentes em `backend/**/*.test.ts` como base).
2. **Migração rota por rota** (ordem sugerida, da mais simples/isolada para a mais arriscada): `users` → `players` → `auth` → `groups` → `matches`. Cada rota migrada deve manter o mesmo path (`/api/v1/...`), mesmo formato de request/response e os mesmos testes de integração (portados de `backend/**/*.test.ts`).
   - Durante essa fase, o frontend continua apontando pro Fastify antigo via `NEXT_PUBLIC_API_URL`; só depois que TODAS as rotas estiverem migradas e testadas é que o app passa a servir a si mesmo (`NEXT_PUBLIC_API_URL` vazio/relativo).
3. **Corte**: trocar o `NEXT_PUBLIC_API_URL` padrão para apontar para o próprio Next.js (rota relativa), aposentar `backend/` (remover do workspace, do `turbo.json`, do CI), e **reescrever `Dockerfile`/`docs/deploy-fly.md`** para builda/servir só o Next.js (isso já resolve, de quebra, o bug do `Dockerfile` apontando para `frontend/dist`).
4. **Limpeza**: remover `@fastify/*`, `fastify`, `fastify-type-provider-zod` de qualquer lugar que ainda os referencie; atualizar `README.md`/`AGENTS.md` para descrever a arquitetura nova.

## 5. Riscos

| Item | Tipo | Impacto | Mitigação |
|---|---|---|---|
| Perder cobertura de teste durante a migração rota a rota | Qualidade | Alto | Portar os testes de integração de `backend/**/*.test.ts` ANTES de migrar a rota correspondente, não depois |
| Comportamento de erro/validação Zod sutilmente diferente entre Fastify e Route Handlers | Técnico | Médio | Reaproveitar os mesmos schemas Zod (`*/schemas.ts`) sem reescrever; testar contrato (status code + shape) explicitamente |
| Rate limiting em memória não escala se Fly passar de 1 instância | Técnico | Baixo hoje (já é a limitação atual), médio se escalar | Documentar a limitação; revisar se/quando escalar para múltiplas instâncias |
| Migrations do Prisma (pasta vazia hoje, conforme `docs/deploy-fly.md`) | Operacional | Alto (já é um risco hoje, independente desta migração) | Gerar a baseline de migrations antes de qualquer deploy, migração ou não |
| Escolha de plataforma de deploy (Fly vs Vercel) muda o runbook operacional | Arquitetural | Alto | **Decisão aberta, ver seção 6 — não decidir sem validação humana** |

## 6. Decisões que exigem validação humana antes de implementar

Conforme `AGENTS.md` (seção 16: mudança de autenticação, integração crítica, decisão arquitetural relevante), as seguintes perguntas precisam de uma resposta explícita antes da Fase 1:

1. **Fly.io + Docker continua sendo o destino de produção, ou esta migração é a oportunidade de mover para Vercel** (já que o app passa a ser 100% Next.js, a plataforma nativa do framework)? Isso muda o que é reescrito na Fase 3: um novo `Dockerfile`/`fly.toml` enxuto vs. remover Docker inteiramente e usar `vercel.json`.
2. O Postgres atual (Fly Postgres) seria mantido independente da plataforma de app escolhida, ou migra também (ex.: Neon/Supabase, mais comum em deploys Vercel)?
3. Está OK que a Fase 2 rode com **dois processos em paralelo** (Fastify antigo ainda no ar, Next.js novo sendo migrado rota a rota e validado isoladamente antes do corte), ou existe pressão de prazo que favoreça uma migração "big bang"? Big bang é mais arriscado e não é a recomendação deste plano.

## 7. Como validar

- `bun run typecheck`, `bun run lint`, `bun run test`, `bun run build` na raiz.
- Testes de integração portados de `backend/app.test.ts` para `app/api/v1/integration.test.ts` (mesmos cenários, chamando os Route Handlers diretamente com um mock de Prisma).
- `docker build` real (não só leitura do Dockerfile).

## Implementação realizada

Diferente do plano original (migração incremental, rota a rota, com os dois serviços rodando em paralelo), a migração foi executada **de uma vez** numa única sessão, com validação completa (typecheck/lint/test/build/`docker build` real) ao final. Funcionou porque o contrato HTTP foi preservado rota a rota e havia testes de integração para todos os fluxos críticos antes do corte.

O que foi feito:

- Todas as rotas (`auth`, `me`, `players`, `groups`, `matches`) viraram Route Handlers em `app/api/v1/**`, mesmos paths, mesmo formato de request/response.
- `backend/prisma/` (schema, migrations, seed) movido para `prisma/`. `package.json` ganhou `@prisma/client`, `@prisma/adapter-pg`, `argon2`, `jose`, e os scripts `db:generate`/`db:migrate`/`db:deploy`/`db:seed`.
- `@fastify/jwt` substituído por `jose` (`lib/server/jwt.ts`) — mesmo payload (`sub`, `tokenVersion`, `kind`), mesmas variáveis de ambiente (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`). Nenhuma mudança de contrato para o cliente.
- `requireAuth`/`requireGroupMember`/`requireGroupAdmin` viraram funções utilitárias em `lib/server/auth.ts` e `lib/server/group-authz.ts` (cada Route Handler chama e checa `"response" in resultado`).
- CORS removido (mesma origem agora).
- `backend/` removido do repo; `root package.json` não referencia mais o workspace `backend`.
- `Dockerfile` reescrito para buildar só o app Next.js (output `standalone`); validado com `docker build` + `docker run` reais (health check, rota autenticada retornando 401 sem token, e o binding nativo do argon2 funcionando dentro do container).
- `.github/workflows/ci.yml`, `next.config.ts` (`output: "standalone"`, `serverExternalPackages` para argon2/Prisma), `README.md` e `docs/deploy-fly.md` atualizados.
- Testes portados para `app/api/v1/integration.test.ts`; precisou de um `vitest.config.ts` (resolução do alias `@/` — não vinha de graça no Vitest puro, só quando invocado via `bun run`).
- **Efeito colateral encontrado e corrigido**: ao habilitar `"test": "vitest run"` no `package.json` do frontend (não existia antes — os testes do pacote nunca rodavam no CI), surgiu um duplicado morto (`lib/mocks/mockApi.ts` + seu teste), órfão de uma migração anterior. Removido (`lib/mocks/data.ts` continua em uso pelo mock canônico `lib/mock-api.ts`).

### Riscos que ficaram, documentados mas não resolvidos nesta sessão

- ~~**Rate limiting** das rotas de auth~~ — reimplementado (`lib/server/rate-limit.ts`, limiter em memória por IP+escopo; 5/min em signup, 10/min em login, mesmo limite do Fastify antigo).
- **Divergência de contrato pré-existente**: `lib/domain` (tipos usados pela UI, ex. `CreateFriendlyInput` com `pairA`/`pairB` aninhados) não bate com `domain/` (usado pela API, campos planos como `pairAName`). Isso já existia antes desta migração (não foi introduzido por ela) e só não quebrava nada porque o modo mock não valida contra o schema Zod. Precisa de uma decisão de produto/arquitetura separada sobre qual contrato é o certo antes do fluxo de criar amistoso funcionar de ponta a ponta contra a API real.
- Migrations do Prisma só têm a baseline inicial; nenhuma migração nova foi necessária (o schema não mudou), mas isso deve ser revisitado se o schema evoluir.

### Implementação realizada (consolidação do monorepo)

Numa sessão posterior, o pacote `@pimbas/domain` (`packages/domain`) foi movido para `domain/` dentro do app principal, e todo o conteúdo do app (que vivia em `src/`) foi movido para a raiz do repositório — eliminando o monorepo (sem mais `turbo.json`, sem mais workspaces). Ver `README.md` para a estrutura final.
