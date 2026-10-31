// What the sim tells the UI. The sim never touches the DOM; the game layer drains these each frame.
import type { FishItem } from './state';

export type SimEvent =
  | { type: 'toast'; text: string }
  | { type: 'cast' }
  | { type: 'bite' }
  | { type: 'hook' }
  | { type: 'escape' }
  | { type: 'catch'; fish: FishItem; record: boolean; discovered: boolean; xp: number; bonus: number; wornOut: boolean; perfect: boolean }
  | { type: 'levelup'; level: number }
  | { type: 'sell'; coins: number }
  | { type: 'buy' };

export type Result = { ok: true } | { ok: false; reason: string };
export const OK: Result = { ok: true };
export const fail = (reason: string): Result => ({ ok: false, reason });
