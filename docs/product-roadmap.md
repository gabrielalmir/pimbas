# Product Roadmap — Pimbas

> Gerado em: 2026-06-28. Baseado na avaliação do produto contra o milestone MVP Launch (deadline 2026-06-29).

## Visão do Produto

Pimbas substitui o rastreamento informal de partidas de pimbolim (WhatsApp, memória, planilhas) por um tracker mobile-first com ranking, histórico e torneios. O motor de retenção é o ranking — jogadores voltam porque se importam com sua posição. O motor de crescimento é o código de convite — usuários trazem novos membros.

---

## Estado atual

O app funciona **end-to-end em modo mock** e tem design forte (live match, ranking com pódio, bracket SVG de torneio). Em modo API real, o core loop de partidas está **quebrado** por dois bugs de contrato conhecidos. O onboarding de perfil existe mas não é acionado.

### Loop principal

| Etapa | Mock | API Real |
|---|---|---|
| Signup / Login | ✓ | ✓ |
| Criar / entrar em grupo | ✓ | ✓ |
| Criar amistoso | ✓ | ✗ Issue #23 |
| Registrar gols ao vivo | ✓ | ✗ Issue #22 |
| Encerrar partida | ✓ | ✗ Issue #22 |
| Ver ranking | ✓ | ✓ |
| Torneio completo | ✓ | Não testado |

---

## P0 — Bloqueadores de Lançamento

> Devem ser resolvidos antes de qualquer usuário real usar o app em produção.

### [#22] httpDataClient envelope mismatch (`{ match }`)

**Problema:** Todos os Route Handlers retornam `{ match: Match }`, mas vários métodos do `httpDataClient` esperam `Match` diretamente. Toda operação de partida falha silenciosamente em modo real.

**Métodos afetados:** `getMatch`, `getLiveMatch`, `registerGoal`, `undoGoal`, `finishMatch`, `createFriendly`

**Fix:** Desembrulhar o envelope em cada método de `lib/http-data-client.ts`.

**Esforço:** S | **Arquivo:** `lib/http-data-client.ts`

---

### [#23] CreateFriendlyInput shape divergente (aninhado vs plano)

**Problema:** A UI envia `{ pairA: { name, players } }` (aninhado), mas a API espera `pairAName`, `pairAGoalkeeperId`, `pairAAttackerId` (plano). Criação de amistoso falha na validação Zod.

**Fix:** Serializar para campos planos no método `createFriendly` do `httpDataClient`. Não alterar o schema da API.

**Esforço:** S | **Arquivo:** `lib/http-data-client.ts`

---

### [#24] Onboarding de perfil não acionado após signup

**Problema:** Após signup, usuário vai direto para `/groups` (vazia). A página `/profile-onboarding` existe mas nunca é exibida. A maioria dos usuários nunca preenche nome, posição ou avatar.

**Fix:** Alterar `router.push('/groups')` para `router.push('/profile-onboarding')` no `app/signup/page.tsx`.

**Esforço:** XS | **Arquivo:** `app/signup/page.tsx`, `app/profile-onboarding/page.tsx`

---

## P1 — Quick Wins (pós-lançamento, semana 1)

| # | Feature | Por quê | Esforço |
|---|---|---|---|
| — | Tela de resultado ao encerrar partida | Momento de celebração; sem ela o fluxo simplesmente para | S–M |
| — | Join-by-code em destaque para novos usuários | Primeiro usuário vem por convite; join deve aparecer antes de "criar grupo" | XS |
| — | Link de convite compartilhável (`/groups/join?code=XXX`) | Elimina dois passos do fluxo de convite vs copiar código manual | M |
| — | Redesign de `/groups/[groupId]/friendly/new` | Tela mais usada; visualmente inconsistente com o resto do app | S |

---

## P2 — Crescimento (semanas 2–4 pós-lançamento)

| Issue | Feature | Por quê | Esforço |
|---|---|---|---|
| — | Página de detalhe de partida (`/matches/[matchId]`) | Histórico visitável: quem marcou, quando, em qual posição | M |
| #18 | Edição de perfil do usuário | Usuários não conseguem atualizar nome/avatar após onboarding | S–M |
| #20 | Gol contra | Estatísticas incorretas corroem credibilidade do ranking | M |
| — | Redesign da página de grupos (`/groups`) | Segunda tela que todo usuário vê; atualmente funcional mas plana | S |

---

## P3 — Apostas Futuras

| Issue | Feature | Por quê | Esforço |
|---|---|---|---|
| #16, #19 | Google OAuth | Reduz fricção no signup; schema já tem `googleSub` | L |
| #21 | Times fixos por grupo | Grupos recorrentes recriam o mesmo lineup todo jogo | L |
| — | QR Code de convite | Onboarding presencial; link de convite (P1) é pré-requisito | M |
| — | Bracket de torneio compartilhável (sem login) | O visual do bracket é o ativo mais forte do app | M–L |

---

## Issues descoped do MVP

| Issue | Motivo |
|---|---|
| #16 Google OAuth UI | Requer GCP externo; email/senha funciona |
| #17 Foto de perfil Google/Gravatar | Depende de #16 e storage |
| #19 Google OAuth callback | Mesmo motivo que #16 |
| #21 Times fixos | Migration de schema significativa; nenhum usuário pediu ainda |

> Issues #20 (gol contra) e #18 (edição de perfil) foram parcialmente implementadas. Permanecem no milestone como P2.

---

## Métricas de Sucesso

### MVP (primeiras 2 semanas)
- Pelo menos 1 grupo completa uma partida end-to-end em modo API real sem erros
- Pelo menos 1 torneio chega a um campeão sem intervenção manual
- Novos usuários que completam o onboarding (nome + posição definidos) > 60%
- Código de convite resulta em pelo menos 1 usuário externo entrando em um grupo

### Crescimento (mês 1)
- Grupos retornam para uma segunda sessão em até 7 dias
- Página de ranking é a mais visitada após a home do grupo
- Torneio é criado por pelo menos 1 grupo no primeiro mês

---

## Pontos Fortes do Produto (manter)

- Live match screen — melhor tela do app
- Ranking com pódio dourado e coroa no #1
- Bracket de torneio com conectores SVG
- Ficha de jogador com estética de card esportivo
- Tom de marca ("Abrindo a mesa", textura de campo)
- Tela de signup com hero panel contextual
