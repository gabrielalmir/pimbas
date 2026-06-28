# Pimbas

Aplicação web para gestão de partidas e torneios de pimbolim (foosball). App Next.js único — páginas e API (Route Handlers) no mesmo deploy, Prisma/Postgres.

## Stack

- **App**: Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS v4 + componentes internos (inspirado Shadcn + Base UI), TanStack Query, Vitest
- **API**: Route Handlers em `app/api/v1/**`, Prisma 7 (PostgreSQL via `@prisma/adapter-pg`), Zod, Argon2, JWT via `jose`
- **Regras de negócio**: `domain/` (TypeScript puro + Zod + testes)
- **Produção**: Vercel (recomendado, deploy nativo do Next.js) ou self-host via Docker (`oven/bun`, output `standalone`) — ver `docs/deploy-fly.md`

## Documentação

A documentação principal está consolidada neste README.

Documentos complementares operacionais:

- [Deploy em produção](docs/deploy-fly.md) — Vercel (recomendado) ou self-host via Docker.
- [UI System Design](docs/pimbas-ui-system-design.md) — guia de identidade visual e manutenção da interface (Tailwind + componentes).
- [Redesign visual das telas](docs/frontend-redesign-screens.md) — processo de auditoria e backlog priorizado de redesenho das telas do frontend.
- [Migração do backend para Next.js](docs/backend-to-nextjs-migration.md) — registro da unificação do antigo backend Fastify e do pacote de domínio dentro do app principal (já concluída).

## Estrutura

```text
.
├── app/                     # Páginas (App Router)
├── app/api/v1/              # Route Handlers da API (auth, players, groups, matches, tournaments)
├── components/              # Componentes de UI
├── domain/                  # Regras de negócio puras (match, ranking, torneio), schemas Zod e tipos
├── lib/                     # Domínio do cliente, data clients, lib/server/* (auth, jwt, prisma, rate-limit)
├── prisma/                  # schema.prisma, migrations, seed
├── docs/                    # Docs operacionais (deploy, UI system, migração)
├── Dockerfile               # Self-host opcional (Next.js standalone) — Vercel não usa isto
└── package.json
```

## Comandos

```bash
bun install
bun run dev                 # next dev (via turbo)
bun run build
bun run test
bun run lint
bun run typecheck
bun run db:generate         # prisma generate
bun run db:migrate          # prisma migrate dev
bun run db:seed             # seed de desenvolvimento
```

Para rodar comandos em um workspace específico:

```bash
bun run --filter=@pimbas/frontend build
```

O app roda por padrão em modo **mock** (armazenamento local). Para usar a API embutida (`app/api/v1/**`), defina `NEXT_PUBLIC_API_URL=/` e configure `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (veja `.env.example`). A troca é feita apenas no `dataClient` (`lib/data-client-switch.ts`).

## Escopo Implementado (atual)

**Autenticação e Usuários**
- Cadastro e login com email/senha usando Argon2.
- JWT com access token (curto) + refresh token com rotação e revogação via `tokenVersion`.
- Endpoint `/me` que retorna usuário + player profile vinculado.

**Grupos e Membros**
- CRUD de grupos.
- Códigos de convite + endpoint de join.
- Listagem de membros + remoção por admin.
- Isolamento de dados por grupo (middleware de membership).
- Configurações padrão de partida por grupo.

**Jogadores**
- Criação e edição da própria ficha de jogador (vinculada ao usuário logado).
- Perfis anônimos suportados no modelo.

**Partidas Amistosas (2v2)**
- Criação de amistoso com 4 jogadores + definição de goleiro/atacante.
- Regras completas em `domain/`: tempo, limite de gols, golden goal.
- Registro e undo de gols (janela de tempo).
- Encerramento manual ou automático.
- Histórico completo por grupo.
- Ranking de jogadores e estatísticas de duplas calculados no servidor.

**Torneios (mata-mata)**
- Criação com sorteio aleatório ou duplas manuais (`domain/`: `createRandomPairs`/bracket).
- Geração de chaveamento com byes automáticos, disputa de 3º lugar quando há 4+ duplas.
- Início de confronto cria a partida real (mesmas regras de partida amistosa).
- Avanço de rodada e definição de campeão automáticos ao finalizar cada partida.

**Frontend**
- Suporte a modo mock (localStorage) e modo real (via `NEXT_PUBLIC_API_URL` + `httpDataClient`).
- TanStack Query.
- UI com Tailwind v4 + componentes internos inspirados em Shadcn.

**Qualidade**
- Regras de negócio testadas no domain + testes de integração da API (`app/api/v1/integration.test.ts`, route handlers exercitados diretamente com um mock de Prisma).
- Validação Zod em todas as entradas.
- Autenticação + autorização por membership em rotas mutáveis.

## Limitações e Pendências

- Login com Google pendente (campo `googleSub` existe no schema).
- Sem tempo real, websockets ou notificações.
- Autorização é apenas por `admin`/`member` do grupo (sem roles adicionais).
- Filtros avançados de histórico (por dupla, por torneio, por período) são parciais.
- **Bug pré-existente, fora do escopo desta sessão**: vários métodos de `httpDataClient` (`getMatch`, `getLiveMatch`, `registerGoal`, `undoGoal`, `finishMatch`, `createFriendly`) esperam a API devolver o `Match` "nu", mas as rotas sempre devolveram `{ match: ... }` (já era assim no Fastify antigo). Os novos endpoints de torneio foram escritos corretamente (desembrulhando a resposta); os métodos antigos não foram tocados — ver `docs/backend-to-nextjs-migration.md`.
- **Divergência conhecida**: `lib/domain` (tipos usados pela UI) e `domain/` (usado pela API) têm definições diferentes para `CreateFriendlyInput` — a UI monta `{ pairA, pairB }` aninhado, a API espera campos planos (`pairAName`, `pairAGoalkeeperId`, ...). Em modo mock isso não importa (o mock não valida contra o schema Zod), mas o fluxo de criar amistoso contra a API real precisa desse contrato alinhado antes de funcionar de ponta a ponta.

## Segurança e Qualidade

- Senhas com Argon2id; tokens com versão para revogação em logout global.
- Todas as mutações validadas com Zod.
- Proteção de rotas por autenticação + `requireGroupMember` / `requireGroupAdmin` (`lib/server/*`).
- TypeScript strict, zero `any` no código de aplicação.
- Testes: domain (regras puras) + API (integração com mock de Prisma via vitest).
- `bun run lint/typecheck/test/build` passa.

## Arquitetura em Resumo

- Regras de domínio (`matchRules`, `ranking`, `tournament`, schemas) vivem em `domain/` e são compartilhadas pela API e pelo cliente.
- A própria app Next.js persiste e aplica regras via Route Handlers (`app/api/v1/**`) + Prisma/adapter-pg (`lib/server/prisma.ts`).
- Frontend pode operar 100% em mock ou contra a API embutida trocando apenas o `dataClient`.
- Deploy de produção: Vercel (build nativo do Next.js) ou, para self-host, a imagem Docker na raiz (`next build` com output `standalone`).

# Claude Multi-Agent Team

This package contains a reusable Claude Code multi-agent setup.

## Structure

```txt
CLAUDE.md
.claude/
  agents/
    project-coordinator.md
    product-manager.md
    backend-specialist.md
    frontend-specialist.md
    frontend-design-specialist.md
    design-specialist.md
    security-specialist.md
    qa-quality-specialist.md
    devops-specialist.md
    marketing-sales-specialist.md
    cost-finance-manager.md
    prompt-engineer.md
```

## Suggested Usage

Copy `CLAUDE.md` and the `.claude/agents/` folder into the root of your project.

Use the Project Coordinator first for large tasks:

```md
Use the multi-agent team workflow.

First, ask the Project Coordinator to summarize the task, define scope, risks, dependencies, and the recommended agent sequence.

Then ask the Product Manager to define business value and acceptance criteria.

Then ask the relevant technical specialists to analyze implementation impact.

Do not implement until the coordinator produces a short execution plan and I approve it.
```

For final review:

```md
Run the final multi-agent review.

QA must verify tests, lint, typecheck, and build.

Security must review risks.

Product must verify acceptance criteria.

Project Coordinator must produce the final delivery report with remaining risks and next steps.
```
