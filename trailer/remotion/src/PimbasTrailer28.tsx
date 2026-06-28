import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BridgeScene } from "./BridgeScene";
import { ClipScene } from "./ClipScene";
import { IntroScene } from "./IntroScene";
import { OutroScene } from "./OutroScene";

/**
 * Master de ~28s (840 frames @30fps). Cada Sequence é uma cena do storyboard
 * (ver trailer/../../.claude/plans — combinado do trailer). Ajuste os "from"/"durationInFrames"
 * aqui para reeditar o corte sem tocar nos clipes brutos.
 */
export function PimbasTrailer28() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={90}>
        <IntroScene />
      </Sequence>

      <Sequence from={90} durationInFrames={150}>
        <ClipScene clip="c1-live-scoring" caption="Placar ao vivo — um toque por gol" />
      </Sequence>

      <Sequence from={240} durationInFrames={60}>
        <ClipScene clip="c2-golden-goal" caption="Empatou? Gol de ouro." />
      </Sequence>

      <Sequence from={300} durationInFrames={150}>
        <ClipScene clip="c3-tournament-bracket" caption="Monta o mata-mata" />
      </Sequence>

      <Sequence from={450} durationInFrames={90}>
        <ClipScene clip="c4-tournament-champion" caption="Coroa o campeão" startFromSeconds={1} />
      </Sequence>

      <Sequence from={540} durationInFrames={60}>
        <ClipScene clip="c5-ranking-podium" caption="Ranking de cada dupla" />
      </Sequence>

      <Sequence from={600} durationInFrames={60}>
        <ClipScene clip="c6-player-profile" caption="Estatística de cada jogador" />
      </Sequence>

      <Sequence from={660} durationInFrames={90}>
        <ClipScene clip="c7-group-settings" caption="Sem planilha. Sem debate." />
      </Sequence>

      <Sequence from={750} durationInFrames={90}>
        <OutroScene />
      </Sequence>

      <Audio src={staticFile("audio/trilha.wav")} volume={0.55} />
      <Sequence from={92} durationInFrames={30}>
        <Audio src={staticFile("audio/goal.wav")} />
      </Sequence>
      <Sequence from={450} durationInFrames={45}>
        <Audio src={staticFile("audio/finish.wav")} />
      </Sequence>
      <Sequence from={0} durationInFrames={20}>
        <Audio src={staticFile("audio/whoosh.wav")} />
      </Sequence>
      <Sequence from={748} durationInFrames={20}>
        <Audio src={staticFile("audio/whoosh.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
}

/** Corte de 15s (450 frames @30fps) para WhatsApp/redes — reaproveita as mesmas cenas. */
export function PimbasTrailer15() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Sequence from={0} durationInFrames={45}>
        <IntroScene />
      </Sequence>

      <Sequence from={45} durationInFrames={150}>
        <ClipScene clip="c1-live-scoring" caption="Placar ao vivo — um toque por gol" />
      </Sequence>

      <Sequence from={195} durationInFrames={90}>
        <ClipScene clip="c4-tournament-champion" caption="Coroa o campeão" startFromSeconds={1} />
      </Sequence>

      <Sequence from={285} durationInFrames={90}>
        <BridgeScene text="Sem planilha. Sem debate." />
      </Sequence>

      <Sequence from={375} durationInFrames={75}>
        <OutroScene />
      </Sequence>

      <Audio src={staticFile("audio/trilha.wav")} volume={0.55} />
      <Sequence from={47} durationInFrames={30}>
        <Audio src={staticFile("audio/goal.wav")} />
      </Sequence>
      <Sequence from={195} durationInFrames={45}>
        <Audio src={staticFile("audio/finish.wav")} />
      </Sequence>
      <Sequence from={0} durationInFrames={20}>
        <Audio src={staticFile("audio/whoosh.wav")} />
      </Sequence>
    </AbsoluteFill>
  );
}
