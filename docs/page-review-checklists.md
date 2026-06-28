# Checklists de revisão de páginas

Use estes checklists antes de aprovar mudanças visuais ou funcionais nas páginas do app.

## Checklist geral

- [ ] A página preserva o fluxo de negócio atual.
- [ ] A página funciona em mobile, tablet e desktop.
- [ ] Textos estão em português correto, sem mojibake.
- [ ] Estados de carregamento, vazio e erro são compreensíveis.
- [ ] Ações principais usam componentes do design system.
- [ ] Botões, links e inputs têm nome acessível.
- [ ] Conteúdo longo não quebra o layout.
- [ ] Dados sensíveis não são exibidos nem logados.
- [ ] A página não introduz alteração de contrato de API.
- [ ] Build e verificação dos arquivos tocados passam.

## Grupos

- [ ] Lista de grupos mostra nome, descrição e total de membros.
- [ ] Criar grupo bloqueia envio sem nome.
- [ ] Entrar por código bloqueia envio sem código.
- [ ] Estado vazio orienta a próxima ação.
- [ ] Reset de dados de exemplo não aparece como ação principal.

## Início do grupo

- [ ] Cabeçalho identifica grupo, membros e papel do jogador.
- [ ] Partida ao vivo aparece em destaque quando existir.
- [ ] Ações "Amistoso" e "Torneio" são fáceis de tocar no mobile.
- [ ] Ranking e histórico recentes apontam para páginas completas.
- [ ] Ausência de partida ao vivo tem mensagem neutra.

## Perfil do jogador

- [ ] A página tem sidebar com identidade, pontuação e estatísticas rápidas.
- [ ] Conteúdo principal mostra estatísticas, duplas frequentes e histórico recente.
- [ ] Avatar, camisa, posição e nacionalidade continuam visíveis no mobile.
- [ ] Histórico recente mostra placar, tipo e data.
- [ ] Estado sem jogador encontrado é claro.

## Partida ao vivo

- [ ] A página tem sidebar com cronômetro, regra, status e resumo.
- [ ] Ações de pausar, reiniciar, marcar gol, desfazer e encerrar continuam disponíveis.
- [ ] Placar e times são legíveis durante a partida.
- [ ] Estado de gol de ouro é explícito.
- [ ] Gols recentes indicam jogador, posição, horário e ação de desfazer quando aplicável.

## Histórico

- [ ] Partidas são exibidas da mais recente para a mais antiga.
- [ ] Cada linha mostra tipo, data, times, placar e vencedor.
- [ ] Estado vazio explica que não há partidas finalizadas.
- [ ] Link de retorno leva para o grupo correto.
- [ ] Layout não depende de largura desktop para ser compreensível.

## Ranking

- [ ] Alternância entre jogadores e duplas mantém estado visual claro.
- [ ] Pódio não quebra quando há menos de três jogadores.
- [ ] Lista mostra pontos e métrica de aproveitamento.
- [ ] Links de jogador levam ao perfil correto.

## Torneios

- [ ] Seleção exige número par de jogadores no modo aleatório.
- [ ] Modo manual bloqueia torneio com jogadores sem dupla.
- [ ] Regras de gols/minutos são visíveis antes de gerar chaveamento.
- [ ] Torneios em andamento apontam para o bracket correto.

## Bracket do torneio

- [ ] Rodadas e final são identificáveis.
- [ ] Partidas prontas exibem ação para iniciar.
- [ ] Partidas em andamento exibem ação para continuar.
- [ ] Campeão e disputa de terceiro lugar aparecem quando existirem.

## Login e onboarding

- [ ] Login mantém o comportamento demo atual.
- [ ] Onboarding bloqueia envio sem nome e iniciais.
- [ ] Prévia da ficha reflete os dados digitados.
- [ ] Campos numéricos têm limites mínimos coerentes.
