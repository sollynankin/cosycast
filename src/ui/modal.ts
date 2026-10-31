// One stack of modal panels. A re-render rebuilds the top panel from state whenever the game changes.
import type { Game } from '../game';
import { clear, h } from './dom';

/** a scroll counts as over when no scroll event has come for this long (a fling keeps firing them) */
const SCROLL_IDLE_MS = 160;

export interface ModalSpec {
  id: string;
  title: string;
  render: () => HTMLElement;
  wide?: boolean;
  onClose?: () => void;
  /** no title bar or close button (the catch card) */
  bare?: boolean;
  /** never redrawn by the game changing (the catch card keeps its animation; it closes itself) */
  still?: boolean;
}

export class Modals {
  private stack: { spec: ModalSpec; el: HTMLElement; body: HTMLElement }[] = [];
  /** a finger or mouse button is down: redrawing now would replace the button being pressed and lose its click */
  private pressed = false;
  private pressedAt = 0;
  private dirty = false;
  /** the next redraw may keep the scroll positions; a tab switch asks for a fresh top */
  private keepScroll = true;
  /** until this time a scroll is under way (a drag or a fling): rebuilding the list now would stop it dead */
  private scrollingUntil = 0;
  private timer = 0;

  constructor(private readonly root: HTMLElement, private readonly game: Game) {
    game.onChange(() => this.refresh());
    root.addEventListener('pointerdown', () => {
      this.pressed = true;
      this.pressedAt = performance.now();
    }, true);
    // scroll events do not bubble, but they can be caught on the way down
    root.addEventListener('scroll', () => {
      this.scrollingUntil = performance.now() + SCROLL_IDLE_MS;
    }, true);
    const release = () => {
      this.pressed = false;
      // let the click that follows the release run first, then catch up on any redraw we held back
      if (this.dirty) this.later(0);
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
  }

  private later(ms: number): void {
    if (this.timer) return;
    this.timer = window.setTimeout(() => {
      this.timer = 0;
      if (this.dirty) this.refresh();
    }, ms);
  }

  get open(): boolean {
    return this.stack.length > 0;
  }

  get top(): string | null {
    return this.stack.length ? this.stack[this.stack.length - 1].spec.id : null;
  }

  isOpen(id: string): boolean {
    return this.stack.some((m) => m.spec.id === id);
  }

  show(spec: ModalSpec): void {
    this.close(spec.id);
    const body = h('div.modal-body');
    const head = spec.bare ? null : h('div.modal-head', h('h2', spec.title), h('button.close', { title: 'Close (Esc)', onclick: () => this.close(spec.id) }, '✕'));
    const panel = h(`div.modal${spec.wide ? '.wide' : ''}${spec.bare ? '.bare' : ''}`, head, body);
    const el = h('div.modal-backdrop', { onmousedown: (e: MouseEvent) => { if (e.target === el) this.close(spec.id); } }, panel);
    this.root.appendChild(el);
    this.stack.push({ spec, el, body });
    this.game.paused = true;
    clear(body).appendChild(spec.render());
  }

  close(id?: string): void {
    const i = id ? this.stack.findIndex((m) => m.spec.id === id) : this.stack.length - 1;
    if (i < 0) return;
    const [m] = this.stack.splice(i, 1);
    m.el.remove();
    this.game.paused = this.stack.length > 0;
    m.spec.onClose?.();
  }

  /** a full-screen-style panel is open, so the picture behind it is not worth drawing on a phone */
  get covering(): boolean {
    return this.stack.some((m) => !m.spec.bare);
  }

  closeTop(): boolean {
    if (!this.stack.length) return false;
    this.close(this.stack[this.stack.length - 1].spec.id);
    return true;
  }

  /** Rebuild the open panels from state. `keepScroll = false` starts them at the top (a different tab). */
  refresh(keepScroll = true): void {
    this.keepScroll = this.keepScroll && keepScroll;
    const now = performance.now();
    // a release we never saw (a drag off the screen) must not freeze the panels for good
    if (this.pressed && now - this.pressedAt > 2500) this.pressed = false;
    // a fresh tab is a deliberate tap, so only passive redraws wait for a scroll to settle
    const scrolling = keepScroll && now < this.scrollingUntil;
    if (this.pressed || scrolling) {
      this.dirty = true;
      this.later(scrolling ? SCROLL_IDLE_MS : 60);
      return;
    }
    this.dirty = false;
    const keep = this.keepScroll;
    this.keepScroll = true;
    for (const m of this.stack) {
      if (m.spec.still) continue;
      // on a phone the whole body scrolls; on a big screen the lists inside it do
      const lists = Array.from(m.body.querySelectorAll('.scroll'));
      const tops = keep ? [m.body.scrollTop, ...lists.map((l) => l.scrollTop)] : [];
      clear(m.body).appendChild(m.spec.render());
      if (!keep) {
        m.body.scrollTop = 0;
        continue;
      }
      m.body.scrollTop = tops[0];
      m.body.querySelectorAll('.scroll').forEach((l, i) => {
        if (i < lists.length) l.scrollTop = tops[i + 1];
      });
    }
  }
}
