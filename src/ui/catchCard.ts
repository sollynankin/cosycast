// The reveal. While reeling you only see a plain fish; once it is landed the real fish pops up here with its art,
// name, length, size class and what it is worth, and you choose: sell it, keep it for the aquarium, or leave it in the bucket.
import { FISH_GOLD_AT, FISH_SILVER_AT, QUALITY_PRICE_MULT } from '../data/balance';
import { getFish } from '../data/fish';
import type { Game } from '../game';
import { sellValue } from '../sim/fishing';
import type { SimEvent } from '../sim/events';
import { bucketCapacity } from '../sim/fishing';
import { fmt, h } from './dom';
import { fishIcon } from './icons';
import type { Modals } from './modal';

type CatchEvent = Extract<SimEvent, { type: 'catch' }>;

const SIZE_LABEL = ['', 'Silver size ★', 'Gold size ★★'];

export class CatchCard {
  constructor(private readonly game: Game, private readonly modals: Modals) {}

  get open(): boolean {
    return this.modals.isOpen('catch');
  }

  show(e: CatchEvent): void {
    const f = e.fish;
    const def = getFish(f.species);
    const bonus = Math.round((QUALITY_PRICE_MULT[f.q] - 1) * 100);
    const frac = (f.cm - def.minCm) / (def.maxCm - def.minCm);
    this.modals.show({
      id: 'catch',
      title: '',
      bare: true,
      still: true,
      render: () => {
        const s = this.game.state;
        const still = s.bucket.some((b) => b.uid === f.uid);
        const full = s.bucket.length >= bucketCapacity(s);
        const close = () => this.modals.close('catch');
        return h('div.catch-card' + (f.q === 2 ? '.gold' : f.q === 1 ? '.silver' : ''),
          e.discovered ? h('div.catch-new', `New species! +${fmt(e.bonus)}g`) : null,
          h('img.catch-art', { src: fishIcon(f.species), draggable: 'false' }),
          h('div.catch-name', def.name),
          h('div.catch-len', `${f.cm} cm`, h('span.catch-range', ` of ${def.minCm}–${def.maxCm}`)),
          f.q ? h(`div.catch-size.${f.q === 2 ? 'gold' : 'silver'}`, `${SIZE_LABEL[f.q]} · +${bonus}% price`) : frac < FISH_SILVER_AT ? null : null,
          e.record && !e.discovered ? h('div.catch-record', 'New personal best!') : null,
          e.wornOut ? h('div.small.muted', 'It tired itself out.') : null,
          h('div.small.muted', `+${fmt(e.xp)} XP${frac >= FISH_GOLD_AT ? ' · a giant!' : ''}`),
          still
            ? h('div.catch-actions',
                h('button.primary', { onclick: () => { this.game.send({ type: 'sell', uid: f.uid }); close(); } }, `Sell ${fmt(sellValue(f.species, f.q))}g`),
                h('button', { onclick: () => { this.game.send({ type: 'keep', uid: f.uid }); close(); } }, 'Keep'),
                h('button.ghost', { onclick: close }, 'Bucket'))
            : h('div.catch-actions', h('button', { onclick: close }, 'Done')),
          full && still ? h('div.small.warn', 'The bucket is full: sell or keep this one to keep fishing.') : null);
      },
    });
  }
}
