Você é um designer e arquiteto de software especialista em aplicações esportivas sociais.
Crie o design completo de uma aplicação chamada **Pimbas** — um app de gestão de partidas
e torneios de pimbolim (pebolim/foosball) para grupos de amigos.

### ASSETS

- docs/pimbas-design.pdf
- docs/pimbas-design.png

---

## CONTEXTO

Pimbas nasceu de um grupo de amigos que joga pimbolim no trabalho. O nome é gíria interna
do grupo para o esporte. O app deve ter personalidade descontraída e social, mas com
seriedade esportiva nas estatísticas e torneios. Por ora é um projeto pessoal/interno,
sem necessidade de monetização.

---

## USUÁRIOS E GRUPOS

- Usuários se cadastram individualmente e podem pertencer a múltiplos grupos
- Grupos têm acesso por convite (QR code, link compartilhável ou código numérico —
  implementar a forma mais simples e prática)
- Dentro de cada grupo existem membros comuns e pelo menos um administrador
- Qualquer membro pode criar torneios e partidas amistosas
- Usuários anônimos podem participar como administradores de grupo, mas sem geração
  de estatísticas pessoais
- Para gerar estatísticas individuais, o membro precisa estar cadastrado e vinculado ao grupo

---

## MECÂNICA DO JOGO

- Sempre há exatamente 2 posições por time: goleiro e atacante
- As partidas são sempre 2v2 (duplas)
- Cada gol marcado deve registrar: quem fez o gol (jogador) e qual posição estava jogando
- Duração padrão configurável: até X gols (padrão: 3) ou Y minutos (padrão: 3min)
- Em caso de empate no tempo, entra "gol de ouro" (próximo gol decide)

---

## MODO AMISTOSO

- Duplas se formam livremente a cada partida
- Jogadores se revezam livremente entre goleiro e atacante
- Sem fila de espera — entrada e saída livres
- Partidas são registradas no histórico e nas estatísticas, marcadas como "amistoso"
- Não há chaveamento nem eliminação

---

## MODO TORNEIO

### Formação de duplas
- Mínimo recomendado: 4 duplas (8 jogadores)
- Suporte a 8+ jogadores de forma dinâmica
- Formação das duplas pode ser:
  - **Aleatória**: sorteio automático pelo sistema
  - **Personalizada**: membros montam as duplas manualmente antes do torneio iniciar
- Uma vez iniciado o torneio, as duplas ficam fixas até o fim

### Chaveamento
- Formato: mata-mata simples (sem repescagem — quem perde é eliminado)
- Chaveamento gerado aleatoriamente pelo sistema
- Com número ímpar de duplas: bye automático (uma dupla avança sem jogar na rodada)
- Disputa de 3º lugar obrigatória antes da final
- Chaveamento visual estilo bracket esportivo

### Configurações do torneio (definidas antes de iniciar)
- Regras da partida (gols e/ou tempo limite) — podem ser bloqueadas pelo organizador
  para que não sejam alteradas mid-torneio
- Nome do torneio
- Modo de formação das duplas (aleatório ou personalizado)

---

## FICHA DO JOGADOR

Inspirada em cards de jogadores de futebol, combinando elementos de fantasia esportiva
com estatísticas reais de pimbolim.

### Informações pessoais (preenchidas pelo próprio usuário)
- Foto/avatar
- Apelido (nome principal no app)
- Número da camisa
- Posição favorita (goleiro / atacante / versátil)
- Nacionalidade (com bandeira)
- "Bio" curta ou frase de efeito

### Estatísticas (geradas automaticamente, separadas por grupo)
- Gols marcados (total, como goleiro, como atacante)
- Partidas jogadas / vitórias / derrotas / aproveitamento (%)
- Torneios disputados / vencidos
- Sequência atual de vitórias e maior sequência histórica
- Duplas mais frequentes e aproveitamento com cada parceiro

---

## ESTATÍSTICAS E HISTÓRICO

- Estatísticas são separadas por grupo (não globais)
- Histórico de partidas por grupo e por jogador
- Ranking dos jogadores dentro do grupo (leaderboard)
- Ranking de duplas dentro do grupo
- Partidas amistosas e de torneio são diferenciadas no histórico

---

## TEMPO REAL E NOTIFICAÇÕES

- Durante partidas e torneios, qualquer jogador pode acompanhar o placar ao vivo
  pelo próprio celular
- Também funciona em modo "tela única" (um celular exibindo para o grupo)
- Notificações push para:
  - Início de torneio
  - Sua dupla foi sorteada / próxima partida
  - Resultado de partidas
  - Fim do torneio com resultado final

---

## DESIGN E UX

- 100% responsivo, mobile-first (uso principal em smartphones durante as partidas)
- Personalidade: descontraída e social, mas com seriedade esportiva
- Identidade visual: criar uma identidade original para "Pimbas" — pode usar referências
  visuais de esportes, mas com toque informal e de grupo de amigos
- Interface de marcação de gol deve ser extremamente simples e rápida
  (poucos toques durante a partida)
- Bracket do torneio deve ser visualmente claro e atrativo

---

## ENTREGÁVEIS ESPERADOS

1. Arquitetura de telas (mapa de navegação)
2. Wireframes ou mockups das telas principais:
   - Onboarding / cadastro
   - Home do grupo
   - Tela de partida ao vivo (marcação de gol)
   - Bracket do torneio
   - Ficha do jogador
   - Ranking / leaderboard
3. Sugestão de identidade visual (paleta, tipografia, tom)
4. Sugestão de stack técnica para implementação mobile-first com suporte a real-time
   e push notifications
