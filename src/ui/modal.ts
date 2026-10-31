// One stack of modal panels. A re-render rebuilds the top panel from state whenever the game changes.
import type { Game } from '../game';
import { clear, h } from './dom';

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

  constructor(private readonly root: HTMLElement, private readonly game: Game) {
    game.onChange(() => this.refresh());
    root.addEventListener('pointerdown', () => {
      this.pressed = true;
      this.pressedAt = performance.now();
    }, true);
    const release = () => {
      this.pressed = false;
      // let the click that follows the release run first, then catch up on any redraw we held back
      if (this.dirty) setTimeout(() => this.refresh(), 0);
    };
    window.addEventListener('pointerup', release, true);
    window.addEventListener('pointercancel', release, true);
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

  closeTop(): boolean {
    if (!this.stack.length) return false;
    this.close(this.stack[this.stack.length - 1].spec.id);
    return true;
  }

  refresh(): void {
    // a release we never saw (a drag off the screen) must not freeze the panels for good
    if (this.pressed && performance.now() - this.pressedAt > 2500) this.pressed = false;
    if (this.pressed) {
      this.dirty = true;
      return;
    }
    this.dirty = false;
    for (const m of this.stack) {
      if (m.spec.still) continue;
      const scroll = m.body.querySelector('.scroll')?.scrollTop ?? 0;
      clear(m.body).appendChild(m.spec.render());
      const sc = m.body.querySelector('.scroll');
      if (sc) sc.scrollTop = scroll;
    }
  }
}
