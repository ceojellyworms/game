export type SoundName = "fire" | "hit" | "kill" | "coin" | "death";

const SOUNDS: Record<SoundName, { from: number; to: number; duration: number; wave: OscillatorType }> = {
  fire: { from: 520, to: 300, duration: 0.055, wave: "square" },
  hit: { from: 190, to: 85, duration: 0.16, wave: "sawtooth" },
  kill: { from: 520, to: 960, duration: 0.12, wave: "triangle" },
  coin: { from: 780, to: 1260, duration: 0.1, wave: "sine" },
  death: { from: 270, to: 70, duration: 0.42, wave: "triangle" },
};

export class AudioManager {
  private context: AudioContext | null = null;

  unlock() {
    try {
      this.context ??= new AudioContext();
      if (this.context.state === "suspended") void this.context.resume();
    } catch (error) {
      console.warn("Web Audio is unavailable in this browser.", error);
    }
  }

  suspend() {
    if (this.context?.state === "running") void this.context.suspend();
  }

  resume() {
    if (this.context?.state === "suspended") void this.context.resume();
  }

  play(name: SoundName) {
    const context = this.context;
    if (!context || context.state !== "running") return;
    const sound = SOUNDS[name];
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound.wave;
    oscillator.frequency.setValueAtTime(sound.from, now);
    oscillator.frequency.exponentialRampToValueAtTime(sound.to, now + sound.duration);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + sound.duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + sound.duration + 0.015);
  }
}
