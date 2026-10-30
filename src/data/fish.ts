// The 44 fish. `where` lists the places each one lives; `times` and `weather` narrow when it bites. Rarity is a spawn
// weight (10 common, 5 uncommon, 2 rare, 0.6 very rare, 0.25 legendary). Looks are drawn by ui/fishArt.ts.
import type { Behaviour, FishDef, FishLook, FishShape, LocationId, Segment, Weather } from './types';

type Opts = { times?: Segment[]; weather?: Weather[] };

const fish = (
  id: string,
  name: string,
  where: LocationId[],
  rarity: number,
  price: number,
  minCm: number,
  maxCm: number,
  difficulty: number,
  behaviour: Behaviour,
  look: FishLook,
  opts: Opts = {},
): FishDef => ({ id, name, where, rarity, price, minCm, maxCm, difficulty, behaviour, look, ...opts });

const L = (shape: FishShape, body: string, belly: string, fin: string, pattern: FishLook['pattern'], accent: string, extra: Partial<FishLook> = {}): FishLook => ({
  shape, body, belly, fin, pattern, accent, ...extra,
});

export const FISH: FishDef[] = [
  // ---- Willow Pond ----------------------------------------------------------------------------------------
  fish('minnow', 'Minnow', ['pond', 'brook'], 10, 6, 4, 9, 0.1, 'calm', L('slim', '#8ad8f8', '#ffffff', '#ffa0c0', 'stripe', '#2a78d8')),
  fish('sunfish', 'Sunfish', ['pond'], 8, 14, 8, 25, 0.2, 'floater', L('deep', '#ffc82a', '#ff8a2a', '#ff5a2a', 'spots', '#28b8f0', { accent2: '#ff4a3a' })),
  fish('perch', 'Perch', ['pond', 'brook', 'lake'], 9, 20, 15, 40, 0.2, 'calm', L('standard', '#9ad840', '#fff088', '#ff7a2a', 'bars', '#2a6a2a')),
  fish('bream', 'Bream', ['pond', 'lake'], 6, 30, 20, 45, 0.35, 'floater', L('deep', '#a8c8f0', '#ffffff', '#6a98e0', 'scales', '#5a80c0')),
  fish('carp', 'Carp', ['pond', 'lake'], 5, 45, 30, 90, 0.3, 'sinker', L('deep', '#f0a830', '#fff0a8', '#e8602a', 'scales', '#b87010', { whiskers: true })),
  fish('crayfish', 'Crayfish', ['pond', 'brook'], 5, 24, 6, 15, 0.3, 'sinker', L('crayfish', '#f04a2a', '#ffb070', '#d82a1a', 'speckle', '#ffe0a0')),
  fish('koi', 'Koi', ['pond'], 0.9, 220, 40, 80, 0.45, 'calm', L('deep', '#fff4e8', '#ffe8d0', '#ffd0a0', 'blotches', '#ff6a1a', { accent2: '#2a2a3a', whiskers: true }), { times: ['dawn', 'day'] }),

  // ---- Quiet Brook ----------------------------------------------------------------------------------------
  fish('smelt', 'Smelt', ['brook', 'frost'], 8, 18, 8, 20, 0.25, 'dart', L('slim', '#a8e0ff', '#ffffff', '#88c8f0', 'stripe', '#ffffff', { accent2: '#4a98e0' })),
  fish('brook_trout', 'Brook Trout', ['brook'], 7, 55, 20, 50, 0.45, 'dart', L('standard', '#5a9a3a', '#ff9a4a', '#ff6a3a', 'spots', '#ff3a5a', { accent2: '#98e8ff' }), { times: ['dawn', 'day', 'dusk'] }),
  fish('rainbow_trout', 'Rainbow Trout', ['brook'], 5, 75, 25, 70, 0.5, 'dart', L('standard', '#78d0a8', '#fff0f0', '#ffa0c8', 'rainbow', '#ff6aa8', { accent2: '#2a2a3a' }), { times: ['dawn', 'day'] }),
  fish('catfish', 'Catfish', ['brook', 'lake'], 4, 110, 40, 120, 0.55, 'sinker', L('standard', '#8a78d0', '#e0d8f8', '#6a5ab0', 'speckle', '#3a2a78', { whiskers: true }), { weather: ['rain', 'fog'] }),
  fish('emberscale', 'Emberscale', ['brook'], 1.6, 160, 15, 35, 0.65, 'dart', L('standard', '#ff5a2a', '#ffc83a', '#ff2a3a', 'flames', '#ffee70'), { weather: ['rain'] }),
  fish('eel', 'Eel', ['brook', 'lake', 'frost'], 3, 90, 40, 100, 0.65, 'dart', L('eel', '#38a878', '#f0e898', '#2a8a68', 'spots', '#a8f8c8'), { times: ['dusk', 'night'] }),
  fish('salmon', 'Salmon', ['brook'], 3, 150, 50, 100, 0.6, 'dart', L('slim', '#ff8a7a', '#ffd8c8', '#f04a6a', 'speckle', '#8a1a3a'), { times: ['dawn', 'dusk'] }),

  // ---- Mirror Lake ----------------------------------------------------------------------------------------
  fish('largemouth_bass', 'Largemouth Bass', ['lake'], 6, 90, 25, 60, 0.5, 'sinker', L('standard', '#6ac848', '#f0ffc0', '#48a838', 'band', '#1a5a2a')),
  fish('pike', 'Pike', ['lake', 'frost'], 4, 140, 50, 130, 0.6, 'dart', L('slim', '#4ab858', '#f0f4a0', '#e8a830', 'dashes', '#f4f488')),
  fish('walleye', 'Walleye', ['lake'], 4, 120, 35, 80, 0.55, 'sinker', L('standard', '#d8b83a', '#fff4c0', '#c89828', 'mottle', '#6a5018'), { times: ['dusk', 'night'] }),
  fish('moonfin', 'Moonfin', ['lake'], 1.5, 260, 20, 45, 0.7, 'floater', L('deep', '#8a78f0', '#e8d8ff', '#c0a8ff', 'stars', '#fff8a0'), { times: ['night'] }),
  fish('glowfin', 'Glowfin', ['lake'], 0.8, 420, 25, 60, 0.8, 'floater', L('standard', '#20e0c0', '#c8fff0', '#6affe0', 'glow', '#ffffe0'), { times: ['night'] }),
  fish('sturgeon', 'Sturgeon', ['lake'], 0.5, 600, 100, 220, 0.85, 'sinker', L('slim', '#7088b0', '#e8ecf8', '#4a608a', 'scutes', '#c8d4f0', { whiskers: true }), { times: ['day'] }),

  // ---- Frostwater Lake ------------------------------------------------------------------------------------
  fish('whitefish', 'Whitefish', ['frost'], 8, 100, 30, 65, 0.35, 'calm', L('standard', '#c8d8e0', '#ffffff', '#a8b8c8', 'scales', '#8aa0b0')),
  fish('arctic_char', 'Arctic Char', ['frost'], 6, 150, 25, 70, 0.45, 'dart', L('standard', '#4a7a8a', '#ff9a5a', '#ff7a3a', 'spots', '#ffe8c8')),
  fish('lake_trout', 'Lake Trout', ['frost'], 3, 280, 50, 120, 0.65, 'sinker', L('standard', '#6a8a7a', '#e8e8d0', '#5a7a6a', 'spots', '#d8e8c0')),
  fish('frostfin', 'Frostfin', ['frost'], 1.8, 200, 20, 50, 0.6, 'floater', L('standard', '#88d8ff', '#ffffff', '#e8f8ff', 'frost', '#ffffff', { accent2: '#58a8f0' }), { weather: ['snow'] }),

  // ---- Sunset Harbour -------------------------------------------------------------------------------------
  fish('sardine', 'Sardine', ['harbour'], 10, 30, 10, 25, 0.15, 'calm', L('slim', '#7aa8c8', '#f0f4f8', '#98b8d0', 'spots', '#1a3a6a')),
  fish('herring', 'Herring', ['harbour'], 9, 40, 15, 35, 0.2, 'dart', L('slim', '#88b8d8', '#ffffff', '#6a98c0', 'stripe', '#3a6a98')),
  fish('mackerel', 'Mackerel', ['harbour'], 7, 70, 25, 60, 0.35, 'dart', L('slim', '#3aa8a0', '#e8f4f0', '#2a8880', 'band', '#1a3a4a')),
  fish('flounder', 'Flounder', ['harbour'], 5, 110, 25, 70, 0.3, 'sinker', L('flat', '#b8985a', '#e8dcc0', '#a88848', 'spots', '#ff9a4a', { accent2: '#5a3a1a' })),
  fish('sea_bass', 'Sea Bass', ['harbour'], 4, 150, 35, 100, 0.5, 'sinker', L('standard', '#7a98b8', '#e8f0f8', '#5a789a', 'scales', '#4a6888')),
  fish('red_snapper', 'Red Snapper', ['harbour'], 3, 210, 30, 90, 0.55, 'dart', L('standard', '#f04a4a', '#ffc8b8', '#d82a3a', 'scales', '#ff9a8a')),
  fish('tuna', 'Tuna', ['harbour'], 0.7, 700, 100, 250, 0.8, 'dart', L('standard', '#2a58b8', '#e0e8f8', '#f0d838', 'stripe', '#f0d838'), { times: ['dawn', 'dusk'] }),

  // ---- Coral Reef -----------------------------------------------------------------------------------------
  fish('clownfish', 'Clownfish', ['reef'], 9, 300, 6, 12, 0.3, 'floater', L('deep', '#ff7a1a', '#ffa84a', '#ff6a0a', 'bars', '#ffffff')),
  fish('blue_tang', 'Blue Tang', ['reef'], 8, 280, 12, 30, 0.35, 'floater', L('deep', '#2a78e8', '#3a98f8', '#ffd82a', 'band', '#1a2a6a')),
  fish('angelfish', 'Angelfish', ['reef'], 6, 360, 12, 30, 0.4, 'floater', L('deep', '#ffe85a', '#fffae0', '#5ab8ff', 'bars', '#2a78d8')),
  fish('parrotfish', 'Parrotfish', ['reef'], 5, 420, 30, 90, 0.5, 'sinker', L('standard', '#38d8a8', '#ff9ad8', '#a878f8', 'scales', '#ff6ac8')),
  fish('lionfish', 'Lionfish', ['reef'], 3, 500, 20, 45, 0.55, 'dart', L('standard', '#f08a5a', '#ffe8d0', '#ffb87a', 'bars', '#7a2a1a')),
  fish('pufferfish', 'Pufferfish', ['reef', 'harbour'], 4, 260, 15, 45, 0.45, 'floater', L('round', '#e8d878', '#fffbe0', '#f0b858', 'spots', '#8a6a2a')),
  fish('moray', 'Moray Eel', ['reef', 'deep'], 2, 650, 80, 200, 0.7, 'dart', L('eel', '#8a9a2a', '#f0e8a0', '#6a7a1a', 'spots', '#ffd82a'), { times: ['dusk', 'night'] }),
  fish('barracuda', 'Barracuda', ['reef'], 0.8, 800, 70, 180, 0.75, 'dart', L('slim', '#8aa8b8', '#f0f4f8', '#6a8898', 'dashes', '#2a3a48')),

  // ---- Starfall Deep --------------------------------------------------------------------------------------
  fish('lanternfish', 'Lanternfish', ['deep'], 9, 600, 5, 15, 0.5, 'floater', L('standard', '#2a3a8a', '#6a88e8', '#1a2a6a', 'glow', '#5affff')),
  fish('viperfish', 'Viperfish', ['deep'], 5, 1100, 20, 50, 0.65, 'dart', L('slim', '#1a4a5a', '#5aa8a8', '#0a2a3a', 'glow', '#7affc8')),
  fish('anglerfish', 'Anglerfish', ['deep'], 2.5, 1400, 30, 120, 0.8, 'sinker', L('deep', '#5a3a6a', '#8a5a8a', '#3a2a4a', 'glow', '#fff070', { lure: true })),
  fish('swordfish', 'Swordfish', ['deep'], 1, 2200, 150, 450, 0.9, 'dart', L('slim', '#3a5ab8', '#d8e0f0', '#2a3a88', 'stripe', '#8aa8f8', { bill: true })),
  fish('oarfish', 'Oarfish', ['deep'], 0.25, 3000, 200, 800, 0.95, 'floater', L('eel', '#c8d8e8', '#f8f8ff', '#ff3a4a', 'spots', '#8aa8c8'), { times: ['night'] }),
];

const byId = new Map(FISH.map((f) => [f.id, f]));

export function getFish(id: string): FishDef {
  const f = byId.get(id);
  if (!f) throw new Error(`unknown fish: ${id}`);
  return f;
}
