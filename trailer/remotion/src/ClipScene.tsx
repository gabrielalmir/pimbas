import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { Caption } from "./Caption";

/** Embute um clipe real capturado via Playwright (trailer/raw -> public/clips). */
export function ClipScene({
  clip,
  caption,
  startFromSeconds = 0,
}: {
  clip: string;
  caption: string;
  startFromSeconds?: number;
}) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <OffthreadVideo
        src={staticFile(`clips/${clip}.webm`)}
        startFrom={Math.round(startFromSeconds * 30)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <Caption text={caption} />
    </AbsoluteFill>
  );
}
