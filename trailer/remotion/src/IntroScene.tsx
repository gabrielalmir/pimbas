import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { Caption } from "./Caption";
import { fontDisplay } from "./fonts";
import { RodsBackground } from "./RodsBackground";
import { pmb } from "./tokens";

export function IntroScene() {
  const frame = useCurrentFrame();
  const logoScale = interpolate(frame, [0, 18], [0.6, 1], { extrapolateRight: "clamp" });
  const logoOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <RodsBackground />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 120,
            letterSpacing: 4,
            color: pmb.paperSoft,
            transform: `scale(${logoScale})`,
            opacity: logoOpacity,
            textShadow: `0 8px 0 ${pmb.feltDeep}`,
          }}
        >
          PIMBAS
        </span>
      </AbsoluteFill>
      <Caption text="Fim da rodada. Quem ganhou mesmo?" />
    </AbsoluteFill>
  );
}
