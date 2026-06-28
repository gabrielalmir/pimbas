import { interpolate, useCurrentFrame } from "remotion";
import { fontUi } from "./fonts";
import { pmb } from "./tokens";

/** Legenda burn-in grande, legível com o app mudo (autoplay nas redes). */
export function Caption({ text, align = "bottom" }: { text: string; align?: "bottom" | "center" }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 999], [0, 1, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(frame, [0, 8], [16, 0], { extrapolateRight: "clamp" });

  return (
    <div
      style={{
        position: "absolute",
        left: 48,
        right: 48,
        bottom: align === "bottom" ? 140 : undefined,
        top: align === "center" ? "50%" : undefined,
        transform:
          align === "center"
            ? `translateY(calc(-50% + ${translateY}px))`
            : `translateY(${translateY}px)`,
        opacity,
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "inline-block",
          fontFamily: fontUi,
          fontWeight: 800,
          fontSize: 44,
          lineHeight: 1.15,
          color: pmb.white,
          textShadow: "0 2px 18px rgba(0,0,0,0.55)",
          padding: "10px 18px",
          borderRadius: 12,
          background: "rgba(9,41,31,0.45)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
