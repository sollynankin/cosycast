// The picture: a side view of a fishing spot. Sky and sun by time of day, weather, scenery by place, water with
// fish shadows, a pier or boat with the angler, and the line down to the hook. Reads state only.
import { getLocation } from '../data/locations';
import { RODS } from '../data/gear';
import { DAWN_AT, DAY_AT, DUSK_AT, NIGHT_AT } from '../data/balance';
import type { GameState } from '../sim/state';
import { fishCanvas } from './icons';

/** 0 night … 1 full daylight, easing through dawn and dusk. */
export function daylight(minute: number): number {
  if (minute < DAWN_AT || minute >= NIGHT_AT) return 0;
  if (minute < DAY_AT) return (minute - DAWN_AT) / (DAY_AT - DAWN_AT);
  if (minute < DUSK_AT) return 1;
  return 1 - (minute - DUSK_AT) / (NIGHT_AT - DUSK_AT);
}

function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  return `rgb(${Math.round(r1 + (r2 - r1) * t)},${Math.round(g1 + (g2 - g1) * t)},${Math.round(b1 + (b2 - b1) * t)})`;
}

const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Shadow {
  x: number;
  depth: number;
  dir: 1 | -1;
  speed: number;
  size: number;
}

interface Ring {
  x: number;
  y: number;
  age: number;
}

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class Scene {
  private readonly g: CanvasRenderingContext2D;
  private w = 0;
  private h = 0;
  private t = 0;
  private readonly shadows: Shadow[] = [];
  private rings: Ring[] = [];
  private drops: Drop[] = [];
  private lastPhase: string = '';
  /** the hooked fish's depth and side-to-side drift, for the visible struggle */
  private hookX = 0.62;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.g = canvas.getContext('2d')!;
    for (let k = 0; k < 9; k++) this.shadows.push({ x: rnd(k) * 1.4 - 0.2, depth: 0.2 + rnd(k + 9) * 0.65, dir: rnd(k + 3) > 0.5 ? 1 : -1, speed: 0.03 + rnd(k + 5) * 0.05, size: 0.6 + rnd(k + 7) * 0.9 });
    this.resize();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = this.canvas.clientWidth || window.innerWidth;
    this.h = this.canvas.clientHeight || window.innerHeight;
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /** a burst of water droplets at the surface (bite, landing) */
  splash(strength = 1): void {
    const x = this.w * this.hookX;
    const y = this.h * 0.4;
    for (let k = 0; k < 14 * strength; k++) this.drops.push({ x, y, vx: (rnd(k + this.t) - 0.5) * 200, vy: -120 - rnd(k + 1 + this.t) * 200, life: 0.9 });
    this.rings.push({ x, y, age: 0 });
  }

  draw(state: GameState, dt: number, reelPower = 0): void {
    this.t += dt;
    const { g, w, h } = this;
    const loc = getLocation(state.location);
    const light = daylight(state.minute);
    const horizon = h * 0.4;
    const day = state.minute;

    // ---- sky
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, mix(loc.theme.night[0], loc.theme.sky[0], light));
    sky.addColorStop(1, mix(loc.theme.night[1], loc.theme.sky[1], light));
    g.fillStyle = sky;
    g.fillRect(0, 0, w, horizon + 2);
    // warm glow near sunrise and sunset
    const warm = Math.max(0, 1 - Math.abs(light * 2 - 1) * 2.2) * (light > 0 && light < 1 ? 1 : 0);
    if (warm > 0) {
      const glow = g.createLinearGradient(0, horizon * 0.3, 0, horizon);
      glow.addColorStop(0, 'rgba(255,150,90,0)');
      glow.addColorStop(1, `rgba(255,150,90,${0.55 * warm})`);
      g.fillStyle = glow;
      g.fillRect(0, 0, w, horizon + 2);
    }
    this.drawStars(light, horizon, loc.theme.scenery === 'stars');
    this.drawSunMoon(day, light, horizon);
    this.drawClouds(state, light, horizon);
    this.drawScenery(loc.theme.scenery, light, horizon);

    // ---- water
    const dim = 0.35 + 0.65 * light;
    const water = g.createLinearGradient(0, horizon, 0, h);
    water.addColorStop(0, mix('#04101c', loc.theme.water[0], dim));
    water.addColorStop(1, mix('#02060e', loc.theme.water[1], dim));
    g.fillStyle = water;
    g.fillRect(0, horizon, w, h - horizon);
    this.drawSeabed(loc.theme.scenery, loc.theme.floor, dim);
    this.drawShadows(state, dt, horizon, dim);
    this.drawSurface(light, horizon);

    // ---- angler, line and hook
    this.drawAngler(state, loc.theme.scenery, horizon, reelPower);

    // ---- weather over everything
    this.drawWeather(state, horizon);
    // night tint on the whole picture
    if (light < 1) {
      g.fillStyle = `rgba(8,12,50,${0.28 * (1 - light)})`;
      g.fillRect(0, 0, w, h);
    }
  }

  private drawStars(light: number, horizon: number, bright: boolean): void {
    const a = (1 - light) * (bright ? 1 : 0.9);
    if (a <= 0.02) return;
    const { g, w } = this;
    for (let k = 0; k < 70; k++) {
      const tw = 0.5 + 0.5 * Math.sin(this.t * (1 + rnd(k) * 2) + k);
      g.fillStyle = `rgba(255,255,240,${a * (0.35 + 0.65 * tw)})`;
      const r = 0.8 + rnd(k + 20) * 1.4;
      g.fillRect(rnd(k + 40) * w, rnd(k + 60) * horizon * 0.85, r, r);
    }
  }

  private drawSunMoon(minute: number, light: number, horizon: number): void {
    const { g, w } = this;
    // the sun crosses between 5:00 and 20:00, the moon between 20:00 and 5:00
    const sunT = (minute - DAWN_AT) / (NIGHT_AT - DAWN_AT);
    const moonT = ((minute - NIGHT_AT + 1440) % 1440) / (1440 - (NIGHT_AT - DAWN_AT));
    const body = (t: number, r: number, color: string, glow: string) => {
      const x = w * (0.1 + 0.8 * t);
      const y = horizon * (0.95 - Math.sin(Math.PI * t) * 0.78);
      const grad = g.createRadialGradient(x, y, r * 0.5, x, y, r * 3.2);
      grad.addColorStop(0, glow);
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fillStyle = color;
      g.fill();
    };
    if (minute >= DAWN_AT && minute < NIGHT_AT) body(sunT, 26, '#fff4c0', `rgba(255,230,150,${0.5 * Math.max(0.3, light)})`);
    else body(moonT, 20, '#f4f4ff', 'rgba(200,210,255,0.35)');
  }

  private drawClouds(state: GameState, light: number, horizon: number): void {
    const { g, w } = this;
    const heavy = state.weather === 'rain' || state.weather === 'fog' ? 1 : 0;
    const n = 5 + heavy * 4;
    const tint = mix('#55608a', '#ffffff', light);
    for (let k = 0; k < n; k++) {
      const speed = 6 + rnd(k) * 10;
      const x = ((rnd(k + 3) * w * 1.4 + this.t * speed) % (w * 1.4)) - w * 0.2;
      const y = horizon * (0.1 + rnd(k + 8) * 0.45);
      const s = 0.7 + rnd(k + 12) * 0.9;
      g.fillStyle = heavy ? mix('#6a7488', '#9aa4b8', light) : tint;
      g.globalAlpha = 0.85;
      for (const [dx, dy, r] of [[0, 0, 26], [28, 6, 20], [-26, 8, 18], [10, -10, 20]] as const) {
        g.beginPath();
        g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  }

  private drawScenery(kind: string, light: number, horizon: number): void {
    const { g, w } = this;
    const far = mix('#1a2850', '#6a98b8', light);
    const mid = mix('#10203a', '#4a7a6a', light);
    const near = mix('#0a1428', '#2a5a3a', light);
    const hill = (base: string, amp: number, freq: number, phase: number, lift: number) => {
      g.fillStyle = base;
      g.beginPath();
      g.moveTo(0, horizon);
      for (let x = 0; x <= w; x += 8) g.lineTo(x, horizon - lift - (Math.sin(x * freq + phase) * 0.5 + 0.5) * amp);
      g.lineTo(w, horizon);
      g.closePath();
      g.fill();
    };
    const tree = (x: number, base: number, s: number, color: string, shape: 'willow' | 'pine' | 'palm') => {
      g.fillStyle = mix('#2a1a10', '#6a4a2a', light);
      g.fillRect(x - 3 * s, base - 30 * s, 6 * s, 30 * s);
      g.fillStyle = color;
      if (shape === 'pine') {
        for (let k = 0; k < 3; k++) {
          g.beginPath();
          g.moveTo(x, base - (60 - k * 14) * s);
          g.lineTo(x - (22 - k * 3) * s, base - (28 - k * 12) * s);
          g.lineTo(x + (22 - k * 3) * s, base - (28 - k * 12) * s);
          g.fill();
        }
      } else if (shape === 'willow') {
        g.beginPath();
        g.arc(x, base - 42 * s, 28 * s, Math.PI, 0);
        g.fill();
        for (let k = -3; k <= 3; k++) g.fillRect(x + k * 8 * s - 1, base - 42 * s, 2.4 * s, (22 + Math.abs(k) * -2 + 14) * s);
      } else {
        for (let k = 0; k < 6; k++) {
          const a = -Math.PI * 0.95 + (k / 5) * Math.PI * 0.9;
          g.beginPath();
          g.moveTo(x, base - 30 * s);
          g.quadraticCurveTo(x + Math.cos(a) * 20 * s, base - 30 * s + Math.sin(a) * 26 * s - 8 * s, x + Math.cos(a) * 34 * s, base - 30 * s + Math.sin(a) * 10 * s + 12 * s);
          g.lineWidth = 5 * s;
          g.strokeStyle = color;
          g.stroke();
        }
      }
    };
    switch (kind) {
      case 'willows':
        hill(far, 40, 0.004, 1, 6);
        hill(mid, 22, 0.009, 4, 0);
        tree(w * 0.1, horizon + 2, 1.5, near, 'willow');
        tree(w * 0.86, horizon + 2, 1.2, near, 'willow');
        break;
      case 'rocks':
        hill(far, 60, 0.005, 2, 8);
        hill(mid, 26, 0.012, 0, 0);
        for (let k = 0; k < 7; k++) {
          g.fillStyle = mix('#222a36', '#7a8a8a', light);
          g.beginPath();
          g.ellipse(w * (0.05 + k * 0.15 + rnd(k) * 0.05), horizon + 1, 26 + rnd(k + 2) * 26, 12 + rnd(k + 5) * 14, 0, Math.PI, 0);
          g.fill();
        }
        tree(w * 0.92, horizon + 2, 1.1, near, 'pine');
        break;
      case 'mountains':
        hill(mix('#1a2450', '#8aa8d8', light), 120, 0.0028, 0.6, 14);
        hill(mix('#141c3c', '#5a78a8', light), 70, 0.006, 3, 0);
        tree(w * 0.07, horizon + 2, 1.1, near, 'pine');
        tree(w * 0.12, horizon + 2, 0.8, near, 'pine');
        break;
      case 'snowpeaks': {
        hill(mix('#1a2a58', '#cfe0f4', light), 130, 0.0032, 0.3, 14);
        hill(mix('#1a2a4a', '#a8c0dc', light), 70, 0.007, 2, 0);
        // aurora ribbons at night
        const a = 1 - light;
        if (a > 0.05) {
          for (let k = 0; k < 3; k++) {
            const grad = g.createLinearGradient(0, 0, 0, horizon);
            grad.addColorStop(0, `rgba(${k ? '160,120,255' : '90,255,190'},0)`);
            grad.addColorStop(0.5, `rgba(${k ? '160,120,255' : '90,255,190'},${0.28 * a})`);
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = grad;
            g.beginPath();
            g.moveTo(0, 0);
            for (let x = 0; x <= w; x += 12) g.lineTo(x, horizon * (0.25 + k * 0.12) + Math.sin(x * 0.01 + this.t * 0.5 + k) * 24);
            g.lineTo(w, horizon * 0.8);
            g.lineTo(0, horizon * 0.8);
            g.fill();
          }
        }
        tree(w * 0.9, horizon + 2, 1, mix('#14302a', '#3a7a6a', light), 'pine');
        break;
      }
      case 'harbour':
        hill(mix('#2a2050', '#c88a7a', light), 36, 0.005, 2, 6);
        // lighthouse
        g.fillStyle = mix('#2a2a3a', '#f0e8e0', light);
        g.beginPath();
        g.moveTo(w * 0.84 - 14, horizon);
        g.lineTo(w * 0.84 - 8, horizon - 90);
        g.lineTo(w * 0.84 + 8, horizon - 90);
        g.lineTo(w * 0.84 + 14, horizon);
        g.fill();
        g.fillStyle = mix('#5a2030', '#e04a4a', light);
        g.fillRect(w * 0.84 - 11, horizon - 56, 22, 12);
        g.fillStyle = '#ffe890';
        g.fillRect(w * 0.84 - 7, horizon - 106, 14, 16);
        // little sailboats
        for (const [bx, s] of [[0.5, 1], [0.72, 0.7]] as const) {
          const x = w * bx + Math.sin(this.t * 0.4 + bx * 9) * 4;
          g.fillStyle = mix('#201830', '#8a5a3a', light);
          g.fillRect(x - 14 * s, horizon - 4 * s, 28 * s, 4 * s);
          g.fillStyle = mix('#c8c0d8', '#fffaf0', light);
          g.beginPath();
          g.moveTo(x, horizon - 40 * s);
          g.lineTo(x + 16 * s, horizon - 6 * s);
          g.lineTo(x, horizon - 6 * s);
          g.fill();
        }
        break;
      case 'palms':
        hill(mix('#1a3a5a', '#5ad0b8', light), 22, 0.006, 1, 2);
        tree(w * 0.09, horizon + 3, 1.6, mix('#0a3a2a', '#2aa860', light), 'palm');
        tree(w * 0.88, horizon + 3, 1.3, mix('#0a3a2a', '#2aa860', light), 'palm');
        tree(w * 0.8, horizon + 3, 0.9, mix('#0a3a2a', '#2aa860', light), 'palm');
        break;
      default:
        // stars: a faint far shore
        hill(mix('#0a0a30', '#3a3a8a', light), 18, 0.007, 3, 0);
        break;
    }
  }

  private drawSeabed(kind: string, floor: string, dim: number): void {
    const { g, w, h } = this;
    const y0 = h * 0.9;
    g.fillStyle = mix('#02040a', floor, dim);
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 10) g.lineTo(x, y0 + Math.sin(x * 0.012) * 10 + Math.sin(x * 0.03 + 2) * 4);
    g.lineTo(w, h);
    g.fill();
    const sway = (x: number) => Math.sin(this.t * 1.2 + x * 0.05) * 6;
    for (let k = 0; k < 16; k++) {
      const x = rnd(k + 90) * w;
      const by = y0 + 6 + Math.sin(x * 0.012) * 10;
      if (kind === 'palms') {
        // coral in bright colours
        const colors = ['#ff6a8a', '#ffb02a', '#a878f8', '#ff8a3a', '#38e0b0'];
        g.fillStyle = mix('#102030', colors[k % colors.length], dim);
        for (let b = 0; b < 4; b++) {
          g.beginPath();
          g.ellipse(x + (b - 1.5) * 9 + sway(x) * 0.3, by - 10 - b * 4 * (k % 2), 5, 14 + (k % 3) * 6, (b - 1.5) * 0.18, 0, Math.PI * 2);
          g.fill();
        }
      } else if (kind === 'stars') {
        // glowing plants
        g.strokeStyle = mix('#102a4a', '#5affd8', 0.35 + 0.65 * Math.abs(Math.sin(this.t + k)));
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, by);
        g.quadraticCurveTo(x + sway(x), by - 30, x + sway(x) * 1.6, by - 52 - (k % 3) * 12);
        g.stroke();
      } else if (kind === 'snowpeaks') {
        g.fillStyle = mix('#102030', '#cfe8f8', dim);
        g.beginPath();
        g.moveTo(x - 10, by);
        g.lineTo(x, by - 22 - (k % 3) * 8);
        g.lineTo(x + 10, by);
        g.fill();
      } else {
        g.strokeStyle = mix('#08140c', k % 2 ? '#3a9a5a' : '#5ab86a', dim);
        g.lineWidth = 3;
        g.beginPath();
        g.moveTo(x, by);
        g.quadraticCurveTo(x + sway(x), by - 24, x + sway(x) * 1.5, by - 44 - (k % 4) * 8);
        g.stroke();
      }
    }
  }

  private drawShadows(state: GameState, dt: number, horizon: number, dim: number): void {
    const { w, h } = this;
    const waterH = h - horizon;
    const fs = state.fishing;
    for (const s of this.shadows) {
      s.x += s.dir * s.speed * dt;
      if (s.x > 1.25) s.dir = -1;
      if (s.x < -0.25) s.dir = 1;
      this.shadow(w * s.x, horizon + waterH * s.depth, 34 * s.size, s.dir, 0.16, dim);
    }
    // the fish that will bite swims in from the side while you wait
    if (fs && fs.phase === 'wait') {
      const hookX = w * this.hookX;
      const left = state.minute >= 0 ? -1 : 1;
      const p = Math.max(0, 1 - fs.biteIn / 60);
      const x = hookX + left * (1 - p) * w * 0.45;
      this.shadow(x, horizon + waterH * 0.42, 26 + 26 * fs.size, left === -1 ? 1 : -1, 0.3, dim);
    }
  }

  /** a dark shape by day; a faint glowing one when the water is dark, so the fish can still be seen */
  private shadow(x: number, y: number, len: number, dir: 1 | -1, alpha: number, dim: number): void {
    const { g } = this;
    g.save();
    g.translate(x, y + Math.sin(this.t * 2 + x * 0.02) * 3);
    g.scale(dir, 1);
    g.fillStyle = dim < 0.7 ? `rgba(140,215,255,${alpha * (1.3 - dim)})` : `rgba(0,20,40,${alpha})`;
    g.beginPath();
    g.ellipse(0, 0, len, len * 0.34, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.moveTo(-len * 0.8, 0);
    g.lineTo(-len * 1.35, -len * 0.38);
    g.lineTo(-len * 1.35, len * 0.38);
    g.fill();
    g.restore();
  }

  private drawSurface(light: number, horizon: number): void {
    const { g, w } = this;
    g.strokeStyle = `rgba(255,255,255,${0.25 + 0.3 * light})`;
    g.lineWidth = 2;
    for (let row = 0; row < 3; row++) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = horizon + row * 14 + 2 + Math.sin(x * 0.03 + this.t * (1.1 + row * 0.3) + row) * (2.5 - row * 0.6);
        if (x === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      g.strokeStyle = `rgba(255,255,255,${(0.18 + 0.2 * light) / (row + 1.5)})`;
    }
  }

  private drawAngler(state: GameState, kind: string, horizon: number, reelPower: number): void {
    const { g, w, h } = this;
    const fs = state.fishing;
    const boat = kind === 'harbour' || kind === 'palms' || kind === 'stars';
    const bob = boat ? Math.sin(this.t * 1.1) * 3 : 0;
    const baseY = horizon + 6 + bob;
    const px = w * 0.13;
    // pier (planks on posts) or a little boat
    if (boat) {
      g.fillStyle = '#7a4a2a';
      g.beginPath();
      g.moveTo(px - 100, baseY - 22);
      g.lineTo(px + 100, baseY - 22);
      g.quadraticCurveTo(px + 80, baseY + 22, px + 10, baseY + 22);
      g.quadraticCurveTo(px - 70, baseY + 22, px - 100, baseY - 22);
      g.fill();
      g.fillStyle = '#e8c090';
      g.fillRect(px - 100, baseY - 26, 200, 6);
    } else {
      g.fillStyle = '#6a4424';
      for (const x of [px - 90, px - 30, px + 30, px + 90]) g.fillRect(x - 5, baseY - 18, 10, 46);
      g.fillStyle = '#b88a56';
      g.fillRect(px - 110, baseY - 26, 230, 10);
      g.fillStyle = '#d8aa72';
      g.fillRect(px - 110, baseY - 26, 230, 3);
    }
    // the angler
    const sy = baseY - 26;
    g.fillStyle = '#e85a4a';
    g.beginPath();
    g.ellipse(px, sy - 18, 14, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4cfa8';
    g.beginPath();
    g.arc(px + 2, sy - 46, 11, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f0c040';
    g.beginPath();
    g.ellipse(px + 2, sy - 52, 17, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(px + 2, sy - 54, 9, Math.PI, 0);
    g.fill();
    g.fillStyle = '#2a1a26';
    g.beginPath();
    g.arc(px + 7, sy - 46, 1.8, 0, Math.PI * 2);
    g.fill();
    // rod: bends when a fish pulls
    const handX = px + 14;
    const handY = sy - 26;
    const len = 190 + (RODS[state.gear.rod].value - 0.24) * 140;
    const bend = fs?.phase === 'reel' ? 34 + reelPower * 26 : fs ? 6 : 0;
    const tipX = handX + len * 0.88;
    const tipY = handY - len * 0.5 + bend;
    g.strokeStyle = '#4a2a14';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(handX - 6, handY + 8);
    g.quadraticCurveTo(handX + len * 0.5, handY - len * 0.45 - bend * 0.3, tipX, tipY);
    g.stroke();
    if (!fs) return;
    // line, bobber and hook
    const bx = w * this.hookX;
    const surfaceY = horizon + 3 + Math.sin(this.t * 2) * 2;
    let hookY = h * 0.4 + (h - horizon) * 0.34;
    let jitterX = 0;
    if (fs.phase === 'reel') {
      // the hooked fish pulls the hook around; its depth follows the bar, so a strong fish dives
      hookY = horizon + (h - horizon) * (0.2 + (1 - fs.fishPos) * 0.55);
      jitterX = Math.sin(this.t * 11) * 6 * (0.4 + fs.difficulty);
    } else {
      hookY += Math.sin(this.t * 1.4) * 2;
    }
    g.strokeStyle = 'rgba(255,255,255,0.8)';
    g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(tipX, tipY);
    g.quadraticCurveTo((tipX + bx) / 2, Math.max(tipY, surfaceY) + 40 - reelPower * 20, bx, surfaceY);
    g.lineTo(bx + jitterX, hookY);
    g.stroke();
    // bobber
    const dip = fs.phase === 'reel' ? 6 : Math.max(0, Math.sin(this.t * 6)) * (fs.biteIn < 15 ? 5 : 0);
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(bx, surfaceY + dip - 4, 6, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ff4a4a';
    g.beginPath();
    g.arc(bx, surfaceY + dip - 4, 6, Math.PI, 0);
    g.fill();
    // hook, and the plain little fish struggling on it
    if (fs.phase === 'reel') {
      const sz = 46 + fs.size * 70;
      g.save();
      g.translate(bx + jitterX, hookY);
      g.rotate(Math.sin(this.t * 14) * 0.35 - 0.2);
      g.drawImage(fishCanvas(null), -sz / 2, -sz / 2, sz, sz);
      g.restore();
    } else {
      g.strokeStyle = '#d8d8e0';
      g.lineWidth = 2;
      g.beginPath();
      g.arc(bx, hookY + 4, 4, -0.5, Math.PI);
      g.stroke();
    }
    if (fs.phase !== this.lastPhase) {
      if (fs.phase === 'reel') this.splash(1);
      this.lastPhase = fs.phase;
    }
  }

  private drawWeather(state: GameState, horizon: number): void {
    const { g, w, h } = this;
    if (state.weather === 'rain') {
      g.strokeStyle = 'rgba(190,215,255,0.55)';
      g.lineWidth = 1.4;
      g.beginPath();
      for (let k = 0; k < 120; k++) {
        const x = (rnd(k) * w + this.t * 160) % w;
        const y = (rnd(k + 50) * h + this.t * 700) % h;
        g.moveTo(x, y);
        g.lineTo(x - 5, y + 16);
      }
      g.stroke();
      g.fillStyle = 'rgba(40,50,80,0.18)';
      g.fillRect(0, 0, w, h);
    } else if (state.weather === 'snow') {
      g.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 90; k++) {
        const x = (rnd(k) * w + Math.sin(this.t + k) * 20 + this.t * 10) % w;
        const y = (rnd(k + 50) * h + this.t * (40 + rnd(k) * 40)) % h;
        g.beginPath();
        g.arc(x, y, 1.5 + rnd(k + 9) * 2, 0, Math.PI * 2);
        g.fill();
      }
    } else if (state.weather === 'fog') {
      const fog = g.createLinearGradient(0, horizon * 0.5, 0, horizon * 1.5);
      fog.addColorStop(0, 'rgba(230,236,244,0)');
      fog.addColorStop(0.5, 'rgba(230,236,244,0.6)');
      fog.addColorStop(1, 'rgba(230,236,244,0)');
      g.fillStyle = fog;
      g.fillRect(0, 0, w, h * 0.75);
    }
    // drops and rings from splashes
    this.rings = this.rings.filter((r) => (r.age += 0.016) < 1.2);
    g.lineWidth = 2;
    for (const r of this.rings) {
      g.strokeStyle = `rgba(255,255,255,${0.7 * (1 - r.age / 1.2)})`;
      g.beginPath();
      g.ellipse(r.x, r.y + 4, 8 + r.age * 60, 3 + r.age * 14, 0, 0, Math.PI * 2);
      g.stroke();
    }
    this.drops = this.drops.filter((d) => {
      d.life -= 0.016;
      d.x += d.vx * 0.016;
      d.y += d.vy * 0.016;
      d.vy += 520 * 0.016;
      return d.life > 0;
    });
    g.fillStyle = 'rgba(220,240,255,0.9)';
    for (const d of this.drops) {
      g.beginPath();
      g.arc(d.x, d.y, 2.6, 0, Math.PI * 2);
      g.fill();
    }
  }

  /** Where the hook is on screen, for effects. */
  hookPoint(): { x: number; y: number } {
    return { x: this.w * this.hookX, y: this.h * 0.4 };
  }
}
