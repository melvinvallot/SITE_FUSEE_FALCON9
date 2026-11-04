import { ShipBody } from './parts/ShipBody';
import { ShipEngines } from './parts/ShipEngines';
import { ShipNose } from './parts/ShipNose';
import { LAYOUT, RADIUS } from '../../data/layout';
import { useMaterials } from './materials';
import { ShipVariantContext } from './ShipVariant';

interface ShipModelProps {
  /** Jambes d'atterrissage de la version lunaire. */
  legs?: boolean;
  /** Ouverture de la trappe de largage (0..1), lue à chaque image. */
  door?: () => number;
  /** Poussée des moteurs principaux (0..1), lue à chaque image. */
  thrust?: () => number;
}

/** Vaisseau de décor : le même modèle détaillé que sur le reste de la page, sans satellites rangés. */
const SCENERY = { flaps: true, shield: true, payload: false } as const;

/**
 * Vaisseau seul, base à l'origine, pour les décors (orbite, Lune).
 */
export function ShipModel({ legs = false, door, thrust }: ShipModelProps) {
  const m = useMaterials();
  return (
    <ShipVariantContext.Provider value={SCENERY}>
      <group position={[0, -LAYOUT.ship.base, 0]}>
        <ShipNose />
        <ShipBody door={door} />
        <ShipEngines flames={!!thrust} thrust={thrust} />
        {legs &&
          Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <group key={i} position={[Math.sin(a) * RADIUS, LAYOUT.ship.base + 0.9, Math.cos(a) * RADIUS]} rotation={[0, a, 0]}>
                <mesh material={m.sooty} position={[0, -0.5, 0.22]} rotation={[0.42, 0, 0]}>
                  <boxGeometry args={[0.12, 1.15, 0.12]} />
                </mesh>
                <mesh material={m.sooty} position={[0, -0.98, 0.45]}>
                  <cylinderGeometry args={[0.2, 0.24, 0.06, 16]} />
                </mesh>
              </group>
            );
          })}
      </group>
    </ShipVariantContext.Provider>
  );
}
