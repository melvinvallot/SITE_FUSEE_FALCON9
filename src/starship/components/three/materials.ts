import { useEffect, useMemo } from 'react';
import { Color, DoubleSide, FrontSide, MeshStandardMaterial, Plane, Vector3 } from 'three';
import { steelTexture, tileTexture } from './textures';

/**
 * Plan de coupe partagé par les coques : quand la vue en coupe est active,
 * la moitié tournée vers la caméra disparaît. Mis à jour par `CutawayDriver`.
 */
export const CUT_PLANE = new Plane(new Vector3(0, 0, -1), 1000);

type Recipe = {
  color: string;
  roughness: number;
  metalness: number;
  map?: 'steel' | 'tiles';
  clip?: boolean;
  emissive?: string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  single?: boolean;
};

const RECIPES = {
  /** Acier inoxydable de la coque. */
  steel: { color: '#f2f4f6', roughness: 0.34, metalness: 0.62, map: 'steel', clip: true },
  /** Acier assombri par la suie (jupes arrière, anneau). */
  sooty: { color: '#8a8e93', roughness: 0.5, metalness: 0.6, map: 'steel', clip: true },
  /** Tuiles noires du bouclier thermique. */
  tiles: { color: '#ffffff', roughness: 0.82, metalness: 0.05, map: 'tiles', clip: true },
  /** Intérieur sombre (soute, ouvertures). */
  cavity: { color: '#0d0f12', roughness: 0.9, metalness: 0.2 },
  /** Tuyères et chambres de combustion. */
  nozzle: { color: '#5d636b', roughness: 0.38, metalness: 0.85 },
  /** Tuyères Raptor Vacuum, plus sombres. */
  vacuum: { color: '#3b3f46', roughness: 0.32, metalness: 0.88 },
  /** Bord intérieur chaud des tuyères. */
  copper: { color: '#b0683f', roughness: 0.35, metalness: 0.9 },
  /** Tuyauteries et turbopompes. */
  plumbing: { color: '#a7adb3', roughness: 0.28, metalness: 0.95 },
  /** Isolant doré. */
  foil: { color: '#c9a04f', roughness: 0.3, metalness: 0.85 },
  /** Ailerons en grille. */
  grid: { color: '#8b9097', roughness: 0.45, metalness: 0.85 },
  /** Oxygène liquide, en coupe. */
  lox: { color: '#6fb6ff', roughness: 0.4, metalness: 0, emissive: '#3f8fff', emissiveIntensity: 0.55, single: true },
  /** Méthane liquide, en coupe. */
  methane: { color: '#ffb36b', roughness: 0.4, metalness: 0, emissive: '#ff8a3d', emissiveIntensity: 0.45, single: true },
  /** Panneaux solaires des satellites. */
  panel: { color: '#1c2b4f', roughness: 0.25, metalness: 0.6 },
} satisfies Record<string, Recipe>;

export type MaterialName = keyof typeof RECIPES;
export type MaterialSet = Record<MaterialName, MeshStandardMaterial>;

function build(r: Recipe): MeshStandardMaterial {
  const m = new MeshStandardMaterial({
    color: new Color(r.color),
    roughness: r.roughness,
    metalness: r.metalness,
    side: r.single ? FrontSide : DoubleSide,
  });
  if (r.map === 'steel') {
    m.map = steelTexture();
    m.roughnessMap = steelTexture();
    m.bumpMap = steelTexture();
    m.bumpScale = 0.6;
  }
  if (r.map === 'tiles') {
    m.map = tileTexture();
    m.bumpMap = tileTexture();
    m.bumpScale = 1.2;
  }
  if (r.emissive) {
    m.emissive = new Color(r.emissive);
    m.emissiveIntensity = r.emissiveIntensity ?? 1;
  }
  if (r.clip) m.clippingPlanes = [CUT_PLANE];
  return m;
}

/**
 * Jeu de matériaux propre à chaque sous-ensemble : la mise en valeur
 * modifie leur couleur, ils ne doivent donc pas être partagés.
 */
export function useMaterials(): MaterialSet {
  const set = useMemo(
    () => Object.fromEntries(Object.entries(RECIPES).map(([name, r]) => [name, build(r)])) as MaterialSet,
    [],
  );
  useEffect(() => () => Object.values(set).forEach((m) => m.dispose()), [set]);
  return set;
}

/** Applique le plan de coupe à un matériau existant. */
export const clipped = <M extends MeshStandardMaterial>(m: M): M => {
  m.clippingPlanes = [CUT_PLANE];
  return m;
};
