import { describe, expect, it } from 'vitest';
import { BUCKET_CAPACITY, FISH_SIZE_TIRE_TIME, FISH_TIRE_TICKS, QUALITY_PRICE_MULT, xpForLevel } from '../src/data/balance';
import { FISH, getFish } from '../src/data/fish';
import { BAITS, DECOR, LINES, REELS, RODS, TANKS } from '../src/data/gear';
import { LOCATIONS } from '../src/data/locations';
import { Game } from '../src/game';
import { migrate } from '../src/save';
import { aquariumValue, tickAquarium, tipRate } from '../src/sim/aquarium';
import { applyCommand } from '../src/sim/commands';
import type { SimEvent } from '../src/sim/events';
import { cast, fishAvailable, fishDifficulty, fishFatigue, rollLength, sellValue, sizeClass, sizeThresholds, tickFishing } from '../src/sim/fishing';
import { levelOf } from '../src/sim/progress';
import { newGame, type FishItem, type GameState } from '../src/sim/state';
import { advanceClock, segmentOf, skipTo } from '../src/sim/time';

const run = (s: GameState, cmd: Parameters<typeof applyCommand>[2]) => {
  const ev: SimEvent[] = [];
  return { r: applyCommand(s, ev, cmd), ev };
};

const fish = (s: GameState, species: string, q: 0 | 1 | 2 = 0): FishItem => {
  const f: FishItem = { uid: s.nextUid++, species, cm: 20, q, loc: s.location, day: s.day };
  s.bucket.push(f);
  return f;
};

/** Play the reel mini-game with a simple tracker until it ends. */
function reelIn(s: GameState, ev: SimEvent[]): void {
  for (let t = 0; t < 6000 && s.fishing; t++) {
    const fs = s.fishing;
    if (fs.phase === 'reel') fs.holding = fs.fishPos > fs.zonePos + 0.08;
    tickFishing(s, ev);
  }
}

describe('data', () => {
  it('has 44 fish, each with a place, sane lengths and a look; ids are unique', () => {
    expect(FISH).toHaveLength(44);
    expect(new Set(FISH.map((f) => f.id)).size).toBe(44);
    for (const f of FISH) {
      expect(f.where.length, f.id).toBeGreaterThan(0);
      expect(f.maxCm, f.id).toBeGreaterThan(f.minCm);
      expect(f.price, f.id).toBeGreaterThan(0);
      expect(f.look.body, f.id).not.toBe(f.look.belly);
    }
  });

  it('every location has a good spread of fish, and later places pay more', () => {
    const avg = (id: string) => {
      const list = FISH.filter((f) => f.where.includes(id as never));
      expect(list.length, id).toBeGreaterThanOrEqual(6);
      return list.reduce((a, f) => a + f.price, 0) / list.length;
    };
    const avgs = LOCATIONS.map((l) => avg(l.id));
    expect(avgs[0]).toBeLessThan(avgs[2]);
    expect(avgs[2]).toBeLessThan(avgs[5]);
    expect(avgs[5]).toBeLessThan(avgs[6]);
  });

  it('every place can be fished at some time of day, in some weather', () => {
    const s = newGame();
    for (const loc of LOCATIONS) {
      s.location = loc.id;
      let any = false;
      for (const w of ['clear', 'rain', 'fog', 'snow'] as const) {
        s.weather = w;
        for (const m of [6 * 60, 12 * 60, 18 * 60, 23 * 60]) {
          s.minute = m;
          if (fishAvailable(s).length) any = true;
        }
      }
      expect(any, loc.id).toBe(true);
    }
  });

  it('gear tiers rise in price, level and effect', () => {
    for (const tiers of [RODS, REELS, LINES]) {
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].cost).toBeGreaterThan(tiers[i - 1].cost);
        expect(tiers[i].levelReq).toBeGreaterThanOrEqual(tiers[i - 1].levelReq);
      }
    }
    expect(RODS[5].value).toBeGreaterThan(RODS[0].value);
    expect(REELS[5].value).toBeGreaterThan(REELS[0].value);
    expect(LINES[5].value).toBeLessThan(LINES[0].value);
  });
});

describe('time and weather', () => {
  it('has four parts of the day, a clock that wraps and a skip', () => {
    expect(segmentOf(6 * 60)).toBe('dawn');
    expect(segmentOf(12 * 60)).toBe('day');
    expect(segmentOf(18 * 60)).toBe('dusk');
    expect(segmentOf(23 * 60)).toBe('night');
    expect(segmentOf(2 * 60)).toBe('night');
    const s = newGame();
    s.minute = 23 * 60;
    advanceClock(s, 120);
    expect(s.day).toBe(1);
    expect(s.minute).toBe(60);
    skipTo(s, 'dusk');
    expect(segmentOf(s.minute)).toBe('dusk');
    expect(s.minute).toBe(17 * 60);
  });

  it('only night fish bite at night', () => {
    const s = newGame();
    s.location = 'lake';
    s.minute = 22 * 60;
    expect(fishAvailable(s).map((f) => f.id)).toContain('moonfin');
    s.minute = 12 * 60;
    expect(fishAvailable(s).map((f) => f.id)).not.toContain('moonfin');
  });
});

describe('fishing', () => {
  it('casts, waits for a bite, and a decent player lands a fish into the bucket with a length and a record', () => {
    const s = newGame(7);
    const ev: SimEvent[] = [];
    expect(cast(s, ev).ok).toBe(true);
    expect(s.fishing!.phase).toBe('wait');
    reelIn(s, ev);
    expect(s.fishing).toBeNull();
    const c = ev.find((e) => e.type === 'catch');
    expect(c).toBeTruthy();
    expect(s.bucket).toHaveLength(1);
    const f = s.bucket[0];
    const def = getFish(f.species);
    expect(f.cm).toBeGreaterThanOrEqual(def.minCm);
    expect(f.cm).toBeLessThanOrEqual(def.maxCm);
    expect(s.log[f.species]).toMatchObject({ caught: 1, bestCm: f.cm });
    expect(s.xp).toBeGreaterThan(0);
    expect(s.coins).toBeGreaterThan(20); // discovery bonus
  });

  it('never reeling loses the fish; a fresh fish that slips away is gone', () => {
    const s = newGame(7);
    const ev: SimEvent[] = [];
    cast(s, ev);
    for (let t = 0; t < 3000 && s.fishing; t++) tickFishing(s, ev);
    expect(ev.some((e) => e.type === 'escape')).toBe(true);
    expect(s.bucket).toHaveLength(0);
  });

  it('a hooked fish tires: one that never breaks loose is landed once spent', () => {
    const s = newGame(3);
    const ev: SimEvent[] = [];
    cast(s, ev);
    const fs = s.fishing!;
    fs.phase = 'reel';
    const limit = Math.ceil(FISH_TIRE_TICKS * (1 + fs.size * FISH_SIZE_TIRE_TIME)) + 2;
    let ticks = 0;
    while (s.fishing && ticks < limit + 20) {
      s.fishing.progress = Math.max(s.fishing.progress, 0.4);
      tickFishing(s, ev);
      ticks++;
    }
    expect(ticks).toBeLessThanOrEqual(limit);
    expect(ev.some((e) => e.type === 'catch' && e.wornOut)).toBe(true);
    expect(fishFatigue({ reelTicks: 150, size: 1 })).toBeLessThan(fishFatigue({ reelTicks: 150, size: 0 }));
  });

  it('bigger fish are harder and a longer fish is a bigger size class', () => {
    for (const f of FISH) {
      expect(fishDifficulty(f, 1)).toBeGreaterThan(fishDifficulty(f, 0));
      const t = sizeThresholds(f);
      expect(t.silverCm).toBeLessThan(t.goldCm);
    }
    expect(sizeClass(0.3)).toBe(0);
    expect(sizeClass(0.7)).toBe(1);
    expect(sizeClass(0.9)).toBe(2);
    const s = newGame();
    for (let k = 0; k < 50; k++) {
      const { lenCm } = rollLength(s, FISH[0]);
      expect(lenCm).toBeGreaterThanOrEqual(FISH[0].minCm);
      expect(lenCm).toBeLessThanOrEqual(FISH[0].maxCm);
    }
  });

  it('better gear catches more easily: a bigger zone fills the meter in the same conditions', () => {
    const gain = (rod: number, reel: number) => {
      const s = newGame();
      s.gear.rod = rod;
      s.gear.reel = reel;
      s.fishing = { phase: 'reel', biteIn: 0, species: 'perch', fishPos: 0.5, fishVel: 0, zonePos: 0.4, zoneVel: 0, progress: 0.3, holding: false, retarget: 99, fishTarget: 0.5, lenCm: 20, size: 0.3, difficulty: 0.2, reelTicks: 0 };
      tickFishing(s, []);
      return s.fishing ? s.fishing.progress - 0.3 : 1;
    };
    expect(gain(0, 5)).toBeGreaterThan(gain(0, 0));
  });

  it('bait rolls rarer, bigger fish and bites sooner; it is used up', () => {
    const s = newGame(5);
    s.xp = xpForLevel(12);
    s.baits.golden = 2;
    s.bait = 'golden';
    cast(s, []);
    expect(s.baits.golden).toBe(1);
    expect(s.fishing!.biteIn).toBeLessThan(45 * 0.6 + 1);
    expect(BAITS.map((b) => b.id)).toContain('golden');
  });

  it('is deterministic: the same seed and play give the same fish', () => {
    const play = () => {
      const s = newGame(11);
      const ev: SimEvent[] = [];
      for (let k = 0; k < 5; k++) {
        cast(s, ev);
        reelIn(s, ev);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });
});

describe('selling, buying and the bucket', () => {
  it('sells fish at the size-class price and empties the bucket', () => {
    const s = newGame();
    const a = fish(s, 'pike', 2);
    fish(s, 'perch', 0);
    const coins = s.coins;
    expect(run(s, { type: 'sell', uid: a.uid }).r.ok).toBe(true);
    expect(s.coins - coins).toBe(Math.round(getFish('pike').price * QUALITY_PRICE_MULT[2]));
    expect(sellValue('pike', 2)).toBeGreaterThan(sellValue('pike', 0));
    expect(run(s, { type: 'sellBucket' }).r.ok).toBe(true);
    expect(s.bucket).toHaveLength(0);
    expect(run(s, { type: 'sellBucket' }).r.ok).toBe(false);
    expect(s.stats.sold).toBe(2);
  });

  it('a full bucket blocks casting until you sell or keep something', () => {
    const s = newGame();
    for (let k = 0; k < BUCKET_CAPACITY[0]; k++) fish(s, 'minnow');
    expect(run(s, { type: 'cast' }).r.ok).toBe(false);
    run(s, { type: 'sellBucket' });
    expect(run(s, { type: 'cast' }).r.ok).toBe(true);
  });

  it('upgrades need the level and the coins, and the next tier does what it says', () => {
    const s = newGame();
    s.coins = 1000;
    expect(run(s, { type: 'upgrade', kind: 'rod' }).r.ok).toBe(false); // level 1
    s.xp = xpForLevel(3);
    expect(levelOf(s.xp)).toBe(3);
    expect(run(s, { type: 'upgrade', kind: 'rod' }).r.ok).toBe(true);
    expect(s.gear.rod).toBe(1);
    expect(s.coins).toBe(1000 - RODS[1].cost);
    s.coins = 0;
    expect(run(s, { type: 'upgrade', kind: 'reel' }).r.ok).toBe(false);
  });

  it('bait packs are bought, auto-equipped and need a level', () => {
    const s = newGame();
    s.coins = 500;
    expect(run(s, { type: 'buyBait', id: 'shrimp' }).r.ok).toBe(false);
    expect(run(s, { type: 'buyBait', id: 'worm' }).r.ok).toBe(true);
    expect(s.baits.worm).toBe(10);
    expect(s.bait).toBe('worm');
    expect(run(s, { type: 'equipBait', id: 'dough' }).r.ok).toBe(false);
  });

  it('new places unlock with level and coins on the first visit, then are free', () => {
    const s = newGame();
    s.coins = 100000;
    expect(run(s, { type: 'travel', to: 'brook' }).r.ok).toBe(false); // level 3
    s.xp = xpForLevel(3);
    const before = s.coins;
    expect(run(s, { type: 'travel', to: 'brook' }).r.ok).toBe(true);
    expect(s.location).toBe('brook');
    expect(before - s.coins).toBe(LOCATIONS[1].cost);
    run(s, { type: 'travel', to: 'pond' });
    const again = s.coins;
    run(s, { type: 'travel', to: 'brook' });
    expect(s.coins).toBe(again);
  });
});

describe('aquarium', () => {
  it('keeps fish up to the tank size, shows their value, and pays tips that decor increases', () => {
    const s = newGame();
    const cap = TANKS[0].capacity;
    s.bucket = [];
    for (let k = 0; k < cap + 1; k++) fish(s, 'koi', 2);
    for (const f of [...s.bucket]) run(s, { type: 'keep', uid: f.uid });
    expect(s.tanks[0].fish).toHaveLength(cap);
    expect(s.bucket).toHaveLength(1);
    expect(run(s, { type: 'keep', uid: s.bucket[0].uid }).r.ok).toBe(false); // full
    expect(aquariumValue(s)).toBe(cap * sellValue('koi', 2));
    const base = tipRate(s);
    expect(base).toBeGreaterThan(0);
    s.decor.push(DECOR[0].id);
    expect(tipRate(s)).toBeCloseTo(base * (1 + DECOR[0].tips), 6);
    tickAquarium(s, 600);
    const coins = s.coins;
    expect(run(s, { type: 'collectTips' }).r.ok).toBe(true);
    expect(s.coins).toBeGreaterThan(coins);
    expect(run(s, { type: 'collectTips' }).r.ok).toBe(false);
  });

  it('kept fish can be sold or taken back to the bucket, and tips are capped', () => {
    const s = newGame();
    const f = fish(s, 'carp');
    run(s, { type: 'keep', uid: f.uid });
    expect(run(s, { type: 'unkeep', uid: f.uid }).r.ok).toBe(true);
    run(s, { type: 'keep', uid: f.uid });
    expect(run(s, { type: 'sell', uid: f.uid }).r.ok).toBe(true);
    expect(s.tanks[0].fish).toHaveLength(0);
    for (let k = 0; k < 3; k++) {
      const g = fish(s, 'koi', 2);
      run(s, { type: 'keep', uid: g.uid });
    }
    tickAquarium(s, 100000);
    expect(s.tips).toBeLessThanOrEqual(tipRate(s) * 1800 + 1e-9);
  });
});

describe('progress and saves', () => {
  it('levels rise with XP and a level-up event fires', () => {
    expect(levelOf(0)).toBe(1);
    expect(levelOf(xpForLevel(10))).toBe(10);
    expect(levelOf(1e12)).toBe(30);
    const s = newGame(2);
    const ev: SimEvent[] = [];
    let ups = 0;
    for (let k = 0; k < 40; k++) {
      cast(s, ev);
      reelIn(s, ev);
      s.bucket = [];
      ups += ev.filter((e) => e.type === 'levelup').length;
      ev.length = 0;
    }
    expect(ups).toBeGreaterThan(0);
  });

  it('a save survives JSON and the migration fills missing fields', () => {
    const s = newGame(9);
    s.coins = 1234;
    s.log.perch = { caught: 2, bestCm: 30, bestQ: 1, bySize: [1, 1, 0], firstDay: 0 };
    const back = migrate(JSON.parse(JSON.stringify(s)));
    expect(back.coins).toBe(1234);
    expect(back.log.perch.bestCm).toBe(30);
    const old = JSON.parse(JSON.stringify(s));
    delete old.tips;
    delete old.decor;
    const fixed = migrate(old);
    expect(fixed.tips).toBe(0);
    expect(fixed.decor).toEqual([]);
    expect(() => migrate({} as never)).toThrow();
  });

  it('the Game loop runs the clock and fishing, and passes events to listeners', () => {
    const g = new Game(newGame(7));
    const seen: string[] = [];
    g.on((e) => seen.push(e.type));
    expect(g.send({ type: 'cast' }).ok).toBe(true);
    const m0 = g.state.minute;
    for (let k = 0; k < 90; k++) g.advance(0.1);
    expect(g.state.minute).toBeGreaterThan(m0);
    expect(seen).toContain('cast');
    expect(seen).toContain('bite');
    g.paused = true;
    const m1 = g.state.minute;
    for (let k = 0; k < 10; k++) g.advance(0.1);
    expect(g.state.minute).toBe(m1);
  });
});
