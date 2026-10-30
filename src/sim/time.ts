// The clock, the part of the day and the weather.
import { DAWN_AT, DAY_AT, DAY_MINUTES, DUSK_AT, NIGHT_AT } from '../data/balance';
import { getLocation } from '../data/locations';
import type { Segment, Weather } from '../data/types';
import { rngWeighted } from './rng';
import type { GameState } from './state';

export function segmentOf(minute: number): Segment {
  if (minute >= DAWN_AT && minute < DAY_AT) return 'dawn';
  if (minute >= DAY_AT && minute < DUSK_AT) return 'day';
  if (minute >= DUSK_AT && minute < NIGHT_AT) return 'dusk';
  return 'night';
}

export function rollWeather(state: GameState): Weather {
  const loc = getLocation(state.location);
  return rngWeighted(state, Object.entries(loc.weather) as [Weather, number][]);
}

/** Advance the clock; a new day rolls the weather. */
export function advanceClock(state: GameState, minutes: number): void {
  state.minute += minutes;
  while (state.minute >= DAY_MINUTES) {
    state.minute -= DAY_MINUTES;
    state.day += 1;
    state.weather = rollWeather(state);
  }
}

/** Jump forward to the start of a part of the day (waiting for the night fish). */
export function skipTo(state: GameState, target: Segment): void {
  const at = { dawn: DAWN_AT, day: DAY_AT, dusk: DUSK_AT, night: NIGHT_AT }[target];
  const wait = (at - state.minute + DAY_MINUTES) % DAY_MINUTES || DAY_MINUTES;
  advanceClock(state, wait);
}

export function clockLabel(minute: number): string {
  const m = Math.floor(minute) % DAY_MINUTES;
  const h = Math.floor(m / 60);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
}
