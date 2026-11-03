import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { RADIUS, STACK_YAW } from '../../../data/layout';
import { useMaterials } from '../materials';
import { GridFin } from '../primitives/GridFin';
import { useSceneState } from '../SceneStateContext';
import { FINE, Kit, useKits } from '../detail';

const FIN_Y = 16.25;
/**
 * Angles des ailerons dans la scène (depuis +x vers +z) : deux paires de part et
 * d'autre, à l'écart des bras de la tour. Convertis dans le repère du lanceur.
 */
const ANGLES = [35, -35, 145, -145].map((deg) => (deg * Math.PI) / 180 + STACK_YAW);

/** Les quatre ailerons en grille, pilotés pendant la descente. */
export function GridFins() {
  const m = useMaterials();
  const state = useSceneState();
  const fins = useRef<(Group | null)[]>([]);

  // Fixations sur la coque, qui ne tournent pas avec l'aileron.
  const { mount } = useKits(() => {
    const k = new Kit();
    // Tôle de renfort et boîtier du moteur électrique d'orientation, avec son carénage.
    k.box([0.02, 0.95, 0.75], [-0.05, 0, 0]);
    k.box([0.12, 0.3, 0.36], [-0.02, 0, 0]);
    k.capsule(0.09, 0.42, [-0.02, -0.38, 0], [0, 0, 0], [0.8, 1, 1.4]);
    if (FINE) {
      for (const z of [-0.33, -0.2, 0.2, 0.33]) for (const y of [-0.42, 0.42]) k.cyl(0.012, 0.012, 0.02, [-0.035, y, z], [0, 0, Math.PI / 2], 6);
    }
    return { mount: k.build() };
  });

  useFrame(({ clock }) => {
    const s = state.current;
    const t = clock.elapsedTime;
    const steer = Math.max(s.fins, s.capture > 0 && s.capture < 0.95 ? 0.6 : 0);
    fins.current.forEach((f, i) => f?.rotation.set(steer * 0.38 * Math.sin(t * 1.4 + i * 1.9), 0, 0));
  });

  return (
    <group position={[0, FIN_Y, 0]}>
      {ANGLES.map((a, i) => (
        <group key={a} rotation={[0, -a, 0]}>
          <group position={[RADIUS + 0.05, 0, 0]}>
            <mesh geometry={mount} material={m.sooty} />
            <group ref={(g) => (fins.current[i] = g)}>
              <GridFin materials={m} />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
