// Fish pictures, drawn once and cached: a canvas for drawing into the scene and a data URL for <img> tags.
// Drawn on a 48-unit grid at twice the pixels, so they stay crisp when shown big.
import { getFish } from '../data/fish';
import type { FishLook } from '../data/types';
import { drawFishLook } from './fishArt';

const SIZE = 48;
const canvases = new Map<string, HTMLCanvasElement>();
const urls = new Map<string, string>();

/** What you see on the line while reeling: every fish is this plain little fish until it is landed. */
export const GENERIC_LOOK: FishLook = { shape: 'standard', body: '#7ab4e0', belly: '#e8f4ff', fin: '#5a94d0', accent: '#4a80c0', pattern: 'stripe' };

function render(look: FishLook): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = SIZE * 2;
  c.height = SIZE * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  drawFishLook(g, look);
  return c;
}

export function fishCanvas(species: string | null): HTMLCanvasElement {
  const key = species ?? '';
  let c = canvases.get(key);
  if (!c) {
    c = render(species ? getFish(species).look : GENERIC_LOOK);
    canvases.set(key, c);
  }
  return c;
}

export function fishIcon(species: string | null): string {
  const key = species ?? '';
  let u = urls.get(key);
  if (!u) {
    u = fishCanvas(species).toDataURL();
    urls.set(key, u);
  }
  return u;
}
