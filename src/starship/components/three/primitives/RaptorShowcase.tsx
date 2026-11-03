import { useEffect, useMemo } from 'react';
import { CatmullRomCurve3, TubeGeometry, Vector3 } from 'three';
import type { MaterialSet } from '../materials';
import { bellGeometry, pumpHousing } from './Raptor';

interface RaptorShowcaseProps {
  materials: MaterialSet;
}

/**
 * Raptor détaillé, à l'échelle d'un moteur de l'assemblage (≈ 0,72 u de haut) :
 * turbopompes, préchambres, collecteurs, tuyauteries et tuyère refroidie.
 */
export function RaptorShowcase({ materials }: RaptorShowcaseProps) {
  const geo = useMemo(() => {
    const pump = pumpHousing();
    const bell = bellGeometry(0.4, 0.05, 0.16, 48);
    const tube = (pts: [number, number, number][], r = 0.011) =>
      new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 32, r, 8, false);
    const pipes = [
      // Descente du méthane vers le collecteur de la tuyère (refroidissement régénératif).
      tube([[0.09, -0.19, 0.02], [0.11, -0.26, 0.05], [0.1, -0.33, 0.06], [0.07, -0.36, 0.05]], 0.013),
      tube([[-0.09, -0.19, -0.02], [-0.11, -0.26, -0.05], [-0.1, -0.33, -0.06], [-0.07, -0.36, -0.05]], 0.013),
      // Retour vers l'injecteur.
      tube([[0.07, -0.36, -0.05], [0.1, -0.3, -0.08], [0.06, -0.22, -0.07], [0.02, -0.17, -0.04]]),
      tube([[-0.07, -0.36, 0.05], [-0.1, -0.3, 0.08], [-0.06, -0.22, 0.07], [-0.02, -0.17, 0.04]]),
      // Alimentations des préchambres.
      tube([[0.02, -0.02, 0.08], [0.06, -0.05, 0.1], [0.09, -0.09, 0.06]], 0.009),
      tube([[-0.02, -0.02, -0.08], [-0.06, -0.05, -0.1], [-0.09, -0.09, -0.06]], 0.009),
    ];
    return { pump, bell, pipes };
  }, []);

  useEffect(
    () => () => {
      geo.pump.dispose();
      geo.bell.dispose();
      geo.pipes.forEach((p) => p.dispose());
    },
    [geo],
  );

  return (
    <group>
      {/* Rotule de cardan et vérins */}
      <mesh material={materials.plumbing} position={[0, -0.015, 0]}>
        <cylinderGeometry args={[0.035, 0.045, 0.03, 20]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={materials.foil} position={[0.05 * s, -0.08, 0.06]} rotation={[0.5, 0, -0.35 * s]}>
          <cylinderGeometry args={[0.009, 0.009, 0.16, 8]} />
        </mesh>
      ))}
      {/* Préchambres et turbopompes */}
      {[1, -1].map((s) => (
        <group key={s} position={[0.085 * s, 0, 0.02 * s]}>
          <mesh material={materials.plumbing} position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.03, 0.036, 0.09, 18]} />
          </mesh>
          <mesh geometry={geo.pump} material={s > 0 ? materials.copper : materials.plumbing} position={[0, -0.18, 0]} />
        </group>
      ))}
      {/* Injecteur, collecteur de gaz chauds et chambre de combustion */}
      <mesh material={materials.plumbing} position={[0, -0.16, 0]}>
        <cylinderGeometry args={[0.062, 0.062, 0.05, 24]} />
      </mesh>
      <mesh material={materials.copper} position={[0, -0.16, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.072, 0.014, 10, 36]} />
      </mesh>
      <mesh material={materials.nozzle} position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.06, 0.05, 0.13, 28]} />
      </mesh>
      {geo.pipes.map((g, i) => (
        <mesh key={i} geometry={g} material={i < 2 ? materials.copper : materials.plumbing} />
      ))}
      {/* Tuyère et collecteurs de refroidissement */}
      <group position={[0, -0.32, 0]}>
        <mesh geometry={geo.bell} material={materials.nozzle} />
        <mesh geometry={geo.bell} material={materials.copper} scale={[0.985, 1, 0.985]} />
      </group>
      {[
        [-0.36, 0.072],
        [-0.52, 0.128],
        [-0.71, 0.162],
      ].map(([y, r]) => (
        <mesh key={y} material={materials.plumbing} position={[0, y!, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r!, 0.008, 8, 48]} />
        </mesh>
      ))}
    </group>
  );
}
