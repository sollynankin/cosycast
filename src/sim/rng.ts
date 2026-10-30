// Seeded RNG (mulberry32) kept in the game state, so a run replays identically. Never use Math.random in sim/.
import type { GameState } from './state';

export function rngNext(state: Pick<GameState, 'rng'>): number {
  state.rng = (state.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(state.rng ^ (state.rng >>> 15), 1 | state.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [lo, hi] inclusive. */
export function rngInt(state: Pick<GameState, 'rng'>, lo: number, hi: number): number {
  return lo + Math.floor(rngNext(state) * (hi - lo + 1));
}

/** Pick by weight. */
export function rngWeighted<T>(state: Pick<GameState, 'rng'>, items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let r = rngNext(state) * total;
  for (const [item, w] of items) {
    r -= w;
    if (r < 0) return item;
  }
  return items[items.length - 1][0];
}
