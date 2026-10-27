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
};
