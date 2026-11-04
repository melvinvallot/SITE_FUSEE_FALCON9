import { useEffect, useMemo } from 'react';
import { BoxGeometry, CylinderGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { MaterialSet } from '../materials';

interface GridFinProps {
  materials: MaterialSet;
  /** Portée radiale (depuis la coque). */
  span?: number;
  /** Largeur tangentielle. */
  width?: number;
  /** Épaisseur des alvéoles, dans l'axe du lanceur. */
  depth?: number;
}

/**
 * Aileron en grille du propulseur. Repère local : la charnière est à
 * l'origine, l'aileron s'étend selon +x, l'air le traverse selon y.
 */
export function GridFin({ materials, span = 1.1, width = 0.9, depth = 0.12 }: GridFinProps) {
  const geometry = useMemo(() => {
    const t = 0.012;
    const boxes: BoxGeometry[] = [];
    const add = (sx: number, sy: number, sz: number, x: number, y: number, z: number, ry = 0) => {
      const b = new BoxGeometry(sx, sy, sz);
      if (ry) b.rotateY(ry);
      b.translate(x, y, z);
      boxes.push(b);
    };
    // Cadre épais.
    add(span, depth, t * 3, span / 2, 0, width / 2);
    add(span, depth, t * 3, span / 2, 0, -width / 2);
    add(t * 3, depth, width, span, 0, 0);
    add(t * 4, depth * 1.2, width, 0.02, 0, 0);
    // Arbre de la charnière et ferrure d'emplanture.
    const shaft = new CylinderGeometry(0.035, 0.035, 0.3, 14);
    shaft.rotateZ(Math.PI / 2);
    shaft.translate(0.02, 0, 0);
    boxes.push(shaft as unknown as BoxGeometry);
    add(0.12, depth * 1.5, width * 0.32, 0.07, 0, 0);
    // Raidisseur transversal à mi-portée.
    add(t * 2.5, depth * 1.05, width, span * 0.5, 0, 0);
    // Alvéoles en losange : deux familles de lames à ±45°, rognées au cadre.
    const cells = 8;
    for (const sign of [1, -1]) {
      for (let i = 1; i < cells * 2; i++) {
        // Droite x - sign·z = c, parcourue de part en part du rectangle.
        const c = -width / 2 + (i / (cells * 2)) * (span + width);
        const pts: [number, number][] = [];
        for (const z of [-width / 2, width / 2]) {
          const x = c + sign * z;
          if (x >= 0 && x <= span) pts.push([x, z]);
        }
        for (const x of [0, span]) {
          const z = (x - c) * sign;
          if (z > -width / 2 && z < width / 2) pts.push([x, z]);
        }
        if (pts.length < 2) continue;
        const [a, b] = [pts[0]!, pts[1]!];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.02) continue;
        add(len, depth, t, (a[0] + b[0]) / 2, 0, (a[1] + b[1]) / 2, -Math.atan2(b[1] - a[1], b[0] - a[0]));
      }
    }
    const merged = mergeGeometries(boxes, false);
    boxes.forEach((b) => b.dispose());
    return merged;
  }, [span, width, depth]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <mesh geometry={geometry} material={materials.grid} />
    </group>
  );
}
