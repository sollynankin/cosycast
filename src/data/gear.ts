// Gear, bait, tanks and decor. Prices rise with the fish you can reach: later tiers are for later places.
import type { BaitDef, DecorDef, GearTier, TankDef } from './types';

/** Rod: value is the catch zone's share of the bar (bigger is easier). */
export const RODS: GearTier[] = [
  { name: 'Twig Rod', levelReq: 1, cost: 0, value: 0.24 },
  { name: 'Bamboo Rod', levelReq: 3, cost: 200, value: 0.28 },
  { name: 'Fibreglass Rod', levelReq: 7, cost: 900, value: 0.33 },
  { name: 'Carbon Rod', levelReq: 11, cost: 3500, value: 0.38 },
  { name: 'Master Rod', levelReq: 16, cost: 14000, value: 0.44 },
  { name: 'Starlight Rod', levelReq: 22, cost: 50000, value: 0.5 },
];

/** Reel: value multiplies how fast the catch meter fills. */
export const REELS: GearTier[] = [
  { name: 'Wooden Reel', levelReq: 1, cost: 0, value: 1 },
  { name: 'Brass Reel', levelReq: 2, cost: 150, value: 1.15 },
  { name: 'Ball-Bearing Reel', levelReq: 6, cost: 700, value: 1.3 },
  { name: 'Pro Reel', levelReq: 10, cost: 2800, value: 1.5 },
  { name: 'Gold Reel', levelReq: 15, cost: 11000, value: 1.75 },
  { name: 'Aether Reel', levelReq: 21, cost: 40000, value: 2 },
];

/** Line: value multiplies how fast the meter drains when the fish slips out of the zone (smaller is better). */
export const LINES: GearTier[] = [
  { name: 'Cotton Line', levelReq: 1, cost: 0, value: 1 },
  { name: 'Nylon Line', levelReq: 2, cost: 120, value: 0.88 },
  { name: 'Braided Line', levelReq: 5, cost: 600, value: 0.76 },
  { name: 'Fluoro Line', levelReq: 9, cost: 2400, value: 0.65 },
  { name: 'Spider-silk Line', levelReq: 13, cost: 9000, value: 0.55 },
  { name: 'Moonthread Line', levelReq: 19, cost: 32000, value: 0.45 },
];

export const BAITS: BaitDef[] = [
  { id: 'worm', name: 'Worm', blurb: 'Fish bite sooner.', levelReq: 1, cost: 30, biteMult: 0.7, sizeBonus: 0, rareMult: 1 },
  { id: 'dough', name: 'Dough Ball', blurb: 'Slightly bigger fish, and a bit faster.', levelReq: 3, cost: 60, biteMult: 0.9, sizeBonus: 0.06, rareMult: 1 },
  { id: 'shrimp', name: 'Shrimp', blurb: 'Rarer fish take an interest.', levelReq: 7, cost: 150, biteMult: 0.85, sizeBonus: 0.05, rareMult: 1.7 },
  { id: 'glowlure', name: 'Glow Lure', blurb: 'A shimmering lure that draws rare fish.', levelReq: 12, cost: 400, biteMult: 0.8, sizeBonus: 0.08, rareMult: 2.6 },
  { id: 'golden', name: 'Golden Lure', blurb: 'Big, rare and quick. Very expensive.', levelReq: 18, cost: 1200, biteMult: 0.6, sizeBonus: 0.15, rareMult: 3.5 },
];

export const TANKS: TankDef[] = [
  { name: 'Starter Tank', levelReq: 1, cost: 0, capacity: 6 },
  { name: 'Reef Tank', levelReq: 6, cost: 800, capacity: 8 },
  { name: 'Show Tank', levelReq: 12, cost: 4000, capacity: 10 },
  { name: 'Grand Aquarium', levelReq: 18, cost: 16000, capacity: 12 },
];

export const DECOR: DecorDef[] = [
  { id: 'seaweed', name: 'Swaying Seaweed', levelReq: 2, cost: 150, tips: 0.1 },
  { id: 'bubbles', name: 'Bubble Stream', levelReq: 5, cost: 400, tips: 0.1 },
  { id: 'castle', name: 'Sunken Castle', levelReq: 9, cost: 1500, tips: 0.15 },
  { id: 'lamp', name: 'Glow Lamp', levelReq: 13, cost: 4000, tips: 0.15 },
  { id: 'treasure', name: 'Treasure Chest', levelReq: 17, cost: 12000, tips: 0.2 },
  { id: 'coral', name: 'Coral Garden', levelReq: 22, cost: 30000, tips: 0.25 },
];
