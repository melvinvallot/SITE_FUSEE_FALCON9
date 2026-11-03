import type { Spec, Vec3 } from '../types';

export type { Spec, Vec3 };

/** Éléments du système que la caméra peut mettre en valeur. */
export type FocusId =
  | 'ship'
  | 'nose'
  | 'payload'
  | 'heatShield'
  | 'shipTanks'
  | 'shipEngines'
  | 'hotStage'
  | 'booster'
  | 'gridFins'
  | 'boosterEngines'
  | 'raptor';

/** Valeurs numériques de la scène, toutes interpolées entre deux images clés. */
export const SCALAR_KEYS = [
  /** Champ de vision vertical de la caméra, en degrés. */
  'fov',
  /** 0 = assemblé, 1 = vue éclatée. */
  'explode',
  /** 0 = coque entière, 1 = coque coupée en deux (réservoirs visibles). */
  'cutaway',
  /** Visibilité du pas de tir (sol, table de lancement, tour). */
  'site',
  /** Silhouette de Falcon 9 à l'échelle, à côté du système. */
  'compare',
  /** Amplitude du battement des volets. */
  'flaps',
  /** Ouverture de la soute et sortie des satellites. */
  'door',
  /** Bascule du vaisseau à l'horizontale (rentrée « ventre en avant »). */
  'pitch',
  /** Intensité du plasma de rentrée atmosphérique. */
  'plasma',
  /** Débattement des ailerons en grille. */
  'fins',
  /** Extraction d'un moteur Raptor, présenté en gros plan. */
  'raptor',
  /** 0 = au sol, 0,12 = allumage, 1 = haute altitude. */
  'launch',
  /** Séparation à chaud : 0 = empilés, 1 = séparés. */
  'sep',
  /** Retour du propulseur : 0 = juste après la séparation, 1 = capturé par la tour. */
  'capture',
  /** Ravitaillement en orbite : 0 = vaisseaux éloignés, 1 = arrimés. */
  'refuel',
  /** Décor : 0 = pas de tir, 1 = orbite terrestre, 2 = surface de Mars. */
  'env',
  /** Léger balancement automatique de la caméra. */
  'sway',
  /** Altitude apparente : 0 = au sol, 1 = haute atmosphère (ciel noir, courbure de la Terre). */
  'alt',
] as const;

export type ScalarKey = (typeof SCALAR_KEYS)[number];
export type Scalars = Record<ScalarKey, number>;

export interface SceneState extends Scalars {
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  /** Mise en valeur de chaque élément, entre 0 et 1. */
  focus: Record<FocusId, number>;
}

export interface Keyframe extends Scalars {
  sectionId: string;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  focus: FocusId | null;
}

export type Align = 'start' | 'end';

export interface Stat {
  label: string;
  value: number;
  unit?: string;
  /** Nombre de décimales affichées. */
  decimals?: number;
  /** Texte placé avant le nombre, par exemple « + de ». */
  prefix?: string;
}

export interface CompareRow {
  label: string;
  unit: string;
  starship: number;
  falcon: number;
}

export interface Chapter {
  id: string;
  title: string;
}

export interface PageSection {
  id: string;
  chapter: string;
  title: string;
  /** Petit texte au-dessus du titre (position, chiffre clé). */
  eyebrow?: string;
  lead: string;
  align: Align;
  stats?: Stat[];
  specs?: Spec[];
  /** Points détaillés, affichés sous forme de liste. */
  points?: string[];
  /** Comparaison chiffrée avec Falcon 9 (barres). */
  compare?: CompareRow[];
  /** Affiche la télémétrie de vol pendant cette section. */
  telemetry?: boolean;
}

/** Élément de la jauge de hauteur (0 à 124 m). */
export interface GaugeItem {
  id: string;
  name: string;
  from: number;
  to: number;
  sectionId: string;
  /** Colonne de la jauge, pour les éléments qui se chevauchent. */
  lane: 0 | 1;
}
