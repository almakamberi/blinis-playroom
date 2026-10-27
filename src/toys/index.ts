import type { ToyId } from '../settings/schema';
import type { ToyFactory } from './types';
import { bubblePop } from './bubbles';
import { blobBand } from './blobs';
import { splashOfColour } from './paint';
import { shapeFriends } from './shapes';
import { littleGarden } from './garden';
import { countingStars } from './stars';
import { busyBoard } from './busy';
import { plugItIn } from './plugs';
import { homeGadgets } from './gadgets';
import { kitchen } from './kitchen';
import { littleMechanic } from './mechanic';
import { keysAndLocks } from './locks';
import { laundryDay } from './laundry';
import { townRoad } from './town';
import { toolBench } from './tools';
import { remoteControl } from './remote';
import { phoneCall } from './phone';

export const TOY_FACTORIES: Record<ToyId, ToyFactory> = {
  bubbles: bubblePop,
  blobs: blobBand,
  paint: splashOfColour,
  shapes: shapeFriends,
  garden: littleGarden,
  stars: countingStars,
  busy: busyBoard,
  plugs: plugItIn,
  gadgets: homeGadgets,
  kitchen,
  mechanic: littleMechanic,
  locks: keysAndLocks,
  laundry: laundryDay,
  town: townRoad,
  tools: toolBench,
  remote: remoteControl,
  phone: phoneCall,
};
