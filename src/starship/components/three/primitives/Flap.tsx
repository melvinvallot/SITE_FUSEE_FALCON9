import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three';
import { TILE_TILE, scaleUv } from '../textures';
import type { MaterialSet } from '../materials';

interface FlapProps {
  materials: MaterialSet;
  /** Longueur le long du fuselage. */
  length: number;
  /** Largeur à la racine (charnière) et au bout. */
  root: number;
  tip: number;
}

/**
 * Volet aérodynamique. La charnière suit l'axe y local ; le volet s'étend
 * selon +x. La face +z (côté vent) porte des tuiles, l'autre est en acier.
 */
export function Flap({ materials, length, root, tip }: FlapProps) {
  const [body, face] = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, 0);
    shape.lineTo(root, 0.06 * length);
    shape.lineTo(tip, length * 0.82);
    shape.quadraticCurveTo(tip * 0.7, length, 0, length);
    shape.lineTo(0, 0);
    const body = new ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 });
    body.translate(0, 0, -0.025);
    const face = scaleUv(new ShapeGeometry(shape), 1, 1, TILE_TILE);
    face.translate(0, 0, 0.042);
    return [body, face];
  }, [length, root, tip]);

  useEffect(
    () => () => {
      body.dispose();
      face.dispose();
    },
    [body, face],
  );

  return (
    <group>
      <mesh geometry={body} material={materials.steel} />
      <mesh geometry={face} material={materials.tiles} />
    </group>
  );
}
