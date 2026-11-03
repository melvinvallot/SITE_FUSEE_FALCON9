export type Vec3 = readonly [number, number, number];

/** Identifiants des sous-ensembles démontables du lanceur. */
export type PartId =
  | 'fairing'
  | 'secondStage'
  | 'interstage'
  | 'firstStage'
  | 'engines'
  | 'legs';

export interface Spec {
  label: string;
  value: string;
}

export interface RocketPart {
  id: PartId;
  name: string;
  /** Hauteur approximative de la pièce sur le lanceur assemblé, en mètres. */
  altitude: { from: number; to: number };
  summary: string;
  specs: Spec[];
  /** Décalage appliqué quand le lanceur est éclaté (unités de scène). */
  explodeOffset: Vec3;
}

/** État de la scène 3D à un instant donné de la progression du défilement. */
export interface SceneState {
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  /** 0 = assemblé, 1 = éclaté. */
  explode: number;
  /** 0 = jambes repliées, 1 = déployées. */
  legs: number;
  /** 0 = au sol, 1 = en vol. */
  launch: number;
  /** Vitesse de rotation automatique du lanceur (rad/s). */
  spin: number;
  /** Mise en valeur de chaque pièce, entre 0 et 1. */
  focus: Record<PartId, number>;
}

export interface Keyframe extends Omit<SceneState, 'focus'> {
  /** Section de la page qui correspond à cette image clé. */
  sectionId: string;
  focus: PartId | null;
}

export type Align = 'start' | 'end';

export interface PageSection {
  id: string;
  title: string;
  lead: string;
  align: Align;
  partId?: PartId;
}
