// The always-on layer: coins and level, place and clock, the cast button and bait, the reel bar and toasts.
import { getLocation } from '../data/locations';
import { BAITS, RODS } from '../data/gear';
import type { Game } from '../game';
import { fishFatigue, bucketCapacity } from '../sim/fishing';
import { xpProgress } from '../sim/progress';
import { clockLabel, segmentOf } from '../sim/time';
import { fmt, h, clear } from './dom';
import { fishIcon } from './icons';

const WEATHER_ICON: Record<string, string> = { clear: '☀', rain: '🌧', fog: '🌫', snow: '❄' };
const SEGMENT_ICON: Record<string, string> = { dawn: '🌅', day: '☀', dusk: '🌇', night: '🌙' };

export class Hud {
  private readonly top = h('div.hud-top');
  private readonly right = h('div.hud-right');
  private readonly bottom = h('div.hud-bottom');
  private readonly toasts = h('div.toasts');
  // the reel bar: a long thin column with a plain fish marker, and a label
  private readonly reelLabel = h('div.fish-label');
  private readonly zone = h('div.fish-zone');
  private readonly marker = h('img.fish-marker', { src: fishIcon(null), draggable: 'false' });
  private readonly bar = h('div.fish-bar', this.zone, this.marker);
  private readonly meterFill = h('div');
  private readonly meter = h('div.fish-meter', this.meterFill);
  private readonly reel = h('div.fishing', this.reelLabel, h('div.fish-row', this.bar, this.meter));
  private sig = '';

  onCast: () => void = () => {};
  onOpen: (tab: 'bucket' | 'shop' | 'map' | 'aquarium' | 'log') => void = () => {};
  onSkip: (seg: 'dawn' | 'day' | 'dusk' | 'night') => void = () => {};
  onStop: () => void = () => {};

  constructor(root: HTMLElement, private readonly game: Game) {
    this.reel.style.display = 'none';
    root.append(this.top, this.right, this.bottom, this.reel, this.toasts);
  }

  toast(text: string, cls = ''): void {
    const t = h('div.toast' + (cls ? `.${cls}` : ''), text);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.classList.add('fade'), 2800);
    setTimeout(() => t.remove(), 3500);
  }

  render(): void {
    const s = this.game.state;
    const fs = s.fishing;
    const prog = xpProgress(s.xp);
    const seg = segmentOf(s.minute);
    const sig = [s.coins, s.xp, s.location, Math.floor(s.minute / 5), s.weather, fs?.phase ?? '-', s.bucket.length, s.bait, s.baits[s.bait ?? ''] ?? 0, s.tips > 1 ? 1 : 0, s.gear.bucket].join('|');
    if (sig !== this.sig) {
      this.sig = sig;
      const loc = getLocation(s.location);
      clear(this.top).append(
        h('div.pill.coins', h('span.coin'), fmt(s.coins)),
        h('div.pill.level', h('div.b', `Level ${prog.level}`), h('div.xp', h('div', { style: { width: `${prog.need ? (prog.into / prog.need) * 100 : 100}%` } })), h('div.small', prog.need ? `${fmt(prog.into)} / ${fmt(prog.need)} XP` : 'Max level')),
      );
      clear(this.right).append(
        h('div.pill.place', h('div.b', loc.name), h('div.small', `${SEGMENT_ICON[seg]} ${clockLabel(s.minute)} · ${WEATHER_ICON[s.weather] ?? ''} ${s.weather}`)),
        h('div.hud-buttons',
          h('button', { title: 'Bucket (B)', onclick: () => this.onOpen('bucket') }, `🪣 ${s.bucket.length}/${bucketCapacity(s)}`),
          h('button', { title: 'Shop (S)', onclick: () => this.onOpen('shop') }, '🛒'),
          h('button', { title: 'Places (M)', onclick: () => this.onOpen('map') }, '🗺'),
          h(`button${s.tips >= 1 ? '.glow' : ''}`, { title: 'Aquarium (A)', onclick: () => this.onOpen('aquarium') }, '🐠'),
          h('button', { title: 'Fish log (L)', onclick: () => this.onOpen('log') }, '📖')),
        h('div.hud-buttons.skip', h('span.small', 'Wait for'), (['dawn', 'day', 'dusk', 'night'] as const).map((k) => h('button', { title: `Skip to ${k}`, disabled: !!fs, onclick: () => this.onSkip(k) }, SEGMENT_ICON[k]))),
      );
      const bait = BAITS.find((b) => b.id === s.bait);
      const label = !fs ? 'Cast' : fs.phase === 'wait' ? 'Waiting…' : 'Reeling!';
      clear(this.bottom).append(
        h('button.cast' + (fs ? '.busy' : ''), { disabled: fs?.phase === 'reel', onclick: () => (fs ? this.onStop() : this.onCast()) }, fs ? (fs.phase === 'wait' ? 'Reel in' : label) : 'Cast', h('span.keyhint', 'Space')),
        h('div.small.hint', fs?.phase === 'wait' ? 'Waiting for a bite… (a fish is on its way)' : fs ? 'Hold Space or the mouse to raise the net' : bait ? `Bait: ${bait.name} ×${s.baits[bait.id] ?? 0}` : 'No bait: buy some in the shop'),
        h('div.small.hint', `${RODS[s.gear.rod].name}`),
      );
    }

    // reel bar (updated every frame: it moves)
    if (!fs || fs.phase !== 'reel') {
      this.reel.style.display = 'none';
      return;
    }
    this.reel.style.display = '';
    const size = RODS[s.gear.rod].value;
    const tired = fishFatigue(fs);
    const big = fs.size >= 0.85 ? 'HUGE! ' : fs.size >= 0.6 ? 'Big one! ' : '';
    this.reelLabel.textContent = tired > 0.85 ? 'Nearly spent!' : tired > 0.5 ? `${big}It is tiring` : `${big}Hold to raise`;
    this.zone.style.bottom = `${fs.zonePos * 100}%`;
    this.zone.style.height = `${size * 100}%`;
    this.marker.style.bottom = `calc(${fs.fishPos * 100}% - 14px)`;
    this.marker.style.opacity = String(1 - tired * 0.35);
    this.marker.style.transform = `rotate(${tired * 25}deg)`;
    this.zone.classList.toggle('hit', fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size);
    this.meterFill.style.height = `${Math.max(0, fs.progress) * 100}%`;
  }
}
