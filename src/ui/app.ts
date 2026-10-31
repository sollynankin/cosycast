// UI controller: keys in, sim events out to sound, vibration, toasts, the picture and the catch card.
import { BUCKET_LEVEL } from '../data/balance';
import { BAITS, DECOR, LINES, REELS, RODS, TANKS } from '../data/gear';
import { LOCATIONS } from '../data/locations';
import type { Game } from '../game';
import type { SimEvent } from '../sim/events';
import { Audio } from './audio';
import { CatchCard } from './catchCard';
import { Controls } from './controls';
import { Hud } from './hud';
import { Modals } from './modal';
import { TackleBox, type TabId } from './panels';
import type { Scene } from './scene';

/** What a new level unlocks, for the level-up toast. */
function unlocksAt(level: number): string[] {
  const out: string[] = [];
  for (const l of LOCATIONS) if (l.levelReq === level && l.cost > 0) out.push(`${l.name} (a new place)`);
  for (const [label, tiers] of [['rod', RODS], ['reel', REELS], ['line', LINES]] as const) for (const t of tiers) if (t.levelReq === level && t.cost > 0) out.push(`${t.name} (${label})`);
  for (const b of BAITS) if (b.levelReq === level && b.levelReq > 1) out.push(`${b.name} bait`);
  for (const t of TANKS) if (t.levelReq === level && t.cost > 0) out.push(t.name);
  for (const d of DECOR) if (d.levelReq === level) out.push(d.name);
  if (BUCKET_LEVEL.includes(level) && level > 1) out.push('a bigger bucket');
  return out;
}

const KEY_TABS: Record<string, TabId> = { b: 'bucket', s: 'shop', m: 'map', a: 'aquarium', l: 'log' };
const MUTE_KEY = 'cosycatch.muted';

/** A short buzz on phones that support it. */
function buzz(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // some browsers refuse without a recent tap
  }
}

export class App {
  readonly hud: Hud;
  readonly modals: Modals;
  readonly box: TackleBox;
  readonly card: CatchCard;
  readonly controls: Controls;
  private lastTick = 0;

  constructor(root: HTMLElement, private readonly game: Game, private readonly scene: Scene, readonly audio: Audio) {
    this.hud = new Hud(root, game);
    this.modals = new Modals(root, game);
    this.box = new TackleBox(game, this.modals);
    this.card = new CatchCard(game, this.modals, () => this.cast());
    this.controls = new Controls(game, { modalOpen: () => this.modals.open, cast: () => this.cast(), unlockAudio: () => audio.unlock() });
    this.box.onFail = (r) => this.hud.toast(r, 'warn');
    this.hud.onCast = () => this.cast();
    this.hud.onStop = () => this.game.send({ type: 'stopFishing' });
    this.hud.onOpen = (tab) => this.openBox(tab);
    this.hud.onSkip = (seg) => {
      const r = this.game.send({ type: 'skipTo', segment: seg });
      if (!r.ok) this.hud.toast(r.reason, 'warn');
    };
    try {
      audio.muted = localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      // storage blocked: sound stays on
    }
    this.hud.setMuted(audio.muted);
    this.hud.onSound = () => {
      audio.muted = !audio.muted;
      this.hud.setMuted(audio.muted);
      try {
        localStorage.setItem(MUTE_KEY, audio.muted ? '1' : '0');
      } catch {
        // ignore
      }
    };
    game.on((e) => this.onEvent(e));
    window.addEventListener('keydown', (e) => this.keyDown(e));
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') this.controls.keyUp();
    });
  }

  /** Once per frame: keep the held reel in step, and tick while the fish is on target. */
  frame(): void {
    this.controls.sync();
    const fs = this.game.state.fishing;
    if (fs?.phase === 'reel' && fs.holding) {
      const now = performance.now();
      if (now - this.lastTick > 140) {
        this.lastTick = now;
        this.audio.tick(fs.progress);
      }
    }
  }

  cast(): void {
    this.audio.unlock();
    const r = this.game.send({ type: 'cast' });
    if (!r.ok) {
      this.hud.toast(r.reason, 'warn');
      buzz(30);
    }
  }

  private openBox(tab: TabId): void {
    this.audio.unlock();
    if (this.game.state.fishing && !this.box.open) {
      this.hud.toast('Reel in first.', 'warn');
      return;
    }
    this.box.toggle(tab);
  }

  private keyDown(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    this.audio.unlock();
    const k = e.key.toLowerCase();
    if (e.code === 'Space') {
      e.preventDefault();
      if (e.repeat) return;
      if (this.card.open) {
        this.modals.close('catch');
        return;
      }
      if (this.modals.open) return;
      if (this.game.state.fishing) this.controls.keyDown();
      else this.cast();
      return;
    }
    if (e.repeat) return;
    if (k === 'escape') {
      if (!this.modals.closeTop() && this.game.state.fishing?.phase === 'wait') this.game.send({ type: 'stopFishing' });
      return;
    }
    if (KEY_TABS[k] && !this.card.open) this.openBox(KEY_TABS[k]);
  }

  private onEvent(e: SimEvent): void {
    switch (e.type) {
      case 'cast':
        this.audio.play('cast');
        this.scene.splash(0.6);
        buzz(15);
        break;
      case 'bite':
        this.audio.play('bite');
        this.scene.shake(1);
        this.hud.toast('A bite! Press now to set the hook!', 'good');
        buzz([70, 40, 110]);
        break;
      case 'hook':
        this.audio.play('hook');
        this.hud.toast('Perfect hook! Head start.', 'good');
        buzz(40);
        break;
      case 'escape':
        this.audio.play('escape');
        this.hud.toast('It got away…', 'warn');
        buzz(260);
        break;
      case 'catch':
        this.scene.splash(1.6);
        this.audio.play(e.fish.q === 2 || e.discovered ? 'rare' : 'catch');
        this.card.show(e);
        buzz(e.fish.q === 2 || e.discovered ? [60, 50, 60, 50, 140] : [60, 40, 90]);
        break;
      case 'levelup': {
        this.audio.play('levelup');
        this.hud.toast(`Level ${e.level}!`, 'good');
        const un = unlocksAt(e.level);
        if (un.length) this.hud.toast(`Unlocked: ${un.join(', ')}`, 'good');
        break;
      }
      case 'sell':
        this.audio.play('sell');
        this.hud.toast(`Sold for ${e.coins.toLocaleString('en-US')}g`);
        break;
      case 'buy':
        this.audio.play('buy');
        break;
      case 'toast':
        this.hud.toast(e.text);
        break;
    }
  }
}
