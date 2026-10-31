// All held-down input in one place: the mouse, fingers and the Space bar. A press during the reel phase holds the
// reel for as long as it stays down; a press while idle casts. Presses on buttons and panels are left to the buttons.
// Nothing here touches the DOM except to listen, and holding never causes a panel redraw (see Game.hold).
import type { Game } from '../game';

export interface ControlHooks {
  /** a panel (or the catch card) is open: the picture ignores presses */
  modalOpen: () => boolean;
  /** cast the line (shows the reason when it fails) */
  cast: () => void;
  unlockAudio: () => void;
}

/** Elements that keep their own presses: buttons and panels. The reel button is the exception: holding it reels. */
const OWN_PRESS = 'button:not(.reel-btn), .modal, .modal-backdrop, a, input, select';

export class Controls {
  /** pointers currently holding the reel */
  private readonly pointers = new Set<number>();
  private keyHeld = false;
  private lastHold = false;

  constructor(private readonly game: Game, private readonly hooks: ControlHooks) {
    window.addEventListener('pointerdown', (e) => this.pointerDown(e));
    window.addEventListener('pointerup', (e) => this.pointerUp(e.pointerId));
    window.addEventListener('pointercancel', (e) => this.pointerUp(e.pointerId));
    window.addEventListener('blur', () => this.releaseAll());
    document.addEventListener('visibilitychange', () => this.releaseAll());
    // a long press must never open the browser's context menu: it cancels the touch and drops the reel
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    // a button that keeps focus would eat the next Space press as a click
    document.addEventListener('click', (e) => (e.target as HTMLElement).closest?.('button')?.blur());
  }

  get reeling(): boolean {
    return this.game.state.fishing?.phase === 'reel';
  }

  private pointerDown(e: PointerEvent): void {
    this.hooks.unlockAudio();
    if (e.button > 0 && e.pointerType === 'mouse') return;
    if (this.hooks.modalOpen()) return;
    if ((e.target as HTMLElement).closest?.(OWN_PRESS)) return;
    const fs = this.game.state.fishing;
    if (!fs) this.hooks.cast();
    else if (fs.phase === 'reel') {
      this.pointers.add(e.pointerId);
      this.sync();
    }
    // while waiting for a bite a press does nothing: you have to react to the bite
  }

  private pointerUp(id: number): void {
    this.hooks.unlockAudio();
    this.pointers.delete(id);
    this.sync();
  }

  keyDown(): void {
    if (this.reeling) {
      this.keyHeld = true;
      this.sync();
    }
  }

  keyUp(): void {
    this.keyHeld = false;
    this.sync();
  }

  releaseAll(): void {
    this.pointers.clear();
    this.keyHeld = false;
    this.sync();
  }

  /** Push the held state to the game; called on every press and release and once per frame. */
  sync(): void {
    // a hold only means something during the reel phase; anything left over from a finished fish is dropped
    if (!this.reeling) {
      this.pointers.clear();
      this.keyHeld = false;
    }
    const want = this.pointers.size > 0 || this.keyHeld;
    if (want !== this.lastHold) {
      this.lastHold = want;
      this.game.hold(want);
    }
  }
}
