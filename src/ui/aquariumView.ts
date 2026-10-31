// The aquarium picture: a lit tank with decor and your kept fish swimming about. One instance lives for the whole
// session; its canvas is re-attached whenever the panel re-renders, and it animates only while attached.
import { getFish } from '../data/fish';
import type { GameState } from '../sim/state';
import { fishCanvas } from './icons';

const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Swimmer {
  x: number;
  y: number;
  vx: number;
  phase: number;
}

export class AquariumView {
  readonly canvas = document.createElement('canvas');
  private readonly g = this.canvas.getContext('2d')!;
  private swimmers = new Map<number, Swimmer>();
  private fish: GameState['bucket'] = [];
  private decor: string[] = [];
  private t = 0;
  private last = 0;
  private running = false;

  constructor() {
    this.canvas.className = 'aquarium-canvas';
    this.canvas.width = 720;
    this.canvas.height = 360;
  }

  set(state: GameState, tank: number): void {
    this.fish = state.tanks[tank]?.fish ?? [];
    this.decor = state.decor;
    const live = new Set(this.fish.map((f) => f.uid));
    for (const uid of this.swimmers.keys()) if (!live.has(uid)) this.swimmers.delete(uid);
    for (const f of this.fish) {
      if (!this.swimmers.has(f.uid)) this.swimmers.set(f.uid, { x: 60 + rnd(f.uid) * 600, y: 50 + rnd(f.uid + 7) * 220, vx: (rnd(f.uid + 3) > 0.5 ? 1 : -1) * (14 + rnd(f.uid + 5) * 26), phase: rnd(f.uid + 11) * 6 });
    }
    if (!this.running) {
      this.running = true;
      this.last = performance.now();
      requestAnimationFrame((n) => this.frame(n));
    }
  }

  private frame(now: number): void {
    if (!this.canvas.isConnected) {
      this.running = false;
      return;
    }
    requestAnimationFrame((n) => this.frame(n));
    // 30 frames a second is plenty for a fish tank and leaves the phone's time for scrolling the panel
    if (now - this.last < 30) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.t += dt;
    this.draw(dt);
  }

  private draw(dt: number): void {
    const { g } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const water = g.createLinearGradient(0, 0, 0, H);
    water.addColorStop(0, '#7ae8f0');
    water.addColorStop(1, '#1a6a9a');
    g.fillStyle = water;
    g.fillRect(0, 0, W, H);
    // light rays
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let k = 0; k < 5; k++) {
      const x = k * 160 + Math.sin(this.t * 0.4 + k) * 30;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x + 60, 0);
      g.lineTo(x + 20, H);
      g.lineTo(x - 70, H);
      g.fill();
    }
    // sand
    g.fillStyle = '#f0d8a0';
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 12) g.lineTo(x, H - 34 + Math.sin(x * 0.02) * 6);
    g.lineTo(W, H);
    g.fill();
    this.drawDecor(W, H);
    for (const f of this.fish) {
      const s = this.swimmers.get(f.uid);
      if (!s) continue;
      s.phase += dt * 3;
      s.x += s.vx * dt;
      s.y += Math.sin(s.phase * 0.7) * 10 * dt;
      if (s.x < 40) s.vx = Math.abs(s.vx);
      if (s.x > W - 40) s.vx = -Math.abs(s.vx);
      s.y = Math.min(H - 80, Math.max(36, s.y));
      const def = getFish(f.species);
      const frac = (f.cm - def.minCm) / (def.maxCm - def.minCm);
      const size = 46 + frac * 40 + (f.q === 2 ? 8 : 0);
      g.save();
      g.translate(s.x, s.y);
      g.scale(s.vx > 0 ? -1 : 1, 1);
      g.rotate(Math.sin(s.phase) * 0.06);
      g.drawImage(fishCanvas(f.species), -size / 2, -size / 2, size, size);
      g.restore();
    }
    // bubbles
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 1.5;
    for (let k = 0; k < 14; k++) {
      const x = rnd(k) * W;
      const y = H - ((rnd(k + 20) * H + this.t * (24 + rnd(k + 3) * 24)) % H);
      g.beginPath();
      g.arc(x + Math.sin(this.t + k) * 4, y, 2 + rnd(k + 7) * 3, 0, Math.PI * 2);
      g.stroke();
    }
  }

  private drawDecor(W: number, H: number): void {
    const { g } = this;
    const has = (id: string) => this.decor.includes(id);
    if (has('seaweed')) {
      for (let k = 0; k < 7; k++) {
        const x = 40 + k * 46 + (k > 3 ? 380 : 0);
        g.strokeStyle = k % 2 ? '#2a9a4a' : '#48c85a';
        g.lineWidth = 6;
        g.beginPath();
        g.moveTo(x, H - 26);
        g.quadraticCurveTo(x + Math.sin(this.t * 1.2 + k) * 14, H - 70, x + Math.sin(this.t * 1.2 + k + 1) * 20, H - 110 - (k % 3) * 16);
        g.stroke();
      }
    }
    if (has('castle')) {
      g.fillStyle = '#c8b8d8';
      g.fillRect(W * 0.62, H - 112, 90, 80);
      for (const dx of [0, 30, 60]) g.fillRect(W * 0.62 + dx, H - 126, 30, 16);
      g.fillStyle = '#4a3a5a';
      g.beginPath();
      g.arc(W * 0.62 + 45, H - 32, 18, Math.PI, 0);
      g.fill();
    }
    if (has('treasure')) {
      g.fillStyle = '#a8622a';
      g.fillRect(W * 0.36, H - 62, 60, 34);
      g.fillStyle = '#ffd02a';
      g.fillRect(W * 0.36, H - 48, 60, 6);
      g.beginPath();
      g.arc(W * 0.36 + 30, H - 62, 30, Math.PI, 0);
      g.fillStyle = '#c8803a';
      g.fill();
    }
    if (has('coral')) {
      const cols = ['#ff6a8a', '#ffb02a', '#a878f8'];
      for (let k = 0; k < 6; k++) {
        g.fillStyle = cols[k % 3];
        g.beginPath();
        g.ellipse(W * 0.18 + k * 24, H - 50 - (k % 2) * 10, 11, 30 + (k % 3) * 10, (k - 3) * 0.12, 0, Math.PI * 2);
        g.fill();
      }
    }
    if (has('lamp')) {
      const glow = g.createRadialGradient(W * 0.9, 70, 4, W * 0.9, 70, 120);
      glow.addColorStop(0, 'rgba(255,240,160,0.8)');
      glow.addColorStop(1, 'rgba(255,240,160,0)');
      g.fillStyle = glow;
      g.fillRect(W * 0.9 - 130, 0, 260, 200);
      g.fillStyle = '#ffe890';
      g.beginPath();
      g.arc(W * 0.9, 70, 12, 0, Math.PI * 2);
      g.fill();
    }
    if (has('bubbles')) {
      g.fillStyle = 'rgba(255,255,255,0.7)';
      for (let k = 0; k < 10; k++) {
        const y = H - ((this.t * 60 + k * 36) % H);
        g.beginPath();
        g.arc(W * 0.5 + Math.sin(this.t * 2 + k) * 8, y, 3 + (k % 3), 0, Math.PI * 2);
        g.fill();
      }
    }
  }
}
