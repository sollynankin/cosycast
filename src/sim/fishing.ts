// Fishing: cast, a seeded bite delay, then the catch mini-game in the tick. Ported from the Cosycorp farm game.
// A hooked fish has a rolled length; bigger fish are harder and slower to reel in, and every fish tires.
import {
  BITE_MAX_TICKS, BITE_MIN_TICKS, BUCKET_CAPACITY, DISCOVERY_COIN_MULT, DISCOVERY_XP_MULT, FISH_CATCH_RATE, FISH_DRAIN_RATE,
  FISH_GOLD_AT, FISH_LENGTH_LEVEL_BONUS, FISH_LENGTH_SKEW, FISH_SILVER_AT, FISH_SIZE_DIFFICULTY, FISH_SIZE_REEL_TIME,
  FISH_SIZE_TIRE_TIME, FISH_START_PROGRESS, FISH_TIRE_CATCH_BOOST, FISH_TIRE_DRAIN_RELIEF, FISH_TIRE_SLOWDOWN, FISH_TIRE_TICKS,
  FISH_ZONE_DAMP, FISH_ZONE_GRAVITY, FISH_ZONE_LIFT, QUALITY_PRICE_MULT, RARE_BELOW, XP_PRICE_POWER, XP_QUALITY_MULT,
} from '../data/balance';
import { FISH, getFish } from '../data/fish';
import { BAITS, LINES, REELS, RODS } from '../data/gear';
import type { FishDef, Quality } from '../data/types';
import { OK, fail, type Result, type SimEvent } from './events';
import { addXp, levelOf } from './progress';
import { rngInt, rngNext, rngWeighted } from './rng';
import { segmentOf } from './time';
import type { FishItem, GameState } from './state';

/** Fish that can bite here, now. */
export function fishAvailable(state: GameState): FishDef[] {
  const seg = segmentOf(state.minute);
  return FISH.filter((f) => f.where.includes(state.location) && (!f.times || f.times.includes(seg)) && (!f.weather || f.weather.includes(state.weather)));
}

export function bucketCapacity(state: GameState): number {
  return BUCKET_CAPACITY[state.gear.bucket];
}

/** A big fish fights harder than an average one of its kind, a small one softer. */
export function fishDifficulty(def: FishDef, size: number): number {
  return Math.min(0.98, Math.max(0.05, def.difficulty + (size - 0.5) * FISH_SIZE_DIFFICULTY));
}

/** Size class of a catch from its place in the species range: 0 normal, 1 silver, 2 gold. */
export function sizeClass(size: number): Quality {
  return size >= FISH_GOLD_AT ? 2 : size >= FISH_SILVER_AT ? 1 : 0;
}

/** Roll a length: small fish are common; level and bait nudge it up. */
export function rollLength(state: GameState, def: FishDef, bonus = 0): { size: number; lenCm: number } {
  const size = Math.min(1, Math.max(0, rngNext(state) ** FISH_LENGTH_SKEW + (levelOf(state.xp) - 1) * FISH_LENGTH_LEVEL_BONUS + bonus));
  return { size, lenCm: Math.round(def.minCm + size * (def.maxCm - def.minCm)) };
}

export function sizeThresholds(def: FishDef): { silverCm: number; goldCm: number } {
  const at = (frac: number) => Math.round(def.minCm + frac * (def.maxCm - def.minCm));
  return { silverCm: at(FISH_SILVER_AT), goldCm: at(FISH_GOLD_AT) };
}

/** How worn out the hooked fish is, 0 (fresh) to 1 (spent). Bigger fish take longer to tire. */
export function fishFatigue(fs: { reelTicks: number; size: number }): number {
  return Math.min(1, fs.reelTicks / (FISH_TIRE_TICKS * (1 + fs.size * FISH_SIZE_TIRE_TIME)));
}

export function cast(state: GameState, ev: SimEvent[]): Result {
  if (state.fishing) return fail('Already fishing.');
  if (state.bucket.length >= bucketCapacity(state)) return fail('Your bucket is full. Sell or keep some fish first.');
  const pool = fishAvailable(state);
  if (pool.length === 0) return fail('Nothing is biting here right now. Try another time of day or another place.');
  const bait = state.bait ? BAITS.find((b) => b.id === state.bait) : undefined;
  if (bait) {
    if ((state.baits[bait.id] ?? 0) > 0) state.baits[bait.id] -= 1;
    else state.bait = null;
  }
  const useBait = state.bait ? bait : undefined;
  const weights = pool.map((f) => [f.id, f.rarity * (f.rarity < RARE_BELOW ? (useBait?.rareMult ?? 1) : 1)] as [string, number]);
  const species = rngWeighted(state, weights);
  const def = getFish(species);
  const { size, lenCm } = rollLength(state, def, useBait?.sizeBonus ?? 0);
  state.fishing = {
    phase: 'wait',
    biteIn: Math.max(5, Math.round(rngInt(state, BITE_MIN_TICKS, BITE_MAX_TICKS) * (useBait?.biteMult ?? 1))),
    species,
    fishPos: 0.5,
    fishVel: 0,
    zonePos: 0.35,
    zoneVel: 0,
    progress: FISH_START_PROGRESS,
    holding: false,
    retarget: 0,
    fishTarget: 0.5,
    lenCm,
    size,
    difficulty: fishDifficulty(def, size),
    reelTicks: 0,
  };
  state.stats.casts += 1;
  ev.push({ type: 'cast' });
  return OK;
}

/** Reel the line in before a bite (or give up): the bait is gone. */
export function stopFishing(state: GameState): void {
  state.fishing = null;
}

export function reel(state: GameState, hold: boolean): void {
  if (state.fishing) state.fishing.holding = hold;
}

function nextTarget(state: GameState, def: FishDef, cur: number): number {
  const r = rngNext(state);
  switch (def.behaviour) {
    case 'calm':
      return Math.min(1, Math.max(0, cur + (r - 0.5) * 0.4));
    case 'dart':
      return r;
    case 'sinker':
      return r * 0.55;
    case 'floater':
      return 0.45 + r * 0.55;
  }
}

export function tickFishing(state: GameState, ev: SimEvent[]): void {
  const fs = state.fishing;
  if (!fs) return;
  if (fs.phase === 'wait') {
    fs.biteIn -= 1;
    if (fs.biteIn <= 0) {
      fs.phase = 'reel';
      ev.push({ type: 'bite' });
    }
    return;
  }
  const def = getFish(fs.species);
  fs.reelTicks += 1;
  const tired = fishFatigue(fs);
  // The fish moves toward a target, picking a new one every so often (faster for harder fish, slower once tired).
  if (--fs.retarget <= 0) {
    fs.fishTarget = nextTarget(state, def, fs.fishPos);
    fs.retarget = Math.round((14 - fs.difficulty * 9) * (1 + tired * 1.5));
  }
  const speed = (0.006 + fs.difficulty * 0.02) * (1 - FISH_TIRE_SLOWDOWN * tired);
  fs.fishVel = fs.fishVel * 0.8 + Math.sign(fs.fishTarget - fs.fishPos) * speed * 0.2 * 5;
  fs.fishPos = Math.min(1, Math.max(0, fs.fishPos + Math.max(-speed, Math.min(speed, fs.fishVel))));
  // The zone: lift while held, gravity otherwise, bounce gently off the ends.
  const size = RODS[state.gear.rod].value;
  fs.zoneVel = (fs.zoneVel + (fs.holding ? FISH_ZONE_LIFT : -FISH_ZONE_GRAVITY)) * FISH_ZONE_DAMP;
  fs.zonePos += fs.zoneVel;
  if (fs.zonePos < 0) {
    fs.zonePos = 0;
    fs.zoneVel = Math.abs(fs.zoneVel) * 0.3;
  }
  if (fs.zonePos > 1 - size) {
    fs.zonePos = 1 - size;
    fs.zoneVel = 0;
  }
  const inside = fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size;
  const catchRate = (FISH_CATCH_RATE * REELS[state.gear.reel].value) / (1 + fs.size * FISH_SIZE_REEL_TIME);
  fs.progress += inside
    ? catchRate * (1 + tired * FISH_TIRE_CATCH_BOOST)
    : -FISH_DRAIN_RATE * LINES[state.gear.line].value * (1 - tired * FISH_TIRE_DRAIN_RELIEF);
  // Landed: the meter filled, or the fish is spent and never broke loose.
  if (fs.progress >= 1 || tired >= 1) landFish(state, ev, tired >= 1 && fs.progress < 1);
  else if (fs.progress <= 0) {
    state.fishing = null;
    state.stats.escaped += 1;
    ev.push({ type: 'escape' });
  }
}

function landFish(state: GameState, ev: SimEvent[], wornOut: boolean): void {
  const fs = state.fishing!;
  const def = getFish(fs.species);
  const q = sizeClass(fs.size);
  state.fishing = null;
  const fish: FishItem = { uid: state.nextUid++, species: fs.species, cm: fs.lenCm, q, loc: state.location, day: state.day };
  state.bucket.push(fish);
  state.stats.caught += 1;
  const discovered = !state.log[fs.species];
  let rec = state.log[fs.species];
  if (!rec) {
    rec = { caught: 0, bestCm: 0, bestQ: 0, bySize: [0, 0, 0], firstDay: state.day };
    state.log[fs.species] = rec;
  }
  rec.caught += 1;
  rec.bySize[q] += 1;
  const record = fs.lenCm > rec.bestCm;
  if (record) {
    rec.bestCm = fs.lenCm;
    rec.bestQ = q;
  }
  const xp = Math.round((3 + def.price ** XP_PRICE_POWER * (1 + fs.difficulty)) * XP_QUALITY_MULT[q] * (discovered ? DISCOVERY_XP_MULT : 1));
  const bonus = discovered ? Math.round(def.price * DISCOVERY_COIN_MULT) : 0;
  state.coins += bonus;
  state.stats.earned += bonus;
  ev.push({ type: 'catch', fish, record, discovered, xp, bonus, wornOut });
  addXp(state, ev, xp);
}

/** Coins for a fish: the base price with the size bonus. */
export function sellValue(species: string, q: Quality): number {
  return Math.round(getFish(species).price * QUALITY_PRICE_MULT[q]);
}
