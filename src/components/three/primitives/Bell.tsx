import { useMemo } from 'react';
import { LatheGeometry, Vector2, type Material } from 'three';

interface BellProps {
  length: number;
  throat: number;
  exit: number;
  material: Material;
  segments?: number;
}

/** Tuyère en cloche, du col (en haut, y = 0) vers la sortie (y = -length). */
export function Bell({ length, throat, exit, material, segments = 40 }: BellProps) {
  const geometry = useMemo(() => {
    const steps = 18;
    const points = Array.from({ length: steps + 1 }, (_, i) => {
      const t = i / steps;
      return new Vector2(throat + (exit - throat) * Math.pow(t, 0.62), -t * length);
    });
    return new LatheGeometry(points, segments);
  }, [length, throat, exit, segments]);

  return <mesh geometry={geometry} material={material} castShadow />;
}
