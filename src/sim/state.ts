// GameState: plain JSON only (it is saved as is). Derived things (level, segment) are computed, not stored.
import { START_COINS, START_MINUTE } from '../data/balance';
import type { LocationId, Quality, Weather } from '../data/types';

export const SAVE_VERSION = 1;

/** One caught fish. Length is per fish; the species record keeps the longest. */
export interface FishItem {
  uid: number;
  species: string;
  cm: number;
  q: Quality;
  loc: LocationId;
  day: number;
}

export interface FishingState {
  /** 'wait' until the bite, then 'reel' (the catch mini-game) */
  phase: 'wait' | 'reel';
  biteIn: number;
  species: string;
  fishPos: number;
  fishVel: number;
  zonePos: number;
  zoneVel: number;
  progress: number;
  holding: boolean;
  retarget: number;
  fishTarget: number;
  lenCm: number;
  size: number;
  difficulty: number;
  reelTicks: number;
}

export interface FishRecord {
  caught: number;
  bestCm: number;
  bestQ: Quality;
  /** catches by size class: normal, silver, gold */
  bySize: [number, number, number];
  firstDay: number;
}

export interface Tank {
  fish: FishItem[];
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  coins: number;
  xp: number;
  /** days since the start, and minutes since midnight */
  day: number;
  minute: number;
  weather: Weather;
  location: LocationId;
  unlocked: LocationId[];
  /** index of the owned tier of each piece of gear */
  gear: { rod: number; reel: number; line: number; bucket: number };
  baits: Record<string, number>;
  /** equipped bait id, or null */
  bait: string | null;
  bucket: FishItem[];
  tanks: Tank[];
  decor: string[];
  /** aquarium tips waiting to be collected */
  tips: number;
  log: Record<string, FishRecord>;
  stats: { casts: number; caught: number; escaped: number; sold: number; earned: number };
  fishing: FishingState | null;
  nextUid: number;
}

export function newGame(seed = 1): GameState {
  return {
    version: SAVE_VERSION,
    seed,
    rng: seed | 0,
    coins: START_COINS,
    xp: 0,
    day: 0,
    minute: START_MINUTE,
    weather: 'clear',
    location: 'pond',
    unlocked: ['pond'],
    gear: { rod: 0, reel: 0, line: 0, bucket: 0 },
    baits: {},
    bait: null,
    bucket: [],
    tanks: [{ fish: [] }],
    decor: [],
    tips: 0,
    log: {},
    stats: { casts: 0, caught: 0, escaped: 0, sold: 0, earned: 0 },
    fishing: null,
    nextUid: 1,
  };
}
