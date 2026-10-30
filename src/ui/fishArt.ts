// Draws one fish icon (48 × 48, head on the left) from its look in data/fishLook.ts: a shaded, outlined body
// with fins and a pattern. Returns false for an id with no look, so the caller can fall back to the plain icon.
import type { FishLook } from '../data/types';

const INK = 'rgba(60,34,50,0.95)';

/** Deterministic pseudo-random in 0..1 (icons must look the same every time). */
const rnd = (i: number): number => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

interface Geo {
  cx: number;
  cy: number;
  /** half length and half height of the body */
  a: number;
  b: number;
  tailLen: number;
  tailH: number;
  dorsal: number;
}

const SHAPES: Record<'standard' | 'slim' | 'deep', Geo> = {
  standard: { cx: 21, cy: 25, a: 16, b: 9, tailLen: 10, tailH: 9, dorsal: 6 },
  slim: { cx: 21, cy: 25, a: 18, b: 6.5, tailLen: 8, tailH: 7, dorsal: 5 },
  deep: { cx: 22, cy: 25, a: 14, b: 12, tailLen: 9, tailH: 8, dorsal: 7 },
};

function bodyPath(g: CanvasRenderingContext2D, G: Geo): void {
  const nx = G.cx - G.a;
  const tx = G.cx + G.a * 0.8;
  const tb = G.b * 0.3;
  g.beginPath();
  g.moveTo(nx, G.cy);
  g.bezierCurveTo(G.cx - G.a * 0.7, G.cy - G.b * 1.4, G.cx + G.a * 0.3, G.cy - G.b * 1.15, tx, G.cy - tb);
  g.lineTo(tx, G.cy + tb);
  g.bezierCurveTo(G.cx + G.a * 0.3, G.cy + G.b * 1.15, G.cx - G.a * 0.7, G.cy + G.b * 1.4, nx, G.cy);
  g.closePath();
}

function fillOutline(g: CanvasRenderingContext2D, color: string, shine = true): void {
  g.fillStyle = color;
  g.fill();
  if (shine) {
    g.save();
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(0, 0, 48, 24);
    g.fillStyle = 'rgba(70,20,90,0.18)';
    g.fillRect(0, 30, 48, 20);
    g.restore();
  }
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.stroke();
}

function finsBehind(g: CanvasRenderingContext2D, G: Geo, look: FishLook): void {
  const tx = G.cx + G.a * 0.8 - 1;
  // tail: a forked fan
  g.beginPath();
  g.moveTo(tx, G.cy - G.b * 0.3);
  g.lineTo(tx + G.tailLen, G.cy - G.tailH);
  g.quadraticCurveTo(tx + G.tailLen * 0.5, G.cy, tx + G.tailLen, G.cy + G.tailH);
  g.lineTo(tx, G.cy + G.b * 0.3);
  g.closePath();
  fillOutline(g, look.fin);
  // dorsal fin on the back
  const top = G.cy - G.b * 1.0;
  g.beginPath();
  g.moveTo(G.cx - G.a * 0.25, top + 1.5);
  g.quadraticCurveTo(G.cx - G.a * 0.05, top - G.dorsal * 1.3, G.cx + G.a * 0.2, top - G.dorsal);
  g.lineTo(G.cx + G.a * 0.55, top + 2.5);
  g.closePath();
  fillOutline(g, look.fin);
  // pelvic fin underneath
  const bot = G.cy + G.b * 1.0;
  g.beginPath();
  g.moveTo(G.cx - G.a * 0.05, bot - 1.5);
  g.lineTo(G.cx - G.a * 0.3, bot + 5);
  g.lineTo(G.cx + G.a * 0.2, bot - 0.5);
  g.closePath();
  fillOutline(g, look.fin);
}

function dots(g: CanvasRenderingContext2D, G: Geo, n: number, rMin: number, rMax: number, color: string, seed: number): void {
  g.fillStyle = color;
  for (let k = 0; k < n; k++) {
    const x = G.cx - G.a * 0.55 + rnd(seed + k * 3.1) * G.a * 1.5;
    const y = G.cy - G.b * 0.8 + rnd(seed + k * 7.7 + 1) * G.b * 1.45;
    g.beginPath();
    g.arc(x, y, rMin + rnd(seed + k * 1.9) * (rMax - rMin), 0, Math.PI * 2);
    g.fill();
  }
}

function sparkle(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  g.beginPath();
  g.moveTo(x, y - r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.quadraticCurveTo(x, y, x, y + r);
  g.quadraticCurveTo(x, y, x - r, y);
  g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

function pattern(g: CanvasRenderingContext2D, G: Geo, look: FishLook): void {
  const nx = G.cx - G.a;
  const tx = G.cx + G.a * 0.8;
  g.fillStyle = look.accent;
  g.strokeStyle = look.accent;
  switch (look.pattern) {
    case 'bars':
      g.globalAlpha = 0.85;
      for (let k = 0; k < 5; k++) g.fillRect(G.cx - G.a * 0.4 + k * G.a * 0.4, G.cy - G.b * 1.5, 3.2, G.b * 3);
      g.globalAlpha = 1;
      break;
    case 'spots':
      if (look.accent2) {
        g.fillStyle = look.accent2;
        for (let k = 0; k < 12; k++) {
          const x = G.cx - G.a * 0.5 + rnd(k * 3.1 + 4) * G.a * 1.45;
          const y = G.cy - G.b * 0.75 + rnd(k * 7.7 + 5) * G.b * 1.4;
          g.beginPath();
          g.arc(x, y, 2.7, 0, Math.PI * 2);
          g.fill();
        }
      }
      dots(g, G, 12, 1.1, 1.7, look.accent, 4);
      break;
    case 'stripe':
      g.fillRect(nx + 3, G.cy - 1.4, G.a * 2, 3.2);
      if (look.accent2) {
        g.fillStyle = look.accent2;
        g.fillRect(nx + 3, G.cy + 1.8, G.a * 2, 1.4);
      }
      break;
    case 'rainbow':
      g.globalAlpha = 0.9;
      g.fillRect(nx + 3, G.cy - 2.6, G.a * 2, 4.6);
      g.fillStyle = '#ffd0e0';
      g.fillRect(nx + 3, G.cy - 2.6, G.a * 2, 1.4);
      g.globalAlpha = 1;
      dots(g, G, 22, 0.6, 1.1, look.accent2 ?? '#222', 9);
      break;
    case 'blotches': {
      const blobs: [number, number, number, number, string][] = [
        [-5, -3, 6.5, 4.5, look.accent],
        [4, 3, 7, 4.8, '#ff3a3a'],
        [9, -4, 4, 3, look.accent2 ?? '#222'],
        [-9, 4, 3.6, 3, look.accent2 ?? '#222'],
      ];
      for (const [dx, dy, rx, ry, c] of blobs) {
        g.fillStyle = c;
        g.beginPath();
        g.ellipse(G.cx + dx, G.cy + dy, rx, ry, dx * 0.1, 0, Math.PI * 2);
        g.fill();
      }
      break;
    }
    case 'scales':
      g.lineWidth = 1;
      g.globalAlpha = 0.75;
      for (let r = 0; r < 6; r++) {
        for (let c = 0; c < 6; c++) {
          g.beginPath();
          g.arc(nx + G.a * 0.6 + c * 4.6 + (r % 2) * 2.3, G.cy - G.b * 0.85 + r * 3.7, 2.7, 0.1, Math.PI - 0.1);
          g.stroke();
        }
      }
      g.globalAlpha = 1;
      break;
    case 'band':
      g.lineWidth = 3.2;
      g.beginPath();
      for (let x = nx; x <= tx; x += 1.5) {
        const y = G.cy - G.b * 0.05 + Math.sin(x * 0.6) * 1.7;
        if (x === nx) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.stroke();
      break;
    case 'speckle':
      dots(g, G, 30, 0.55, 1.0, look.accent, 13);
      break;
    case 'dashes':
      g.lineWidth = 1.5;
      g.lineCap = 'round';
      for (const [row, off] of [[-0.55, 0], [0, 1.7], [0.5, 0.6]] as const) {
        for (let x = nx + 8 + off; x < tx - 2; x += 5) {
          g.beginPath();
          g.moveTo(x, G.cy + G.b * row);
          g.lineTo(x + 2.6, G.cy + G.b * row);
          g.stroke();
        }
      }
      break;
    case 'mottle':
      g.globalAlpha = 0.5;
      dots(g, G, 9, 2, 3.5, look.accent, 21);
      g.globalAlpha = 1;
      break;
    case 'flames':
      for (let k = 0; k < 4; k++) {
        const x = G.cx - G.a * 0.45 + k * 5.4;
        g.beginPath();
        g.moveTo(x, G.cy + 3.5);
        g.quadraticCurveTo(x + 3, G.cy + 1, x + 6.5, G.cy - 1.5 - k * 0.4);
        g.quadraticCurveTo(x + 2.5, G.cy - 2.8, x, G.cy - 4.5);
        g.quadraticCurveTo(x + 1.4, G.cy - 0.5, x, G.cy + 3.5);
        g.fill();
      }
      break;
    case 'frost':
      g.lineWidth = 1.1;
      g.lineCap = 'round';
      for (let k = 0; k < 5; k++) {
        const x = G.cx - G.a * 0.45 + k * 6;
        const y = G.cy + (k % 2 ? 3.2 : -3.2);
        for (let d = 0; d < 3; d++) {
          const ang = (d * Math.PI) / 3 + 0.2;
          g.beginPath();
          g.moveTo(x - Math.cos(ang) * 2.6, y - Math.sin(ang) * 2.6);
          g.lineTo(x + Math.cos(ang) * 2.6, y + Math.sin(ang) * 2.6);
          g.stroke();
        }
      }
      g.fillStyle = look.accent2 ?? '#58a8f0';
      dots(g, G, 8, 0.6, 1, look.accent2 ?? '#58a8f0', 31);
      break;
    case 'stars':
      sparkle(g, G.cx - 6, G.cy - 3.5, 3.2);
      sparkle(g, G.cx + 2, G.cy + 3, 2.8);
      sparkle(g, G.cx + 8, G.cy - 4, 2.4);
      sparkle(g, G.cx - 11, G.cy + 3, 1.8);
      dots(g, G, 7, 0.5, 0.9, look.accent, 41);
      break;
    case 'scutes':
      g.globalAlpha = 0.9;
      for (let k = 0; k < 7; k++) {
        const x = nx + G.a * 0.7 + k * 4.2;
        g.beginPath();
        g.moveTo(x, G.cy - G.b * 0.7);
        g.lineTo(x + 2, G.cy - G.b * 1.15);
        g.lineTo(x + 4, G.cy - G.b * 0.7);
        g.fill();
      }
      for (let k = 0; k < 7; k++) {
        g.beginPath();
        g.arc(nx + G.a * 0.7 + k * 4.2 + 2, G.cy + 0.5, 1.3, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
      break;
    case 'glow':
      for (let x = nx + 8; x < tx - 2; x += 3.6) {
        g.beginPath();
        g.arc(x, G.cy + Math.sin(x * 0.5) * 0.8, 1.2, 0, Math.PI * 2);
        g.fill();
      }
      break;
  }
}

function eye(g: CanvasRenderingContext2D, G: Geo): void {
  const x = G.cx - G.a + G.a * 0.32;
  const y = G.cy - G.b * 0.22;
  g.beginPath();
  g.arc(x, y, 3.3, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = INK;
  g.stroke();
  g.beginPath();
  g.arc(x - 0.4, y + 0.3, 1.8, 0, Math.PI * 2);
  g.fillStyle = '#2a1a26';
  g.fill();
  g.beginPath();
  g.arc(x - 1, y - 0.5, 0.6, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
}

function halo(g: CanvasRenderingContext2D, look: FishLook): void {
  if (!['glow', 'stars', 'flames', 'frost'].includes(look.pattern)) return;
  const grad = g.createRadialGradient(24, 25, 4, 24, 25, 24);
  grad.addColorStop(0, `${look.fin}aa`);
  grad.addColorStop(1, `${look.fin}00`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 48, 48);
}

function standardFish(g: CanvasRenderingContext2D, look: FishLook): void {
  const G = SHAPES[look.shape as 'standard' | 'slim' | 'deep'];
  halo(g, look);
  finsBehind(g, G, look);
  // body: back colour fading to the belly colour
  bodyPath(g, G);
  const grad = g.createLinearGradient(0, G.cy - G.b * 1.3, 0, G.cy + G.b * 1.3);
  grad.addColorStop(0, look.body);
  grad.addColorStop(0.55, look.body);
  grad.addColorStop(1, look.belly);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  pattern(g, G, look);
  // shading: darker underside, a bright shine along the back
  const shade = g.createLinearGradient(0, G.cy - G.b, 0, G.cy + G.b * 1.3);
  shade.addColorStop(0.5, 'rgba(60,20,90,0)');
  shade.addColorStop(1, 'rgba(60,20,90,0.3)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 48, 48);
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath();
  g.ellipse(G.cx - G.a * 0.1, G.cy - G.b * 0.7, G.a * 0.55, G.b * 0.18, -0.05, 0, Math.PI * 2);
  g.fill();
  g.restore();
  bodyPath(g, G);
  g.lineWidth = 2;
  g.lineJoin = 'round';
  g.strokeStyle = INK;
  g.stroke();
  // gill line and pectoral fin
  g.beginPath();
  g.arc(G.cx - G.a + G.a * 0.62, G.cy, G.b * 0.85, -0.9, 0.9);
  g.lineWidth = 1.3;
  g.strokeStyle = 'rgba(60,34,50,0.55)';
  g.stroke();
  g.beginPath();
  g.ellipse(G.cx - G.a * 0.1, G.cy + G.b * 0.35, 4.2, 2.2, 0.6, 0, Math.PI * 2);
  fillOutline(g, look.fin, false);
  extras(g, G, look);
  eye(g, G);
  if (look.whiskers) {
    g.lineWidth = 1.4;
    g.lineCap = 'round';
    g.strokeStyle = INK;
    for (const dy of [1.5, 4]) {
      g.beginPath();
      g.moveTo(G.cx - G.a + 1, G.cy + dy - 1);
      g.quadraticCurveTo(G.cx - G.a - 3, G.cy + dy + 2, G.cx - G.a - 5, G.cy + dy + 6);
      g.stroke();
    }
  }
}

function eelFish(g: CanvasRenderingContext2D, look: FishLook): void {
  const N = 30;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    pts.push([6 + t * 36, 25 + Math.sin(t * Math.PI * 2.2 + 0.4) * 8]);
  }
  const width = (i: number) => 9 - (i / N) * 4.5;
  const seg = (i: number, extra: number, style: string, dx = 0, dy = 0) => {
    g.beginPath();
    g.moveTo(pts[i][0] + dx, pts[i][1] + dy);
    g.lineTo(pts[i + 1][0] + dx, pts[i + 1][1] + dy);
    g.lineWidth = width(i) + extra;
    g.lineCap = 'round';
    g.strokeStyle = style;
    g.stroke();
  };
  halo(g, look);
  for (let i = 0; i < N; i++) seg(i, 3.5, INK);
  for (let i = 0; i < N; i++) seg(i, 0, look.body);
  for (let i = 0; i < N; i++) seg(i, -5.2, look.belly, 0, 2.2);
  for (let i = 0; i < N; i++) seg(i, -6.2, 'rgba(255,255,255,0.5)', -0.4, -2.4);
  // dorsal fin along the back
  g.fillStyle = look.fin;
  for (let i = 2; i < N - 2; i += 2) {
    g.beginPath();
    g.arc(pts[i][0], pts[i][1] - width(i) / 2 - 0.4, 1.7, 0, Math.PI * 2);
    g.fill();
  }
  g.fillStyle = look.accent;
  for (let i = 4; i < N - 3; i += 3) {
    g.beginPath();
    g.arc(pts[i][0], pts[i][1] - 0.8, 1.2, 0, Math.PI * 2);
    g.fill();
  }
  // head
  g.beginPath();
  g.arc(pts[0][0] + 1, pts[0][1], 5.6, 0, Math.PI * 2);
  g.fillStyle = look.body;
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.stroke();
  g.beginPath();
  g.arc(pts[0][0] - 0.4, pts[0][1] - 1.8, 2.2, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 1.2;
  g.stroke();
  g.beginPath();
  g.arc(pts[0][0] - 0.9, pts[0][1] - 1.5, 1.2, 0, Math.PI * 2);
  g.fillStyle = '#2a1a26';
  g.fill();
}

function crayfish(g: CanvasRenderingContext2D, look: FishLook): void {
  const ell = (x: number, y: number, rx: number, ry: number, rot = 0) => {
    g.beginPath();
    g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    const grad = g.createLinearGradient(0, y - ry, 0, y + ry);
    grad.addColorStop(0, look.body);
    grad.addColorStop(1, look.belly);
    g.fillStyle = grad;
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = INK;
    g.stroke();
  };
  g.lineCap = 'round';
  // antennae and legs first, behind the body
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  for (const [x2, y2] of [[3, 9], [5, 6]] as const) {
    g.beginPath();
    g.moveTo(14, 21);
    g.quadraticCurveTo(9, 12, x2, y2);
    g.stroke();
  }
  g.lineWidth = 1.6;
  for (let k = 0; k < 3; k++) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(17 + k * 3, 25 + s * 4);
      g.lineTo(15 + k * 3.5, 25 + s * 10);
      g.stroke();
    }
  }
  // tail fan
  for (const [dy, rot] of [[-4.5, -0.5], [0, 0], [4.5, 0.5]] as const) ell(42.5, 25 + dy, 4, 2.6, rot);
  // abdomen segments, then the carapace
  for (let k = 0; k < 4; k++) ell(36 - k * 4, 25, 4.2 - k * 0.1, 5.4 - k * 0.35);
  ell(19, 25, 8.6, 6.4);
  // claws
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(14, 25 + s * 4);
    g.lineTo(8, 25 + s * 9);
    g.lineWidth = 4.8;
    g.strokeStyle = INK;
    g.stroke();
    g.lineWidth = 2.8;
    g.strokeStyle = look.body;
    g.stroke();
    ell(6, 25 + s * 11, 4.8, 3.4, s * 0.7);
    g.beginPath();
    g.moveTo(2.4, 25 + s * 12);
    g.lineTo(7, 25 + s * 11);
    g.lineWidth = 1.2;
    g.strokeStyle = INK;
    g.stroke();
  }
  // speckles and pale segment lines
  g.fillStyle = look.accent;
  for (let k = 0; k < 7; k++) {
    g.beginPath();
    g.arc(14 + rnd(k * 2.3) * 11, 22 + rnd(k * 5.1) * 7, 0.9, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = look.accent;
  g.lineWidth = 1.2;
  for (let k = 0; k < 4; k++) {
    g.beginPath();
    g.moveTo(36 - k * 4, 21 + k * 0.6);
    g.lineTo(36 - k * 4, 29 - k * 0.6);
    g.stroke();
  }
  // eyes on stalks
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(12.5, 25 + s * 3.2, 1.8, 0, Math.PI * 2);
    g.fillStyle = '#2a1a26';
    g.fill();
    g.beginPath();
    g.arc(12, 24.4 + s * 3.2, 0.6, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
  }
}

export function drawFishLook(g: CanvasRenderingContext2D, look: FishLook): void {
  g.save();
  // a swordfish needs room for its bill: shrink and shift the whole drawing
  if (look.bill) {
    g.translate(10, 4);
    g.scale(0.82, 0.82);
  }
  if (look.shape === 'eel') eelFish(g, look);
  else if (look.shape === 'crayfish') crayfish(g, look);
  else if (look.shape === 'flat') flatFish(g, look);
  else if (look.shape === 'round') roundFish(g, look);
  else standardFish(g, look);
  g.restore();
}

/** The long bill of a swordfish and the glowing lure of an anglerfish, drawn over the standard body. */
function extras(g: CanvasRenderingContext2D, G: Geo, look: FishLook): void {
  const nx = G.cx - G.a;
  if (look.bill) {
    g.beginPath();
    g.moveTo(nx + 2, G.cy - 1.6);
    g.lineTo(nx - 11, G.cy + 0.3);
    g.lineTo(nx + 2, G.cy + 1.8);
    g.closePath();
    g.fillStyle = look.fin;
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = INK;
    g.lineJoin = 'round';
    g.stroke();
  }
  if (look.lure) {
    const bx = nx - 2;
    const by = G.cy - G.b * 1.3 - 6;
    g.beginPath();
    g.moveTo(nx + G.a * 0.55, G.cy - G.b * 1.05);
    g.quadraticCurveTo(nx + G.a * 0.1, G.cy - G.b * 2.0, bx, by);
    g.lineWidth = 1.4;
    g.strokeStyle = INK;
    g.stroke();
    const glow = g.createRadialGradient(bx, by, 0, bx, by, 7);
    glow.addColorStop(0, `${look.accent}ff`);
    glow.addColorStop(1, `${look.accent}00`);
    g.fillStyle = glow;
    g.fillRect(bx - 8, by - 8, 16, 16);
    g.beginPath();
    g.arc(bx, by, 2.3, 0, Math.PI * 2);
    g.fillStyle = look.accent;
    g.fill();
    g.lineWidth = 1;
    g.stroke();
  }
}

/** Flounder: a wide flat oval fringed with fins, both eyes on top. */
function flatFish(g: CanvasRenderingContext2D, look: FishLook): void {
  const G: Geo = { cx: 21, cy: 26, a: 17, b: 10, tailLen: 7, tailH: 6, dorsal: 0 };
  g.beginPath();
  g.moveTo(G.cx + G.a - 2, G.cy);
  g.lineTo(G.cx + G.a + 7, G.cy - 5);
  g.lineTo(G.cx + G.a + 5, G.cy);
  g.lineTo(G.cx + G.a + 7, G.cy + 5);
  g.closePath();
  fillOutline(g, look.fin);
  g.beginPath();
  g.ellipse(G.cx, G.cy, G.a + 1.5, G.b + 2.2, 0, 0, Math.PI * 2);
  fillOutline(g, look.fin, false);
  g.beginPath();
  g.ellipse(G.cx, G.cy, G.a, G.b, 0, 0, Math.PI * 2);
  const grad = g.createLinearGradient(0, G.cy - G.b, 0, G.cy + G.b);
  grad.addColorStop(0, look.body);
  grad.addColorStop(1, look.belly);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  pattern(g, G, look);
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.beginPath();
  g.ellipse(G.cx - 2, G.cy - 5, 9, 2, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();
  g.beginPath();
  g.ellipse(G.cx, G.cy, G.a, G.b, 0, 0, Math.PI * 2);
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.stroke();
  for (const dy of [-4.5, 0]) {
    g.beginPath();
    g.arc(G.cx - G.a + 7, G.cy + dy, 3, 0, Math.PI * 2);
    g.fillStyle = '#ffffff';
    g.fill();
    g.lineWidth = 1.4;
    g.stroke();
    g.beginPath();
    g.arc(G.cx - G.a + 6.6, G.cy + dy + 0.3, 1.6, 0, Math.PI * 2);
    g.fillStyle = '#2a1a26';
    g.fill();
  }
}

/** Pufferfish: a round body with little spines all over. */
function roundFish(g: CanvasRenderingContext2D, look: FishLook): void {
  const G: Geo = { cx: 21, cy: 25, a: 15, b: 13, tailLen: 7, tailH: 6, dorsal: 0 };
  // tail fan
  g.beginPath();
  g.moveTo(G.cx + G.a - 2, G.cy - 3);
  g.lineTo(G.cx + G.a + 8, G.cy - 7);
  g.quadraticCurveTo(G.cx + G.a + 5, G.cy, G.cx + G.a + 8, G.cy + 7);
  g.lineTo(G.cx + G.a - 2, G.cy + 3);
  g.closePath();
  fillOutline(g, look.fin);
  // spines
  g.fillStyle = look.accent;
  g.strokeStyle = INK;
  g.lineWidth = 1.2;
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    const rx = G.a + 0.5;
    const ry = G.b + 0.5;
    const x = G.cx + Math.cos(a) * rx;
    const y = G.cy + Math.sin(a) * ry;
    g.beginPath();
    g.moveTo(x - Math.sin(a) * 1.8, y + Math.cos(a) * 1.8 * (ry / rx));
    g.lineTo(x + Math.cos(a) * 3.2, y + Math.sin(a) * 3.2);
    g.lineTo(x + Math.sin(a) * 1.8, y - Math.cos(a) * 1.8 * (ry / rx));
    g.closePath();
    g.fill();
    g.stroke();
  }
  g.beginPath();
  g.ellipse(G.cx, G.cy, G.a, G.b, 0, 0, Math.PI * 2);
  const grad = g.createLinearGradient(0, G.cy - G.b, 0, G.cy + G.b);
  grad.addColorStop(0, look.body);
  grad.addColorStop(0.55, look.body);
  grad.addColorStop(1, look.belly);
  g.fillStyle = grad;
  g.fill();
  g.save();
  g.clip();
  pattern(g, G, look);
  g.fillStyle = 'rgba(255,255,255,0.4)';
  g.beginPath();
  g.ellipse(G.cx - 3, G.cy - 7, 8, 2.4, -0.2, 0, Math.PI * 2);
  g.fill();
  const shade = g.createLinearGradient(0, G.cy, 0, G.cy + G.b);
  shade.addColorStop(0, 'rgba(60,20,90,0)');
  shade.addColorStop(1, 'rgba(60,20,90,0.28)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 48, 48);
  g.restore();
  g.beginPath();
  g.ellipse(G.cx, G.cy, G.a, G.b, 0, 0, Math.PI * 2);
  g.lineWidth = 2;
  g.strokeStyle = INK;
  g.stroke();
  // pectoral fin, big eye, little mouth
  g.beginPath();
  g.ellipse(G.cx + 1, G.cy + 4, 4.4, 2.6, 0.5, 0, Math.PI * 2);
  fillOutline(g, look.fin, false);
  g.beginPath();
  g.arc(G.cx - 7, G.cy - 3, 4, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = 1.5;
  g.strokeStyle = INK;
  g.stroke();
  g.beginPath();
  g.arc(G.cx - 7.6, G.cy - 2.6, 2.2, 0, Math.PI * 2);
  g.fillStyle = '#2a1a26';
  g.fill();
  g.beginPath();
  g.arc(G.cx - G.a + 1.5, G.cy + 3, 1.6, 0, Math.PI * 2);
  g.fillStyle = '#ff8a8a';
  g.fill();
  g.stroke();
}
