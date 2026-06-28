# Redesign visual das telas (processo e progresso)

Registro do processo usado para revisar e redesenhar telas do frontend (`app/**`) sem alterar regras de negócio, e o backlog priorizado resultante. Complementa `docs/page-review-checklists.md` (o que validar) e `docs/pimbas-ui-system-design.md` (tokens/sistema), documentando *como* o trabalho foi conduzido com o time de agentes (`CLAUDE.md` + `.claude/agents/*.md`).

## Por que

Depois do redesign do Bracket do Torneio (ver seção "Bracket do torneio" abaixo), ficou claro que outras telas do app ainda pareciam genéricas/templadas em comparação com as mais fortes (`/login`, `/matches/[matchId]/live`, `/players/[playerId]`, `/profile-onboarding`, `/groups/[groupId]/ranking`). Em vez de redesenhar tela por tela sem critério, formalizamos um processo curto e repetível.

## Processo

1. **Hire**: criamos o agente `frontend-design-specialist` (`.claude/agents/frontend-design-specialist.md`), focado especificamente em craft visual sobre o stack real (Next.js/React/Tailwind v4), reaproveitando os tokens `--pmb-*` e os componentes de `PimbasLayout`/`components/ui` já existentes — para não recair em defaults genéricos de IA (cartão cinza com sombra, grid de botões repetido, etc.). Ele complementa, sem substituir, `frontend-specialist` (corretude funcional) e `design-specialist` (UX/acessibilidade geral).
2. **Auditoria**: o agente revisou (somente leitura) todas as telas listadas em `app/**`, dando um veredito curto por tela (distinta/on-brand vs. genérica) e checando gaps estruturais (ex.: layout sem `AppShell`/sidebar).
3. **Priorização**: as telas genéricas foram ranqueadas e validadas com o usuário antes de qualquer implementação.
4. **Implementação tela a tela**: para cada item do backlog — redesenho focado em apresentação (sem mudar dados/lógica/contratos), reaproveitando componentes existentes (`PimbasAvatar`, `SectionCard`, `Badge`, etc.) em vez de criar padrões novos.
5. **Validação**: `bunx biome check --write` nos arquivos tocados, `bun run --filter=@pimbas/frontend build` (cobre typecheck), e checagem visual via preview (screenshot + `preview_eval` para inspecionar layout real, já que o screenshot do preview pode ficar visualmente distorcido em alguns tamanhos de viewport — confirmar sempre com `getBoundingClientRect`/computed styles quando o screenshot parecer estranho).

## Achados da auditoria (resumo)

| Tela | Veredito |
|---|---|
| `/` | Splash trivial, não vale esforço de design. |
| `/login` | Forte, já on-brand. |
| `/groups` | Funcional, mas lista e formulários flat, sem momento de assinatura. |
| `/groups/[groupId]` (home) | Boa, usa bem field-rods/ações rápidas. |
| `/groups/[groupId]/friendly/new` | Genérica; seletor de jogador em botões planos, sem cor Verde/Laranja já usada em outras telas. |
| `/groups/[groupId]/history` | Sólida, consistente com o padrão lista + resumo. |
| `/groups/[groupId]/ranking` | Forte, pódio com Crown e tinta dourada no #1. |
| `/groups/[groupId]/settings` | Era a mais fraca — stub de dois inputs. **Redesenhada (ver abaixo).** |
| `/groups/[groupId]/tournaments` | Form denso, grid de botões repetido 3x; contraste feio com o bracket já redesenhado. **Próxima da fila.** |
| `/matches/[matchId]/live` | A tela mais distinta do app; nenhuma ação necessária. |
| `/players/[playerId]` | Forte, "card de jogador" com dourado. |
| `/profile-onboarding` | Forte, prévia ao vivo do card. |
| `/not-found` | Aceitável, baixa prioridade. |

Nenhuma tela tinha gap estrutural de `AppShell`/sidebar **exceto** o Bracket do torneio (corrigido antes desta auditoria — ver abaixo).

## Backlog priorizado

1. ~~`/groups/[groupId]/settings`~~ — feito.
2. ~~`/groups/[groupId]/tournaments`~~ — feito.
3. `/groups/[groupId]/friendly/new` — próxima da fila.
4. `/groups`
5. `/not-found`

## Telas já redesenhadas

### Bracket do torneio (`app/tournaments/[tournamentId]/page.tsx`)

- Gap estrutural: não havia `app/tournaments/layout.tsx`, então a página não tinha a sidebar/bottom-nav do `AppShell` — corrigido criando esse layout (mesmo padrão de `groups/layout.tsx`, `players/layout.tsx`, `matches/layout.tsx`).
- Redesenho visual: chaveamento real com conectores SVG entre rodadas (dourado = decidido, neutro = pendente), cartões de partida com avatares das duplas e coroa no vencedor, banner de campeão estilo pódio, nó de troféu ao final da chave. Disputa de 3º lugar reaproveita o mesmo card.
- Dados/lógica: inalterados.

### Configurações do grupo (`app/groups/[groupId]/settings/page.tsx`)

- Antes: formulário de nome/descrição isolado, sem avatar, sem exibir o código de convite (campo `inviteCode` já existia nos dados mas não aparecia em nenhuma tela do app) e sem lista de membros.
- Depois: avatar do grupo ao lado do formulário; cartão "Convidar jogadores" exibindo o código com botão de copiar; lista de membros com badge de Admin (coroa dourada) reaproveitando `usePlayers()` já usado em outras telas.
- Dados/lógica: inalterados (mesmo fluxo de salvar; nenhuma mutação nova como remover membro foi adicionada, pois isso exigiria lógica de negócio nova fora do escopo de um redesenho visual).

### Criação de torneio (`app/groups/[groupId]/tournaments/page.tsx`)

- Antes: três grids de botões quase idênticos (seleção de jogadores, escolha de goleiro/atacante, lista de torneios em andamento), sem codificação de cor por papel e com status de torneio exibido em inglês (`draft`/`live`/`finished`).
- Depois: seleção de jogador com anel dourado + ícone de check; escolha de goleiro/atacante codificada por cor (feltro/`Shield` para goleiro, argila/`Zap` para atacante) — a mesma dupla de cores já usada no resto do app; lista de duplas formadas com avatares dos dois jogadores; cartões de "Em andamento" com selo circular (dourado quando finalizado, contorno pontilhado quando não) e status traduzido para PT-BR.
- Dados/lógica: inalterados — apenas validado manualmente via `preview_eval` que `pickForManualPair`/`addManualPair`/`removeManualPair` continuam funcionando (uma rodada inicial de testes deu falso negativo por causa de cliques disparados em rápida sucessão dentro do mesmo `preview_eval`, que colidem com o batching de estado do React; ao espaçar os cliques em chamadas separadas, o fluxo completo de montar uma dupla manual funcionou corretamente).

## Como continuar

Para a próxima tela do backlog: repetir os passos 4–5 do processo acima. Não é necessário repetir a auditoria (passos 1–3) a menos que novas telas sejam adicionadas ao app.
