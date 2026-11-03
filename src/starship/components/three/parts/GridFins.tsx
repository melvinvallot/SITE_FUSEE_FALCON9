import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { RADIUS, STACK_YAW } from '../../../data/layout';
import { useMaterials } from '../materials';
import { GridFin } from '../primitives/GridFin';
import { useSceneState } from '../SceneStateContext';

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
            <group ref={(g) => (fins.current[i] = g)}>
              <GridFin materials={m} />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
}
