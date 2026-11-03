import { useEffect, useMemo } from 'react';
import { DoubleSide, MeshStandardMaterial } from 'three';

const PALETTE = {
  hull: { color: '#eef1f3', roughness: 0.42, metalness: 0.05 },
  carbon: { color: '#16191d', roughness: 0.55, metalness: 0.25 },
  steel: { color: '#7d858d', roughness: 0.35, metalness: 0.8 },
  nozzle: { color: '#3b4148', roughness: 0.38, metalness: 0.75 },
  niobium: { color: '#3d3a38', roughness: 0.32, metalness: 0.8 },
  copper: { color: '#b8734a', roughness: 0.35, metalness: 0.9 },
  titanium: { color: '#a3a9ae', roughness: 0.3, metalness: 0.9 },
  foil: { color: '#d4ad52', roughness: 0.3, metalness: 0.85 },
  panel: { color: '#1d2f55', roughness: 0.25, metalness: 0.6 },
} as const;

export type MaterialName = keyof typeof PALETTE;
export type MaterialSet = Record<MaterialName, MeshStandardMaterial>;

/**
 * Jeu de matériaux propre à chaque pièce : la mise en valeur modifie
 * leur couleur, ils ne doivent donc pas être partagés entre pièces.
 */
export function useMaterials(): MaterialSet {
  const set = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(PALETTE).map(([name, p]) => [
          name,
          new MeshStandardMaterial({ ...p, side: DoubleSide }),
        ]),
      ) as MaterialSet,
    [],
  );
  useEffect(() => () => Object.values(set).forEach((m) => m.dispose()), [set]);
  return set;
}
