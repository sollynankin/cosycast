// Saving: the GameState as JSON in localStorage, plus export and import of a file. migrate() fills fields added
// after a save was written and never drops progress.
import { newGame, SAVE_VERSION, type GameState } from './sim/state';

const KEY = 'cosycast.save.v1';

export function migrate(raw: Partial<GameState> & { version?: number }): GameState {
  if (!raw || typeof raw !== 'object' || typeof raw.version !== 'number') throw new Error('Not a Cosy Cast save.');
  if (raw.version > SAVE_VERSION) throw new Error('This save is from a newer version of the game.');
  const fresh = newGame(raw.seed ?? 1);
  const s = raw as GameState;
  for (const k of Object.keys(fresh) as (keyof GameState)[]) {
    if (s[k] === undefined) (s as unknown as Record<string, unknown>)[k] = fresh[k];
  }
  // a cast saved mid-reel is dropped: the line is simply back on the reel
  s.fishing = null;
  s.version = SAVE_VERSION;
  return s;
}

export function saveLocal(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, fishing: null }));
    return true;
  } catch {
    return false;
  }
}

export function loadLocal(): GameState | null {
  try {
    const json = localStorage.getItem(KEY);
    return json ? migrate(JSON.parse(json)) : null;
  } catch {
    return null;
  }
}

export function exportSave(state: GameState): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: 'application/json' }));
  a.download = `cosy-cast-day${state.day + 1}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function importSave(file: File): Promise<GameState> {
  return migrate(JSON.parse(await file.text()));
}
