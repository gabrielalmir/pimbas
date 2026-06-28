import { Composition } from "remotion";
import { PimbasTrailer15, PimbasTrailer28 } from "./PimbasTrailer28";
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from "./tokens";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="PimbasTrailer28"
        component={PimbasTrailer28}
        durationInFrames={840}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
      <Composition
        id="PimbasTrailer15"
        component={PimbasTrailer15}
        durationInFrames={450}
        fps={FPS}
        width={VIDEO_WIDTH}
        height={VIDEO_HEIGHT}
      />
    </>
  );
};
