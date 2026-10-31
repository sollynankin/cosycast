// Tiny synthesised sounds (WebAudio, no files). The context starts on the first click or key press.
export type Sfx = 'cast' | 'bite' | 'hook' | 'catch' | 'escape' | 'sell' | 'buy' | 'levelup' | 'rare';

export class Audio {
  private ctx: AudioContext | null = null;
  volume = 0.5;
  muted = false;

  /** Call from a user gesture (on Android that means a release or click, so it is called on those too). */
  unlock(): void {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private tone(type: OscillatorType, f0: number, f1: number, at: number, dur: number, gain: number): void {
    const c = this.ctx;
    if (!c || this.volume <= 0 || this.muted) return;
    const t = c.currentTime + at;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain * this.volume, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** A little ratchet click while the reel is winding in; the pitch climbs as the meter fills. */
  tick(progress: number): void {
    if (!this.ctx) return;
    const f = 300 + progress * 500;
    this.tone('square', f, f * 0.8, 0, 0.04, 0.07);
  }

  play(name: Sfx): void {
    if (!this.ctx) return;
    switch (name) {
      case 'cast':
        this.tone('sine', 600, 180, 0, 0.3, 0.25);
        this.tone('triangle', 200, 90, 0.18, 0.18, 0.2);
        break;
      case 'bite':
        this.tone('square', 880, 880, 0, 0.09, 0.14);
        this.tone('square', 1180, 1180, 0.11, 0.12, 0.14);
        break;
      case 'catch':
        this.tone('sine', 523, 523, 0, 0.14, 0.25);
        this.tone('sine', 659, 659, 0.12, 0.14, 0.25);
        this.tone('sine', 784, 784, 0.24, 0.3, 0.25);
        break;
      case 'rare':
        for (let k = 0; k < 6; k++) this.tone('triangle', 523 * 1.26 ** k, 523 * 1.26 ** k, k * 0.09, 0.22, 0.22);
        break;
      case 'hook':
        this.tone('triangle', 700, 1400, 0, 0.12, 0.22);
        break;
      case 'escape':
        this.tone('sawtooth', 400, 90, 0, 0.35, 0.16);
        break;
      case 'sell':
        this.tone('square', 1568, 1568, 0, 0.07, 0.12);
        this.tone('square', 2093, 2093, 0.07, 0.16, 0.12);
        break;
      case 'buy':
        this.tone('triangle', 440, 660, 0, 0.18, 0.2);
        break;
      case 'levelup':
        for (const [k, f] of [523, 659, 784, 1047].entries()) this.tone('triangle', f, f, k * 0.11, 0.3, 0.25);
        break;
    }
  }
}
