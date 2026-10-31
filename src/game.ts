// The game loop: a fixed 10 Hz tick over the pure sim, a command queue, and an event stream for the UI.
import { MINUTES_PER_SECOND, TICK_HZ } from './data/balance';
import { tickAquarium } from './sim/aquarium';
import { applyCommand, type Command } from './sim/commands';
import type { Result, SimEvent } from './sim/events';
import { reel, tickFishing } from './sim/fishing';
import { newGame, type GameState } from './sim/state';
import { advanceClock } from './sim/time';

type Listener = (e: SimEvent) => void;

export class Game {
  state: GameState;
  private acc = 0;
  private readonly listeners: Listener[] = [];
  private readonly changeListeners: (() => void)[] = [];
  /** modal panels pause the clock (but not the fishing) */
  paused = false;
  /** whole coins of aquarium tips last announced, so panels redraw when the number you can collect changes */
  private tipsShown = 0;

  constructor(state: GameState = newGame(1)) {
    this.state = state;
  }

  on(l: Listener): void {
    this.listeners.push(l);
  }

  onChange(l: () => void): void {
    this.changeListeners.push(l);
  }

  load(state: GameState): void {
    this.state = state;
    this.emitChange();
  }

  /**
   * Press or release the reel. This is held input, not a game change: it must never make panels redraw (a redraw
   * between a button's press and release throws the button away and loses the click).
   */
  hold(on: boolean): void {
    reel(this.state, on);
  }

  /** Run a command now. Events and the result come back at once. */
  send(cmd: Command): Result {
    const ev: SimEvent[] = [];
    const r = applyCommand(this.state, ev, cmd);
    this.flush(ev);
    if (cmd.type !== 'reel') this.emitChange();
    return r;
  }

  /** Advance real time by dt seconds; the sim steps in fixed ticks. */
  advance(dt: number): void {
    this.acc += Math.min(dt, 0.25);
    const tickLen = 1 / TICK_HZ;
    const ev: SimEvent[] = [];
    while (this.acc >= tickLen) {
      this.acc -= tickLen;
      tickFishing(this.state, ev);
      tickAquarium(this.state, tickLen);
      // the world clock keeps running while you fish, but not while a panel is open
      if (!this.paused) advanceClock(this.state, MINUTES_PER_SECOND * tickLen);
    }
    if (ev.length) this.flush(ev);
    // Panels redraw on commands and events, and when the collectable tips tick over: not on every tick.
    const tips = Math.floor(this.state.tips);
    if (ev.length || tips !== this.tipsShown) {
      this.tipsShown = tips;
      this.emitChange();
    }
  }

  private flush(ev: SimEvent[]): void {
    for (const e of ev) for (const l of this.listeners) l(e);
  }

  private emitChange(): void {
    for (const l of this.changeListeners) l();
  }
}
