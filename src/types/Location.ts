/* Type imports ---------------------------------------- */
import type { Coords } from './Coords';

/* Location interface declaration ---------------------- */
export interface Location {
  name: string;
  coords?: Coords;
  addressStr?: string;
}
