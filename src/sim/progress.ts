// Levels and XP.
import { MAX_LEVEL, xpForLevel } from '../data/balance';
import type { SimEvent } from './events';
import type { GameState } from './state';

export function levelOf(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

/** Level, XP into this level and XP needed for the next (need is 0 at the top level). */
export function xpProgress(xp: number): { level: number; into: number; need: number } {
  const level = levelOf(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0 };
  return { level, into: xp - xpForLevel(level), need: xpForLevel(level + 1) - xpForLevel(level) };
}

export function addXp(state: GameState, ev: SimEvent[], amount: number): void {
  const before = levelOf(state.xp);
  state.xp += amount;
  const after = levelOf(state.xp);
  for (let l = before + 1; l <= after; l++) ev.push({ type: 'levelup', level: l });
}
