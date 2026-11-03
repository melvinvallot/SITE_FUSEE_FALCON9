import { useEffect, useMemo } from 'react';
import { Shape, ShapeGeometry, type Material } from 'three';

/**
 * Coupe 2D d'un réservoir : un rectangle dont le haut et le bas sont des
 * dômes. Un bombement positif pointe vers l'extérieur, négatif vers l'intérieur.
 */
export function tankShape(halfWidth: number, bottom: number, top: number, bottomBulge: number, topBulge: number): Shape {
  const s = new Shape();
  s.moveTo(-halfWidth, bottom);
  s.quadraticCurveTo(0, bottom - bottomBulge * 2, halfWidth, bottom);
  s.lineTo(halfWidth, top);
  s.quadraticCurveTo(0, top + topBulge * 2, -halfWidth, top);
  s.lineTo(-halfWidth, bottom);
  return s;
}

interface TankSectionProps {
  halfWidth: number;
  bottom: number;
  top: number;
  bottomBulge: number;
  topBulge: number;
  material: Material;
}

/** Surface plane d'un réservoir vu en coupe (dans le plan local z = 0). */
export function TankSection({ halfWidth, bottom, top, bottomBulge, topBulge, material }: TankSectionProps) {
  const geometry = useMemo(
    () => new ShapeGeometry(tankShape(halfWidth, bottom, top, bottomBulge, topBulge), 24),
    [halfWidth, bottom, top, bottomBulge, topBulge],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <mesh geometry={geometry} material={material} />;
}
