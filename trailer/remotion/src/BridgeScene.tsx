import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { fontDisplay } from "./fonts";
import { RodsBackground } from "./RodsBackground";
import { pmb } from "./tokens";

/** Cartão de transição em motion puro, usado entre clipes no corte de 15s. */
export function BridgeScene({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <RodsBackground />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 56 }}>
        <span
          style={{
            fontFamily: fontDisplay,
            fontSize: 52,
            lineHeight: 1.2,
            textAlign: "center",
            color: pmb.paperSoft,
            opacity,
            textTransform: "uppercase",
          }}
        >
          {text}
        </span>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
