// Every number in the game. Logic and tables read from here.

// ---- Time ---------------------------------------------------------------------------------------------
export const TICK_HZ = 10;
/** game minutes per real second */
export const MINUTES_PER_SECOND = 1.5;
export const DAY_MINUTES = 24 * 60;
/** segment boundaries, minutes since midnight */
export const DAWN_AT = 5 * 60;
export const DAY_AT = 8 * 60;
export const DUSK_AT = 17 * 60;
export const NIGHT_AT = 20 * 60;
export const START_MINUTE = 7 * 60;

// ---- Fishing (the catch mini-game: positions are 0..1 along the bar) ---------------------------------------
export const BITE_MIN_TICKS = 20;
export const BITE_MAX_TICKS = 70;
export const FISH_ZONE_LIFT = 0.012;
export const FISH_ZONE_GRAVITY = 0.008;
export const FISH_ZONE_DAMP = 0.86;
export const FISH_START_PROGRESS = 0.3;
export const FISH_CATCH_RATE = 0.014;
/**
 * Setting the hook: press to reel within PERFECT_HOOK_TICKS of the bite and the meter jumps by PERFECT_HOOK_BONUS
 * (and the catch earns PERFECT_HOOK_XP times the XP). A late press still works, just without the head start.
 */
export const PERFECT_HOOK_TICKS = 8;
export const PERFECT_HOOK_BONUS = 0.15;
export const PERFECT_HOOK_XP = 1.25;
export const FISH_DRAIN_RATE = 0.011;
/** a bigger fish takes longer to reel in: catch rate is divided by 1 + size × this */
export const FISH_SIZE_REEL_TIME = 0.8;

/**
 * Fish sizes. A catch rolls a length fraction `size` in 0..1 of its species range: roll^SKEW (small fish are common)
 * plus bonuses. Size decides the size class (the quality): silver and gold sell for a bonus. Bigger fish are
 * harder: difficulty moves by (size − 0.5) × FISH_SIZE_DIFFICULTY.
 */
export const FISH_LENGTH_SKEW = 1.8;
export const FISH_LENGTH_LEVEL_BONUS = 0.006;
export const FISH_SILVER_AT = 0.6;
export const FISH_GOLD_AT = 0.85;
export const FISH_SIZE_DIFFICULTY = 0.45;
export const QUALITY_PRICE_MULT = [1, 1.25, 1.5];

/**
 * A hooked fish tires. Fatigue grows with the ticks spent reeling (FISH_TIRE_TICKS, longer for big fish). As it
 * tires the fish swims slower, the meter fills faster and drains less; at full fatigue a fish that has not broken
 * loose is landed.
 */
export const FISH_TIRE_TICKS = 240;
export const FISH_SIZE_TIRE_TIME = 0.6;
export const FISH_TIRE_SLOWDOWN = 0.7;
export const FISH_TIRE_CATCH_BOOST = 1.5;
export const FISH_TIRE_DRAIN_RELIEF = 0.8;

/** spawn weights below this count as "rare" for baits */
export const RARE_BELOW = 3;

// ---- Progression --------------------------------------------------------------------------------------------
export const MAX_LEVEL = 30;
/** cumulative XP to reach level n */
export const xpForLevel = (n: number): number => (n <= 1 ? 0 : Math.round(40 * (n - 1) ** 1.8));
/** XP for a catch: 3 + price^0.62 × (1 + difficulty), × 1 / 1.4 / 1.9 by size class */
export const XP_PRICE_POWER = 0.62;
export const XP_QUALITY_MULT = [1, 1.4, 1.9];
/** the first catch of a species pays this many times its price in XP and in coins */
export const DISCOVERY_XP_MULT = 3;
export const DISCOVERY_COIN_MULT = 1;

// ---- Economy and gear -------------------------------------------------------------------------------------
export const START_COINS = 20;
export const BAIT_PACK = 10;
/** bucket (live well) capacity by upgrade level, and what each upgrade costs */
export const BUCKET_CAPACITY = [6, 8, 10, 12, 15, 20];
export const BUCKET_COST = [0, 100, 500, 2500, 10000, 40000];
export const BUCKET_LEVEL = [1, 2, 6, 10, 15, 21];

// ---- Aquarium -------------------------------------------------------------------------------------------
/** coins of tips per second per coin of fish value on show, before decor */
export const AQUARIUM_TIP_RATE = 0.0002;
/** tips stop piling up after this many seconds away */
export const AQUARIUM_TIP_CAP_SECONDS = 1800;
