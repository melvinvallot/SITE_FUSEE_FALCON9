import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape, ShapeGeometry } from 'three';
import { STEEL_TILE, TILE_TILE, scaleUv } from '../textures';
import type { MaterialSet } from '../materials';
import { FINE, Kit, projectUv } from '../detail';

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
    // UV de l'acier à l'échelle réelle (sinon les anneaux soudés apparaissent minuscules).
    projectUv(body, STEEL_TILE);
    const face = scaleUv(new ShapeGeometry(shape), 1, 1, TILE_TILE);
    face.translate(0, 0, 0.042);
    return [body, face];
  }, [length, root, tip]);

  // Tube de charnière et ses paliers, le long de l'emplanture.
  const hinge = useMemo(() => {
    const k = new Kit();
    k.cyl(0.032, 0.032, length * 0.92, [0.015, length * 0.48, -0.01], [0, 0, 0], 12);
    const knuckles = FINE ? 5 : 3;
    for (let i = 0; i < knuckles; i++) k.cyl(0.05, 0.05, 0.08, [0.015, length * (0.08 + (0.8 * i) / (knuckles - 1)), -0.01], [0, 0, 0], 12);
    return k.build();
  }, [length]);
  useEffect(() => () => hinge.dispose(), [hinge]);

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
      <mesh geometry={hinge} material={materials.sooty} />
    </group>
  );
}
