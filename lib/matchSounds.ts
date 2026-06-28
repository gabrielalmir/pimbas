type MatchSound = "start" | "goal" | "finish";

type ToneStep = {
  frequency: number;
  durationMs: number;
  type?: OscillatorType;
};

const audioContextState: { current?: AudioContext } = {};

function getAudioContext() {
  if (typeof window === "undefined") return undefined;
  const AudioContextConstructor = window.AudioContext;
  if (!AudioContextConstructor) return undefined;
  audioContextState.current ??= new AudioContextConstructor();
  return audioContextState.current;
}

function playToneSequence(frequencies: number[], durationMs: number, volume: number) {
  const steps = frequencies.map<ToneStep>((frequency, index) => ({
    frequency,
    durationMs,
    type: index % 2 === 0 ? "square" : "triangle",
  }));

  playToneSteps(steps, volume);
}

function playToneSteps(steps: ToneStep[], volume: number) {
  const context = getAudioContext();
  if (!context) return;

  if (context.state === "suspended") {
    void context.resume();
  }

  let startAt = context.currentTime;

  steps.forEach(({ frequency, durationMs, type = "square" }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const stepSeconds = durationMs / 1000;
    const stopAt = startAt + stepSeconds;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.015);
    gain.gain.setValueAtTime(volume, Math.max(startAt + 0.02, stopAt - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(startAt);
    oscillator.stop(stopAt);

    startAt = stopAt;
  });
}

export function unlockMatchSounds() {
  const context = getAudioContext();
  if (context?.state === "suspended") {
    void context.resume();
  }
}

export function playMatchSound(sound: MatchSound) {
  if (sound === "finish") {
    playToneSteps(
      [
        { frequency: 2550, durationMs: 650, type: "square" },
        { frequency: 0.0001, durationMs: 120, type: "sine" },
        { frequency: 2550, durationMs: 650, type: "square" },
      ],
      0.45,
    );
    return;
  }

  const sounds: Record<
    Exclude<MatchSound, "finish">,
    { frequencies: number[]; durationMs: number; volume: number }
  > = {
    start: { frequencies: [440, 660, 880], durationMs: 120, volume: 0.16 },
    goal: {
      frequencies: [523.25, 659.25, 783.99, 1046.5],
      durationMs: 95,
      volume: 0.2,
    },
  };

  const { frequencies, durationMs, volume } = sounds[sound];
  playToneSequence(frequencies, durationMs, volume);
}
