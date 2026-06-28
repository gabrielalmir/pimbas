import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pmb } from "./tokens";

/** Reaproveita a metáfora visual de components/LoadingState.tsx: mesa de pebolim em felt verde com rods. */
export function RodsBackground() {
  const frame = useCurrentFrame();
  const ballX = 50 + Math.sin(frame / 18) * 22;

  return (
    <AbsoluteFill style={{ backgroundColor: pmb.felt }}>
      <AbsoluteFill
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "46%",
          height: 6,
          background: pmb.gold,
          opacity: 0.85,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "46%",
          left: `${ballX}%`,
          width: 26,
          height: 26,
          marginTop: -10,
          borderRadius: "50%",
          background: pmb.paperSoft,
          boxShadow: "0 6px 14px rgba(0,0,0,0.35)",
        }}
      />
    </AbsoluteFill>
  );
}
