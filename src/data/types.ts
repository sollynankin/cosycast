// Content types. Everything the game knows about fish, places and gear is a table entry (src/data/*).

export type Quality = 0 | 1 | 2;
export type Segment = 'dawn' | 'day' | 'dusk' | 'night';
export type Weather = 'clear' | 'rain' | 'fog' | 'snow';
export type LocationId = 'pond' | 'brook' | 'lake' | 'frost' | 'harbour' | 'reef' | 'deep';
export type Behaviour = 'calm' | 'dart' | 'sinker' | 'floater';

export type FishShape = 'standard' | 'slim' | 'deep' | 'eel' | 'crayfish' | 'flat' | 'round';

export type FishPattern =
  | 'bars'
  | 'spots'
  | 'stripe'
  | 'rainbow'
  | 'blotches'
  | 'scales'
  | 'band'
  | 'speckle'
  | 'dashes'
  | 'mottle'
  | 'flames'
  | 'frost'
  | 'stars'
  | 'scutes'
  | 'glow';

/** How a fish is drawn (ui/fishArt.ts): shape, colours and a pattern. */
export interface FishLook {
  shape: FishShape;
  body: string;
  belly: string;
  fin: string;
  accent: string;
  pattern: FishPattern;
  accent2?: string;
  whiskers?: boolean;
  /** swordfish bill */
  bill?: boolean;
  /** anglerfish lure */
  lure?: boolean;
}

export interface FishDef {
  id: string;
  name: string;
  where: LocationId[];
  /** only bites in these parts of the day / this weather; omit for any */
  times?: Segment[];
  weather?: Weather[];
  /** spawn weight inside a location's pool: 10 common … 0.25 legendary */
  rarity: number;
  /** coins for a normal-sized fish */
  price: number;
  /** length range in centimetres */
  minCm: number;
  maxCm: number;
  /** 0..1 for an average-sized fish; bigger fish are harder */
  difficulty: number;
  behaviour: Behaviour;
  look: FishLook;
}

export interface LocationDef {
  id: LocationId;
  name: string;
  blurb: string;
  levelReq: number;
  cost: number;
  /** weather chances for a new day */
  weather: Partial<Record<Weather, number>>;
  /** scene colours, see ui/scene.ts */
  theme: { sky: [string, string]; night: [string, string]; water: [string, string]; floor: string; scenery: string };
}

export interface BaitDef {
  id: string;
  name: string;
  blurb: string;
  levelReq: number;
  /** price of a pack of BAIT_PACK */
  cost: number;
  /** multiplies the wait for a bite */
  biteMult: number;
  /** added to the length roll (0..1 of the species range) */
  sizeBonus: number;
  /** multiplies the spawn weight of rare fish (rarity below RARE_BELOW) */
  rareMult: number;
}

export interface GearTier {
  name: string;
  levelReq: number;
  cost: number;
  /** the stat this tier gives: catch zone size (rod), catch speed (reel), drain multiplier (line) */
  value: number;
}

export interface DecorDef {
  id: string;
  name: string;
  levelReq: number;
  cost: number;
  /** added to the aquarium tips multiplier */
  tips: number;
}

export interface TankDef {
  name: string;
  levelReq: number;
  cost: number;
  capacity: number;
}
