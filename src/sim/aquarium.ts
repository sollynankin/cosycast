// The aquarium: keep fish instead of selling them; they pay small tips while you fish.
import { AQUARIUM_TIP_CAP_SECONDS, AQUARIUM_TIP_RATE } from '../data/balance';
import { DECOR, TANKS } from '../data/gear';
import { OK, fail, type Result } from './events';
import { takeFish } from './economy';
import { sellValue } from './fishing';
import type { GameState } from './state';

export function tankCapacity(tank: number): number {
  return TANKS[tank].capacity;
}

/** Move a fish from the bucket into a tank (the first with room if none is given). */
export function keepFish(state: GameState, uid: number, tank?: number): Result {
  const i = state.bucket.findIndex((f) => f.uid === uid);
  if (i < 0) return fail('That fish is not in the bucket.');
  const order = tank === undefined ? state.tanks.map((_, k) => k) : [tank];
  for (const k of order) {
    const t = state.tanks[k];
    if (t && t.fish.length < tankCapacity(k)) {
      t.fish.push(state.bucket.splice(i, 1)[0]);
      return OK;
    }
  }
  return fail('Your tanks are full. Sell a fish or buy a bigger tank.');
}

/** Let a fish go (from the bucket or a tank). It is gone for good. */
export function releaseFish(state: GameState, uid: number): Result {
  return takeFish(state, uid) ? OK : fail('That fish is gone.');
}

/** Move a kept fish back to the bucket. */
export function unkeepFish(state: GameState, uid: number, bucketSpace: number): Result {
  if (state.bucket.length >= bucketSpace) return fail('Your bucket is full.');
  for (const tank of state.tanks) {
    const j = tank.fish.findIndex((f) => f.uid === uid);
    if (j >= 0) {
      state.bucket.push(tank.fish.splice(j, 1)[0]);
      return OK;
    }
  }
  return fail('That fish is not in a tank.');
}

/** Value of all the fish on show. */
export function aquariumValue(state: GameState): number {
  let v = 0;
  for (const t of state.tanks) for (const f of t.fish) v += sellValue(f.species, f.q);
  return v;
}

export function tipMultiplier(state: GameState): number {
  return 1 + DECOR.filter((d) => state.decor.includes(d.id)).reduce((a, d) => a + d.tips, 0);
}

/** Coins per second the aquarium earns in tips. */
export function tipRate(state: GameState): number {
  return aquariumValue(state) * AQUARIUM_TIP_RATE * tipMultiplier(state);
}

/** Tips pile up while you play, up to a cap. */
export function tickAquarium(state: GameState, seconds: number): void {
  const rate = tipRate(state);
  state.tips = Math.min(rate * AQUARIUM_TIP_CAP_SECONDS, state.tips + rate * seconds);
}

export function collectTips(state: GameState): Result {
  const coins = Math.floor(state.tips);
  if (coins < 1) return fail('No tips yet.');
  state.tips -= coins;
  state.coins += coins;
  state.stats.earned += coins;
  return OK;
}
