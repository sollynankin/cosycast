// The always-on layer: coins and level, place and clock, the cast button and bait, the reel bar and toasts.
// Every element is created once and only updated afterwards. Replacing a button between a press and its release
// loses the click, which is what made the old HUD feel broken.
import { getLocation } from '../data/locations';
import { BAITS, RODS } from '../data/gear';
import type { Game } from '../game';
import { bucketCapacity, fishFatigue } from '../sim/fishing';
import { xpProgress } from '../sim/progress';
import { clockLabel, segmentOf } from '../sim/time';
import { fmt, h } from './dom';
import { fishIcon } from './icons';

const WEATHER_ICON: Record<string, string> = { clear: '☀', rain: '🌧', fog: '🌫', snow: '❄' };
const SEGMENT_ICON: Record<string, string> = { dawn: '🌅', day: '☀', dusk: '🌇', night: '🌙' };
const SEGMENTS = ['dawn', 'day', 'dusk', 'night'] as const;

/** Set text only when it changed, so idle frames touch nothing. */
function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

function setClass(el: HTMLElement, cls: string, on: boolean): void {
  if (el.classList.contains(cls) !== on) el.classList.toggle(cls, on);
}

export class Hud {
  // top left
  private readonly coinsText = h('span');
  private readonly levelName = h('div.b');
  private readonly xpFill = h('div');
  private readonly xpText = h('div.small');
  // top right
  private readonly placeName = h('div.b');
  private readonly placeSub = h('div.small');
  private readonly bucketBtn = h('button', { title: 'Bucket (B)' });
  private readonly shopBtn = h('button', { title: 'Shop (S)' }, '🛒');
  private readonly mapBtn = h('button', { title: 'Places (M)' }, '🗺');
  private readonly aquaBtn = h('button', { title: 'Aquarium (A)' }, '🐠');
  private readonly logBtn = h('button', { title: 'Fish log (L)' }, '📖');
  private readonly soundBtn = h('button', { title: 'Sound on / off' }, '🔊');
  private readonly skipBtns = SEGMENTS.map((k) => h('button', { title: `Skip to ${k}` }, SEGMENT_ICON[k]) as HTMLButtonElement);
  // bottom
  private readonly castBtn = h('button.cast') as HTMLButtonElement;
  private readonly castLabel = h('span');
  private readonly hintA = h('div.small.hint');
  private readonly hintB = h('div.small.hint');
  // the reel bar
  private readonly reelLabel = h('div.fish-label');
  private readonly zone = h('div.fish-zone');
  private readonly marker = h('img.fish-marker', { src: fishIcon(null), draggable: 'false' });
  private readonly bar = h('div.fish-bar', this.zone, this.marker);
  private readonly meterFill = h('div');
  private readonly meter = h('div.fish-meter', this.meterFill);
  private readonly reel = h('div.fishing', this.reelLabel, h('div.fish-row', this.bar, this.meter));
  /** a big thumb target for touch screens: hold it to reel (the whole picture works too) */
  private readonly reelBtn = h('button.reel-btn', 'HOLD TO REEL');
  private readonly toasts = h('div.toasts');
  private readonly bottom = h('div.hud-bottom', this.castBtn, this.hintA, this.hintB);

  onCast: () => void = () => {};
  onOpen: (tab: 'bucket' | 'shop' | 'map' | 'aquarium' | 'log') => void = () => {};
  onSkip: (seg: 'dawn' | 'day' | 'dusk' | 'night') => void = () => {};
  onStop: () => void = () => {};
  onSound: () => void = () => {};

  constructor(root: HTMLElement, private readonly game: Game) {
    this.castBtn.append(this.castLabel, h('span.keyhint', 'Space'));
    this.castBtn.onclick = () => (this.game.state.fishing ? this.onStop() : this.onCast());
    this.bucketBtn.onclick = () => this.onOpen('bucket');
    this.shopBtn.onclick = () => this.onOpen('shop');
    this.mapBtn.onclick = () => this.onOpen('map');
    this.aquaBtn.onclick = () => this.onOpen('aquarium');
    this.logBtn.onclick = () => this.onOpen('log');
    this.soundBtn.onclick = () => this.onSound();
    this.skipBtns.forEach((b, i) => (b.onclick = () => this.onSkip(SEGMENTS[i])));
    root.append(
      h('div.hud-top',
        h('div.pill.coins', h('span.coin'), this.coinsText),
        h('div.pill.level', this.levelName, h('div.xp', this.xpFill), this.xpText)),
      h('div.hud-right',
        h('div.pill.place', this.placeName, this.placeSub),
        h('div.hud-buttons', this.bucketBtn, this.shopBtn, this.mapBtn, this.aquaBtn, this.logBtn, this.soundBtn),
        h('div.hud-buttons.skip', h('span.small', 'Wait for'), this.skipBtns)),
      this.bottom,
      this.reel,
      this.reelBtn,
      this.toasts,
    );
    this.reel.style.display = 'none';
    this.reelBtn.style.display = 'none';
  }

  toast(text: string, cls = ''): void {
    const t = h('div.toast' + (cls ? `.${cls}` : ''), text);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.classList.add('fade'), 2800);
    setTimeout(() => t.remove(), 3500);
  }

  setMuted(muted: boolean): void {
    setText(this.soundBtn, muted ? '🔇' : '🔊');
  }

  /** Called every frame. */
  render(): void {
    const s = this.game.state;
    const fs = s.fishing;
    const prog = xpProgress(s.xp);
    const loc = getLocation(s.location);
    const seg = segmentOf(s.minute);

    setText(this.coinsText, fmt(s.coins));
    setText(this.levelName, `Level ${prog.level}`);
    this.xpFill.style.width = `${prog.need ? (prog.into / prog.need) * 100 : 100}%`;
    setText(this.xpText, prog.need ? `${fmt(prog.into)} / ${fmt(prog.need)} XP` : 'Max level');
    setText(this.placeName, loc.name);
    setText(this.placeSub, `${SEGMENT_ICON[seg]} ${clockLabel(s.minute)} · ${WEATHER_ICON[s.weather] ?? ''} ${s.weather}`);
    const full = s.bucket.length >= bucketCapacity(s);
    setText(this.bucketBtn, `🪣 ${s.bucket.length}/${bucketCapacity(s)}`);
    setClass(this.bucketBtn, 'warn', full);
    setClass(this.aquaBtn, 'glow', s.tips >= 1);
    for (const b of this.skipBtns) b.disabled = !!fs;

    const bait = BAITS.find((b) => b.id === s.bait);
    setText(this.castLabel, !fs ? 'Cast' : fs.phase === 'wait' ? 'Reel in' : 'Reeling!');
    this.castBtn.disabled = fs?.phase === 'reel';
    setClass(this.castBtn, 'busy', !!fs);
    setText(this.hintA, fs?.phase === 'wait' ? 'Waiting for a bite…' : fs ? 'Press and hold to raise the net' : full ? 'Bucket full: sell or keep a fish' : bait ? `Bait: ${bait.name} ×${s.baits[bait.id] ?? 0}` : 'No bait: buy some in the shop');
    setText(this.hintB, RODS[s.gear.rod].name);

    // reel bar (moves every frame)
    const reeling = fs?.phase === 'reel';
    setClass(this.bottom, 'reeling', !!reeling);
    this.reel.style.display = reeling ? '' : 'none';
    this.reelBtn.style.display = reeling ? '' : 'none';
    if (!fs || !reeling) return;
    const size = RODS[s.gear.rod].value;
    const tired = fishFatigue(fs);
    const big = fs.size >= 0.85 ? 'HUGE! ' : fs.size >= 0.6 ? 'Big one! ' : '';
    setText(this.reelLabel, tired > 0.85 ? 'Nearly spent!' : tired > 0.5 ? `${big}It is tiring` : `${big}Hold to raise`);
    this.zone.style.bottom = `${fs.zonePos * 100}%`;
    this.zone.style.height = `${size * 100}%`;
    this.marker.style.bottom = `calc(${fs.fishPos * 100}% - 14px)`;
    this.marker.style.opacity = String(1 - tired * 0.35);
    this.marker.style.transform = `rotate(${tired * 25}deg)`;
    const inside = fs.fishPos >= fs.zonePos && fs.fishPos <= fs.zonePos + size;
    setClass(this.zone, 'hit', inside);
    // the meter turns red and pulses when the fish is about to get away
    setClass(this.meter, 'danger', fs.progress < 0.2);
    setClass(this.bar, 'danger', fs.progress < 0.2 && !inside);
    setClass(this.reelBtn, 'down', fs.holding);
    this.meterFill.style.height = `${Math.max(0, fs.progress) * 100}%`;
  }
}
