import { useMemo } from 'react';
import type { Material } from 'three';

interface GridFinProps {
  width?: number;
  height?: number;
  depth?: number;
  cells?: number;
  material: Material;
}

/**
 * Aileron en grille. Le repère local part de la charnière (y = 0) et
 * s'étend vers +y ; l'aileron est mince selon z.
 */
export function GridFin({ width = 0.34, height = 0.3, depth = 0.05, cells = 6, material }: GridFinProps) {
  const bars = useMemo(() => {
    const t = 0.008;
    const list: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let i = 0; i <= cells; i++) {
      const x = -width / 2 + (width * i) / cells;
      list.push({ pos: [x, height / 2, 0], size: [t, height, depth] });
      const y = (height * i) / cells;
      list.push({ pos: [0, y, 0], size: [width, t, depth] });
    }
    return list;
  }, [width, height, depth, cells]);

  return (
    <group>
      {bars.map((b, i) => (
        <mesh key={i} position={b.pos} material={material}>
          <boxGeometry args={b.size} />
        </mesh>
      ))}
      <mesh position={[0, -0.03, -depth / 2]} material={material}>
        <boxGeometry args={[0.06, 0.06, 0.06]} />
      </mesh>
    </group>
  );
}
