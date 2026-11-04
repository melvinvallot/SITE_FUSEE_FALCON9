import { createContext, useContext } from 'react';

/** Options d'un vaisseau de décor : le vaisseau lunaire n'a pas de volets, les vaisseaux de décor pas de satellites rangés. */
export interface ShipVariant {
  flaps: boolean;
  /** Tuiles du bouclier thermique (absentes sur le vaisseau lunaire, qui ne rentre jamais dans l'atmosphère). */
  shield: boolean;
  /** Satellites rangés dans la soute (animés par la page « La soute »). */
  payload: boolean;
}

const DEFAULT: ShipVariant = { flaps: true, shield: true, payload: true };

export const ShipVariantContext = createContext<ShipVariant>(DEFAULT);

export const useShipVariant = (): ShipVariant => useContext(ShipVariantContext);
