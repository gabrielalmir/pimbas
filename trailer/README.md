# Trailer do Pimbas — pipeline 100% automatizado

Gera um trailer vertical de **15s** (9:16) do Pimbas sem operador humano: captura o app
no **layout mobile** (nav inferior, 720×1280) via Playwright e monta o MP4 final com Remotion
(1080×1920).

Saída: `trailer/out/pimbas-trailer-15s.mp4` (WhatsApp/redes).

O `trailer:capture` grava só as cenas usadas no corte de 15s: **c1** (placar ao vivo) e
**c4** (campeão do torneio). As outras specs em `trailer/scenes/` ficam para cortes futuros.

## Pré-requisito: Node.js precisa estar instalado

O Playwright usa `node:worker_threads` internamente para isolar os workers de teste, e o
**runtime Bun ainda não implementa totalmente essa API no Windows** (opções como `stdout`,
`stderr` e `resourceLimits` do `Worker` — ver
[oven-sh/bun#23944](https://github.com/oven-sh/bun/issues/23944)). O sintoma é o
`globalSetup` do Playwright nunca rodar e o processo morrer com `exit code 1` sem nenhuma
mensagem útil (só um `BuildMessage {}` solto no log) — isso acontece com **qualquer** config
do Playwright neste repo quando ele é executado inteiramente sob Bun (confirmado: o mesmo
sintoma ocorre no `bun run test:e2e` nativo do projeto, sem relação com o trailer).

Por isso `trailer:capture` chama `npx playwright` em vez de `playwright` puro — `npx` roda
sob Node.js, contornando a limitação do Bun nesse processo específico. Você só precisa ter
o Node.js instalado e disponível no `PATH` (o resto do projeto continua usando Bun
normalmente). Depois de instalar o Node, confirme com `npx playwright --version`.

## Pipeline, passo a passo

```bash
# 1. Captura c1 + c4 em mobile 9:16 (sobe o Next.js, faz seed, grava 720×1280)
bun run trailer:capture

# 2. Gera os SFX (mesmas frequências de lib/matchSounds.ts) e a trilha instrumental
bun run trailer:sfx
bun run trailer:music

# 3. Copia os clipes brutos para o public/ do projeto Remotion
bun run trailer:copy-clips

# 4. Renderiza o MP4 de 15s (instala as deps do Remotion isoladamente na 1ª vez)
bun run trailer:render

# ou tudo de uma vez:
bun run trailer:build
```

Pré-visualizar/editar o corte interativamente:

```bash
cd trailer/remotion && bun install && bun run studio
```

## Estrutura

- `trailer/playwright.trailer.config.ts` — captura mobile 9:16 (720×1280, iPhone UA,
  vídeo sempre ligado). Reaproveita o `webServer` e o `globalSetup`
  (seed do banco) já usados pelos testes e2e do app.
- `trailer/scenes/*.spec.ts` — uma cena por arquivo, reaproveitando os helpers e
  fixtures de `e2e/helpers/*` e `e2e/fixtures/seed.ts` (login `ze.trovao@pimbas.local`,
  grupo "Pimbas do Trampo", jogadores `mg/zt/ru/bs`). Cada teste fecha sua página com
  `trailer/helpers/clip.ts#finalizeClip`, que salva o `.webm` gravado pelo Playwright
  em `trailer/raw/<nome-da-cena>.webm`.
- `trailer/scripts/generate-sfx.mjs` — sintetiza os SFX de gol/início/fim **com as
  mesmas frequências** que `lib/matchSounds.ts` toca no app (Web Audio não grava
  áudio em testes headless, então o som é recriado aqui, fielmente).
- `trailer/scripts/generate-music.mjs` — trilha instrumental percussiva gerada por
  síntese (bumbo/clap/baixo programados), 100% original — sem depender de download
  de biblioteca de terceiros. Para usar uma faixa licenciada de verdade, baixe o
  arquivo de uma biblioteca royalty-free (YouTube Audio Library, Uppbeat etc.) e
  salve como `trailer/remotion/public/audio/trilha.wav`, sobrescrevendo a gerada.
- `trailer/remotion/` — projeto Remotion isolado (`package.json` próprio, não entra
  nas dependências do app). `src/PimbasTrailer28.tsx` define `PimbasTrailer15` (15s,
  usado no render); `PimbasTrailer28` permanece só para preview no Studio; `IntroScene`/
  `OutroScene`/`BridgeScene` são os
  bumpers de motion graphics (cores `--pmb-*` literais em `src/tokens.ts`, fontes
  Anton/Archivo via `@remotion/google-fonts`); `src/ClipScene.tsx` embute cada clipe
  real com legenda burn-in.

## Cenas capturadas

| Clipe | Spec | Tela real |
|---|---|---|
| `c1-live-scoring` | `c1-c2-live-match.spec.ts` | `/matches/[id]/live` — gols de um toque, timer correndo |
| `c2-golden-goal` | `c1-c2-live-match.spec.ts` | `/matches/[id]/live` — empate ativa "gol de ouro" |
| `c3-tournament-bracket` | `c3-c4-tournament.spec.ts` | `/tournaments/[id]` — bracket recém-criado |
| `c4-tournament-champion` | `c3-c4-tournament.spec.ts` | `/tournaments/[id]` — banner de campeão |
| `c5-ranking-podium` | `c5-c6-ranking-player.spec.ts` | `/groups/[id]/ranking` — pódio top 3 |
| `c6-player-profile` | `c5-c6-ranking-player.spec.ts` | `/players/[id]` — card de stats |
| `c7-group-settings` | `c7-group-settings.spec.ts` | `/groups/[id]/settings` — código de convite |

Nenhum ajuste de seed foi necessário: o seed padrão (`prisma/seed.ts`) já tem os 4
jogadores e uma partida finalizada suficientes para popular ranking, e o torneio
mínimo (4 jogadores = 2 duplas) nasce direto na final — o que já é suficiente para
mostrar o troféu e o banner de campeão. Como só há 4 jogadores no seed, o bracket
da cena `c3` não tem múltiplas rodadas para "rolar" — é uma simplificação aceita
em troca de não tocar nos dados de seed; se quiser um bracket com 2+ rodadas,
adicione mais jogadores ao seed antes de gravar.

## Reproduzir do zero

```bash
bun run trailer:build
```

Isso sobe o app, popula o banco, grava **c1** e **c4** em mobile 9:16, gera os áudios
e renderiza `trailer/out/pimbas-trailer-15s.mp4` — sem intervenção manual de gravação/edição.
