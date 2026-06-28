import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fontDisplay, fontUi } from "./fonts";
import { RodsBackground } from "./RodsBackground";
import { pmb } from "./tokens";

export function OutroScene() {
  const frame = useCurrentFrame();
  const taglineOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateRight: "clamp" });
  const ctaOpacity = interpolate(frame, [16, 32], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <RodsBackground />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 18,
          padding: 48,
          textAlign: "center",
        }}
      >
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 56,
            letterSpacing: 2,
            color: pmb.gold,
            opacity: taglineOpacity,
            textTransform: "uppercase",
            lineHeight: 1.1,
          }}
        >
          Mesa aberta.
          <br />
          Placar pronto.
        </span>
        <span
          style={{
            fontFamily: fontUi,
            fontSize: 30,
            fontWeight: 700,
            color: pmb.paperSoft,
            opacity: ctaOpacity,
          }}
        >
          Chama a galera no Pimbas
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
