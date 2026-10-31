// The tackle box: one pull-up with tabs for the bucket, shop, map, aquarium and fish log.
import { BAIT_PACK, BUCKET_CAPACITY, BUCKET_COST, BUCKET_LEVEL, FISH_GOLD_AT, FISH_SILVER_AT, QUALITY_PRICE_MULT } from '../data/balance';
import { FISH, getFish } from '../data/fish';
import { BAITS, DECOR, LINES, REELS, RODS, TANKS } from '../data/gear';
import { LOCATIONS } from '../data/locations';
import type { FishDef } from '../data/types';
import type { Game } from '../game';
import { aquariumValue, tipMultiplier, tipRate } from '../sim/aquarium';
import { bucketCapacity, sellValue, sizeThresholds } from '../sim/fishing';
import { levelOf } from '../sim/progress';
import type { FishItem } from '../sim/state';
import { AquariumView } from './aquariumView';
import { fmt, h } from './dom';
import { fishIcon } from './icons';
import type { Modals } from './modal';

export type TabId = 'bucket' | 'shop' | 'map' | 'aquarium' | 'log';

const TABS: { id: TabId; label: string; key: string }[] = [
  { id: 'bucket', label: 'Bucket', key: 'B' },
  { id: 'shop', label: 'Shop', key: 'S' },
  { id: 'map', label: 'Places', key: 'M' },
  { id: 'aquarium', label: 'Aquarium', key: 'A' },
  { id: 'log', label: 'Fish Log', key: 'L' },
];

const SIZE_LABEL = ['Normal', 'Silver ★', 'Gold ★★'];
const SIZE_CLASS = ['', 'q-silver', 'q-gold'];
const bonus = (q: number): number => Math.round((QUALITY_PRICE_MULT[q] - 1) * 100);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export class TackleBox {
  private tab: TabId = 'bucket';
  private tank = 0;
  private readonly view = new AquariumView();
  /** called with a message when a command fails */
  onFail: (reason: string) => void = () => {};

  constructor(private readonly game: Game, private readonly modals: Modals) {}

  get open(): boolean {
    return this.modals.isOpen('box');
  }

  /** Open on a tab; pressing the same tab's key again closes it. */
  toggle(tab: TabId): void {
    if (this.open) {
      if (this.tab === tab) this.modals.close('box');
      else {
        this.tab = tab;
        this.modals.refresh(false);
      }
      return;
    }
    if (this.modals.open) return;
    this.tab = tab;
    this.modals.show({ id: 'box', title: 'Tackle Box', wide: true, render: () => this.render() });
  }

  private act(cmd: Parameters<Game['send']>[0]): void {
    const r = this.game.send(cmd);
    if (!r.ok) this.onFail(r.reason);
  }

  private render(): HTMLElement {
    const tabs = h('div.book-tabs', TABS.map((t) =>
      h(`button.tab${t.id === this.tab ? '.on' : ''}`, { title: `${t.label} (${t.key})`, onclick: () => { this.tab = t.id; this.modals.refresh(false); } }, t.label, h('span.keyhint', t.key))));
    const body = { bucket: () => this.bucket(), shop: () => this.shop(), map: () => this.places(), aquarium: () => this.aquarium(), log: () => this.log() }[this.tab]();
    return h('div.book', tabs, body);
  }

  // ---- bucket -----------------------------------------------------------------------------------------------
  private fishRow(f: FishItem, actions: HTMLElement[]): HTMLElement {
    const def = getFish(f.species);
    return h('div.fish-entry',
      h('img.fish-icon', { src: fishIcon(f.species), draggable: 'false' }),
      h('div.grow',
        h('div.b', def.name, f.q ? h(`span.arc.${SIZE_CLASS[f.q]}`, SIZE_LABEL[f.q]) : null),
        h('div.small.muted', `${f.cm} cm · sells ${fmt(sellValue(f.species, f.q))}g${f.q ? ` (+${bonus(f.q)}%)` : ''}`)),
      h('div.actions', actions));
  }

  private bucket(): HTMLElement {
    const s = this.game.state;
    const total = s.bucket.reduce((a, f) => a + sellValue(f.species, f.q), 0);
    const list = s.bucket.map((f) =>
      this.fishRow(f, [
        h('button.primary', { onclick: () => this.act({ type: 'sell', uid: f.uid }) }, `Sell ${fmt(sellValue(f.species, f.q))}g`),
        h('button', { onclick: () => this.act({ type: 'keep', uid: f.uid }) }, 'Keep'),
        h('button.ghost', { title: 'Let it go', onclick: () => this.act({ type: 'release', uid: f.uid }) }, 'Release'),
      ]));
    return h('div',
      h('div.summary',
        h('div', h('b', `${s.bucket.length} / ${bucketCapacity(s)}`), ' in the bucket'),
        h('div', 'Worth ', h('b', `${fmt(total)}g`)),
        h('button.primary', { disabled: s.bucket.length === 0, onclick: () => this.act({ type: 'sellBucket' }) }, `Sell all (${fmt(total)}g)`)),
      h('p.muted.small', 'Fish you catch land in the bucket. Sell them for coins, or keep them in the aquarium for tips. A full bucket stops you casting.'),
      h('div.scroll.list', list.length ? list : h('p.muted', 'The bucket is empty. Go catch something!')));
  }

  // ---- shop -------------------------------------------------------------------------------------------------
  private shop(): HTMLElement {
    const s = this.game.state;
    const level = levelOf(s.xp);
    const baitRows = BAITS.map((b) => {
      const owned = s.baits[b.id] ?? 0;
      const locked = level < b.levelReq;
      return h('div.shop-row' + (locked ? '.dim' : ''),
        h('div.grow', h('div.b', b.name, s.bait === b.id ? h('span.arc', 'equipped') : null), h('div.small.muted', `${b.blurb} You have ${owned}.`)),
        locked ? h('span.small.muted', `Level ${b.levelReq}`) : null,
        owned > 0 && s.bait !== b.id ? h('button', { onclick: () => this.act({ type: 'equipBait', id: b.id }) }, 'Equip') : null,
        h('button.primary', { disabled: locked || s.coins < b.cost, onclick: () => this.act({ type: 'buyBait', id: b.id }) }, `${BAIT_PACK} for ${fmt(b.cost)}g`));
    });
    if (s.bait) baitRows.push(h('div.shop-row', h('div.grow', h('span.small.muted', 'Fishing with bait.')), h('button', { onclick: () => this.act({ type: 'equipBait', id: null }) }, 'No bait')));
    const rod = (v: number) => `catch zone ${Math.round(v * 100)}%`;
    const reel = (v: number) => `reels ×${v}`;
    const line = (v: number) => `${Math.round((1 - v) * 100)}% less slipping`;
    const rodRow = (kind: 'rod' | 'reel' | 'line', label: string, desc: (v: number) => string, tiers: typeof RODS) => {
      const i = s.gear[kind];
      const next = tiers[i + 1];
      return h('div.shop-row',
        h('div.grow', h('div.b', `${label}: ${tiers[i].name}`), h('div.small.muted', next ? `Next: ${next.name} (${desc(next.value)}), level ${next.levelReq}` : 'The best there is.')),
        next ? h('button.primary', { disabled: level < next.levelReq || s.coins < next.cost, onclick: () => this.act({ type: 'upgrade', kind }) }, `${fmt(next.cost)}g`) : null);
    };
    const nb = s.gear.bucket + 1;
    const bucketRow = h('div.shop-row',
      h('div.grow', h('div.b', `Bucket: holds ${BUCKET_CAPACITY[s.gear.bucket]}`), h('div.small.muted', nb < BUCKET_CAPACITY.length ? `Next: holds ${BUCKET_CAPACITY[nb]}, level ${BUCKET_LEVEL[nb]}` : 'The biggest bucket.')),
      nb < BUCKET_CAPACITY.length ? h('button.primary', { disabled: level < BUCKET_LEVEL[nb] || s.coins < BUCKET_COST[nb], onclick: () => this.act({ type: 'upgrade', kind: 'bucket' }) }, `${fmt(BUCKET_COST[nb])}g`) : null);
    const nextTank = TANKS[s.tanks.length];
    const tankRow = h('div.shop-row',
      h('div.grow', h('div.b', `Tanks: ${s.tanks.length} of ${TANKS.length}`), h('div.small.muted', nextTank ? `Next: ${nextTank.name}, holds ${nextTank.capacity}, level ${nextTank.levelReq}` : 'You have every tank.')),
      nextTank ? h('button.primary', { disabled: level < nextTank.levelReq || s.coins < nextTank.cost, onclick: () => this.act({ type: 'buyTank' }) }, `${fmt(nextTank.cost)}g`) : null);
    const decorRows = DECOR.map((d) => {
      const own = s.decor.includes(d.id);
      return h('div.shop-row' + (level < d.levelReq && !own ? '.dim' : ''),
        h('div.grow', h('div.b', d.name, own ? h('span.arc', 'owned') : null), h('div.small.muted', `+${Math.round(d.tips * 100)}% aquarium tips · level ${d.levelReq}`)),
        own ? null : h('button.primary', { disabled: level < d.levelReq || s.coins < d.cost, onclick: () => this.act({ type: 'buyDecor', id: d.id }) }, `${fmt(d.cost)}g`));
    });
    return h('div.scroll.list',
      h('div.summary', h('div', h('b', `${fmt(s.coins)}g`), ' to spend'), h('div', `Level ${level}`)),
      h('h3', 'Bait'), baitRows,
      h('h3', 'Tackle'), rodRow('rod', 'Rod', rod, RODS), rodRow('reel', 'Reel', reel, REELS), rodRow('line', 'Line', line, LINES), bucketRow,
      h('h3', 'Aquarium'), tankRow, decorRows);
  }

  // ---- places -----------------------------------------------------------------------------------------------
  private places(): HTMLElement {
    const s = this.game.state;
    const level = levelOf(s.xp);
    return h('div.scroll.list', LOCATIONS.map((l) => {
      const owned = s.unlocked.includes(l.id);
      const here = s.location === l.id;
      const species = FISH.filter((f) => f.where.includes(l.id));
      const found = species.filter((f) => s.log[f.id]).length;
      const need = !owned && level < l.levelReq ? `Needs level ${l.levelReq}` : '';
      return h('div.place' + (here ? '.here' : '') + (!owned && need ? '.dim' : ''),
        h('div.grow',
          h('div.b', l.name, here ? h('span.arc', 'you are here') : null),
          h('div.small', l.blurb),
          h('div.small.muted', `${found} of ${species.length} fish found${owned ? '' : ` · unlock for ${fmt(l.cost)}g${need ? ` · ${need}` : ''}`}`)),
        h('button' + (here ? '' : '.primary'), { disabled: here || (!owned && (level < l.levelReq || s.coins < l.cost)), onclick: () => { this.act({ type: 'travel', to: l.id }); this.modals.close('box'); } }, here ? 'Here' : owned ? 'Go' : `Unlock ${fmt(l.cost)}g`));
    }));
  }

  // ---- aquarium ---------------------------------------------------------------------------------------------
  private aquarium(): HTMLElement {
    const s = this.game.state;
    if (this.tank >= s.tanks.length) this.tank = 0;
    this.view.set(s, this.tank);
    const tank = s.tanks[this.tank];
    const rate = tipRate(s);
    const tabs = h('div.tabs', s.tanks.map((_, k) => h(`button.tab${k === this.tank ? '.on' : ''}`, { onclick: () => { this.tank = k; this.modals.refresh(); } }, TANKS[k].name)));
    const list = tank.fish.map((f) =>
      this.fishRow(f, [
        h('button.primary', { onclick: () => this.act({ type: 'sell', uid: f.uid }) }, `Sell ${fmt(sellValue(f.species, f.q))}g`),
        h('button', { onclick: () => this.act({ type: 'unkeep', uid: f.uid }) }, 'To bucket'),
      ]));
    return h('div',
      tabs,
      this.view.canvas,
      h('div.summary',
        h('div', h('b', `${tank.fish.length} / ${TANKS[this.tank].capacity}`), ' fish in this tank'),
        h('div', 'On show: ', h('b', `${fmt(aquariumValue(s))}g`)),
        h('div', `Tips ×${tipMultiplier(s).toFixed(2)}: ${rate.toFixed(rate < 10 ? 2 : 0)}g/s`),
        h('button.primary', { disabled: s.tips < 1, onclick: () => this.act({ type: 'collectTips' }) }, `Collect ${fmt(Math.floor(s.tips))}g`)),
      h('div.scroll.list.short', list.length ? list : h('p.muted', 'Nothing here yet. Press Keep on a fish in your bucket.')));
  }

  // ---- fish log ---------------------------------------------------------------------------------------------
  private log(): HTMLElement {
    const s = this.game.state;
    const known = FISH.filter((f) => s.log[f.id]);
    const total = known.reduce((a, f) => a + s.log[f.id].caught, 0);
    let longest: { name: string; cm: number } | null = null;
    for (const f of known) if (!longest || s.log[f.id].bestCm > longest.cm) longest = { name: f.name, cm: s.log[f.id].bestCm };
    const entry = (f: FishDef) => {
      const rec = s.log[f.id];
      if (!rec) {
        return h('div.fish-entry.unknown',
          h('img.fish-icon', { src: fishIcon(f.id), draggable: 'false' }),
          h('div.grow', h('div.b', '???'), h('div.small.muted', `Not caught yet. Try ${f.where.map((w) => LOCATIONS.find((l) => l.id === w)!.name).join(' or ')}.`)));
      }
      const t = sizeThresholds(f);
      const frac = Math.min(1, (rec.bestCm - f.minCm) / (f.maxCm - f.minCm));
      const cls = frac >= FISH_GOLD_AT ? 'gold' : frac >= FISH_SILVER_AT ? 'silver' : 'normal';
      const when = [f.times ? f.times.map(cap).join(', ') : 'any time', f.weather ? f.weather.join(' or ') : ''].filter(Boolean).join(' · ');
      return h('div.fish-entry',
        h('img.fish-icon', { src: fishIcon(f.id), draggable: 'false' }),
        h('div.grow',
          h('div.b', f.name, h(`span.arc.${SIZE_CLASS[rec.bestQ]}`, SIZE_LABEL[rec.bestQ])),
          h('div.len-bar', h(`div.len-fill.${cls}`, { style: { width: `${frac * 100}%` } }), h('div.len-mark.silver', { style: { left: `${FISH_SILVER_AT * 100}%` } }), h('div.len-mark.gold', { style: { left: `${FISH_GOLD_AT * 100}%` } })),
          h('div.small', h('b', `${rec.bestCm} cm`), ` longest (range ${f.minCm}–${f.maxCm}) · caught ${rec.caught} (${rec.bySize.join(' / ')} normal/silver/gold) · day ${rec.firstDay + 1}`),
          h('div.small.muted', `${f.where.map((w) => LOCATIONS.find((l) => l.id === w)!.name).join(', ')} · ${when}`),
          h('div.small.muted', `Silver from ${t.silverCm} cm (+${bonus(1)}%), gold from ${t.goldCm} cm (+${bonus(2)}%). Sells ${fmt(f.price)}g / ${fmt(sellValue(f.id, 1))}g / ${fmt(sellValue(f.id, 2))}g.`)));
    };
    const groups = LOCATIONS.map((l) => {
      const list = FISH.filter((f) => f.where[0] === l.id);
      const found = list.filter((f) => s.log[f.id]).length;
      return h('div', h('h3', `${l.name} · ${found}/${list.length}`), list.map(entry));
    });
    return h('div',
      h('div.summary',
        h('div', h('b', `${known.length} / ${FISH.length}`), ' species'),
        h('div', h('b', fmt(total)), ' caught'),
        h('div', h('b', String(s.stats.escaped)), ' got away'),
        h('div', longest ? h('span', 'Longest: ', h('b', `${longest.name}, ${longest.cm} cm`)) : 'No fish yet')),
      h('div.scroll.list', groups));
  }
}
