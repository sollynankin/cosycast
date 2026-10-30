// Selling fish and buying bait, gear, tanks, decor and new places.
import { BAIT_PACK, BUCKET_COST, BUCKET_LEVEL } from '../data/balance';
import { BAITS, DECOR, LINES, REELS, RODS, TANKS } from '../data/gear';
import { getLocation } from '../data/locations';
import type { LocationId } from '../data/types';
import { OK, fail, type Result, type SimEvent } from './events';
import { sellValue } from './fishing';
import { levelOf } from './progress';
import type { FishItem, GameState } from './state';

export type GearKind = 'rod' | 'reel' | 'line' | 'bucket';

const TIERS = { rod: RODS, reel: REELS, line: LINES } as const;

function spend(state: GameState, coins: number): boolean {
  if (state.coins < coins) return false;
  state.coins -= coins;
  return true;
}

/** Take a fish out of the bucket or a tank (undefined if it is in neither). */
export function takeFish(state: GameState, uid: number): FishItem | undefined {
  const i = state.bucket.findIndex((f) => f.uid === uid);
  if (i >= 0) return state.bucket.splice(i, 1)[0];
  for (const tank of state.tanks) {
    const j = tank.fish.findIndex((f) => f.uid === uid);
    if (j >= 0) return tank.fish.splice(j, 1)[0];
  }
  return undefined;
}

function pay(state: GameState, ev: SimEvent[], fish: FishItem[]): number {
  const coins = fish.reduce((a, f) => a + sellValue(f.species, f.q), 0);
  state.coins += coins;
  state.stats.sold += fish.length;
  state.stats.earned += coins;
  ev.push({ type: 'sell', coins });
  return coins;
}

/** Sell one fish, from the bucket or from a tank. */
export function sellFish(state: GameState, ev: SimEvent[], uid: number): Result {
  const fish = takeFish(state, uid);
  if (!fish) return fail('That fish is gone.');
  pay(state, ev, [fish]);
  return OK;
}

/** Sell everything in the bucket. */
export function sellBucket(state: GameState, ev: SimEvent[]): Result {
  if (state.bucket.length === 0) return fail('The bucket is empty.');
  const fish = state.bucket.splice(0, state.bucket.length);
  pay(state, ev, fish);
  return OK;
}

export function buyBait(state: GameState, ev: SimEvent[], id: string): Result {
  const bait = BAITS.find((b) => b.id === id);
  if (!bait) return fail('No such bait.');
  if (levelOf(state.xp) < bait.levelReq) return fail(`Needs level ${bait.levelReq}.`);
  if (!spend(state, bait.cost)) return fail('Not enough coins.');
  state.baits[id] = (state.baits[id] ?? 0) + BAIT_PACK;
  if (!state.bait) state.bait = id;
  ev.push({ type: 'buy' });
  return OK;
}

export function equipBait(state: GameState, id: string | null): Result {
  if (id !== null && (state.baits[id] ?? 0) <= 0) return fail('You have none of that bait.');
  state.bait = id;
  return OK;
}

export function upgradeGear(state: GameState, ev: SimEvent[], kind: GearKind): Result {
  const next = state.gear[kind] + 1;
  const level = levelOf(state.xp);
  if (kind === 'bucket') {
    if (next >= BUCKET_COST.length) return fail('Already the biggest bucket.');
    if (level < BUCKET_LEVEL[next]) return fail(`Needs level ${BUCKET_LEVEL[next]}.`);
    if (!spend(state, BUCKET_COST[next])) return fail('Not enough coins.');
  } else {
    const tier = TIERS[kind][next];
    if (!tier) return fail('Already the best.');
    if (level < tier.levelReq) return fail(`Needs level ${tier.levelReq}.`);
    if (!spend(state, tier.cost)) return fail('Not enough coins.');
  }
  state.gear[kind] = next;
  ev.push({ type: 'buy' });
  return OK;
}

export function buyTank(state: GameState, ev: SimEvent[]): Result {
  const next = TANKS[state.tanks.length];
  if (!next) return fail('You have every tank.');
  if (levelOf(state.xp) < next.levelReq) return fail(`Needs level ${next.levelReq}.`);
  if (!spend(state, next.cost)) return fail('Not enough coins.');
  state.tanks.push({ fish: [] });
  ev.push({ type: 'buy' });
  return OK;
}

export function buyDecor(state: GameState, ev: SimEvent[], id: string): Result {
  const d = DECOR.find((x) => x.id === id);
  if (!d) return fail('No such decoration.');
  if (state.decor.includes(id)) return fail('You already have that.');
  if (levelOf(state.xp) < d.levelReq) return fail(`Needs level ${d.levelReq}.`);
  if (!spend(state, d.cost)) return fail('Not enough coins.');
  state.decor.push(id);
  ev.push({ type: 'buy' });
  return OK;
}

/** Go to a place; the first visit unlocks it (level and coins). */
export function travel(state: GameState, ev: SimEvent[], id: LocationId): Result {
  if (state.fishing) return fail('Reel in first.');
  const loc = getLocation(id);
  if (!state.unlocked.includes(id)) {
    if (levelOf(state.xp) < loc.levelReq) return fail(`Needs level ${loc.levelReq}.`);
    if (!spend(state, loc.cost)) return fail('Not enough coins.');
    state.unlocked.push(id);
    ev.push({ type: 'buy' });
  }
  state.location = id;
  return OK;
}
