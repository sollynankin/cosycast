// Every way the player changes the game goes through a command. Commands return a Result with a reason for
// the UI instead of throwing.
import type { LocationId, Segment } from '../data/types';
import { collectTips, keepFish, releaseFish, unkeepFish } from './aquarium';
import { buyBait, buyDecor, buyTank, equipBait, sellBucket, sellFish, travel, upgradeGear, type GearKind } from './economy';
import { OK, fail, type Result, type SimEvent } from './events';
import { bucketCapacity, cast, reel, stopFishing } from './fishing';
import type { GameState } from './state';
import { skipTo } from './time';

export type Command =
  | { type: 'cast' }
  | { type: 'reel'; hold: boolean }
  | { type: 'stopFishing' }
  | { type: 'sell'; uid: number }
  | { type: 'sellBucket' }
  | { type: 'keep'; uid: number; tank?: number }
  | { type: 'unkeep'; uid: number }
  | { type: 'release'; uid: number }
  | { type: 'buyBait'; id: string }
  | { type: 'equipBait'; id: string | null }
  | { type: 'upgrade'; kind: GearKind }
  | { type: 'buyTank' }
  | { type: 'buyDecor'; id: string }
  | { type: 'travel'; to: LocationId }
  | { type: 'collectTips' }
  | { type: 'skipTo'; segment: Segment };

export function applyCommand(state: GameState, ev: SimEvent[], cmd: Command): Result {
  switch (cmd.type) {
    case 'cast':
      return cast(state, ev);
    case 'reel':
      reel(state, cmd.hold);
      return OK;
    case 'stopFishing':
      stopFishing(state);
      return OK;
    case 'sell':
      return sellFish(state, ev, cmd.uid);
    case 'sellBucket':
      return sellBucket(state, ev);
    case 'keep':
      return keepFish(state, cmd.uid, cmd.tank);
    case 'unkeep':
      return unkeepFish(state, cmd.uid, bucketCapacity(state));
    case 'release':
      return releaseFish(state, cmd.uid);
    case 'buyBait':
      return buyBait(state, ev, cmd.id);
    case 'equipBait':
      return equipBait(state, cmd.id);
    case 'upgrade':
      return upgradeGear(state, ev, cmd.kind);
    case 'buyTank':
      return buyTank(state, ev);
    case 'buyDecor':
      return buyDecor(state, ev, cmd.id);
    case 'travel':
      return travel(state, ev, cmd.to);
    case 'collectTips':
      return collectTips(state);
    case 'skipTo':
      if (state.fishing) return fail('Reel in first.');
      skipTo(state, cmd.segment);
      return OK;
  }
}
