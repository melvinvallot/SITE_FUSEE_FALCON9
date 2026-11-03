/**
 * Données des planètes.
 *
 * Orbites : éléments moyens (orbites circulaires, dans le même plan) d'après les
 * tables simplifiées de la NASA/JPL (E. M. Standish). Suffisant pour estimer une
 * durée de trajet et une date de fenêtre de tir, pas pour piloter un vrai vaisseau.
 */

export type PlanetId = 'mercure' | 'venus' | 'terre' | 'mars' | 'jupiter' | 'saturne' | 'uranus' | 'neptune';

/** Aspect de la planète dans la scène 3D (shader procédural). */
export type Look = 'rocky' | 'venus' | 'earth' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

export interface Fact {
  label: string;
  value: string;
}

export interface Planet {
  id: PlanetId;
  name: string;
  /** Demi-grand axe de l'orbite, en unités astronomiques (1 UA = distance Terre-Soleil). */
  a: number;
  /** Longitude moyenne au 1er janvier 2000 à midi, en degrés. */
  l0: number;
  /** Déplacement moyen sur l'orbite, en degrés par jour. */
  rate: number;
  /** Rayon dans la scène (tailles exagérées pour être visibles). */
  radius: number;
  /** Inclinaison de l'axe de rotation, en degrés. */
  tilt: number;
  /** Vitesse de rotation sur elle-même dans la scène (radians par seconde). */
  spin: number;
  look: Look;
  /** Couleur d'accent de l'interface. */
  color: string;
  tagline: string;
  facts: Fact[];
  /** Vraie mission spatiale, pour comparer. */
  realMission?: string;
  /** Remarque propre à la destination. */
  note?: string;
}

export const PLANETS: readonly Planet[] = [
  {
    id: 'mercure',
    name: 'Mercure',
    a: 0.38709927,
    l0: 252.25032,
    rate: 4.09233445,
    radius: 0.75,
    tilt: 0.03,
    spin: 0.05,
    look: 'rocky',
    color: '#b7aea4',
    tagline: 'La plus proche du Soleil, criblée de cratères.',
    facts: [
      { label: 'Diamètre', value: '4 879 km' },
      { label: 'Distance au Soleil', value: '58 millions de km' },
      { label: 'Lunes', value: 'aucune' },
      { label: 'Température', value: 'de −180 à 430 °C' },
    ],
    realMission: 'La sonde MESSENGER a mis 6 ans et demi (2004-2011) : freiner près du Soleil est très difficile.',
    note: 'Le trajet est court, mais il faut énormément freiner à l’arrivée : c’est l’une des destinations les plus coûteuses en carburant.',
  },
  {
    id: 'venus',
    name: 'Vénus',
    a: 0.72333566,
    l0: 181.9791,
    rate: 1.60213034,
    radius: 1.3,
    tilt: 177.4,
    spin: 0.02,
    look: 'venus',
    color: '#e8c98a',
    tagline: 'Une fournaise cachée sous des nuages d’acide.',
    facts: [
      { label: 'Diamètre', value: '12 104 km' },
      { label: 'Distance au Soleil', value: '108 millions de km' },
      { label: 'Lunes', value: 'aucune' },
      { label: 'Température', value: '465 °C au sol' },
    ],
    realMission: 'La sonde européenne Venus Express a mis 153 jours (2005-2006).',
  },
  {
    id: 'terre',
    name: 'Terre',
    a: 1.00000261,
    l0: 100.46457,
    rate: 0.98560912,
    radius: 1.4,
    tilt: 23.44,
    spin: 0.12,
    look: 'earth',
    color: '#6fb6ff',
    tagline: 'Le point de départ.',
    facts: [],
  },
  {
    id: 'mars',
    name: 'Mars',
    a: 1.52371034,
    l0: 355.44657,
    rate: 0.52403304,
    radius: 0.95,
    tilt: 25.19,
    spin: 0.11,
    look: 'mars',
    color: '#ff7a45',
    tagline: 'La planète rouge, première cible de Starship.',
    facts: [
      { label: 'Diamètre', value: '6 779 km' },
      { label: 'Distance au Soleil', value: '228 millions de km' },
      { label: 'Lunes', value: '2 (Phobos et Déimos)' },
      { label: 'Température', value: '−63 °C en moyenne' },
    ],
    realMission: 'Le rover Perseverance a mis 203 jours (2020-2021).',
    note: 'SpaceX vise plutôt 6 mois environ, avec une trajectoire plus rapide qui consomme plus de carburant (d’où le ravitaillement en orbite).',
  },
  {
    id: 'jupiter',
    name: 'Jupiter',
    a: 5.202887,
    l0: 34.39644,
    rate: 0.08308676,
    radius: 4.4,
    tilt: 3.13,
    spin: 0.22,
    look: 'jupiter',
    color: '#e0b48a',
    tagline: 'La géante gazeuse et sa Grande Tache rouge.',
    facts: [
      { label: 'Diamètre', value: '139 820 km (11 Terres)' },
      { label: 'Distance au Soleil', value: '778 millions de km' },
      { label: 'Lunes', value: 'plus de 90' },
      { label: 'Température', value: '−110 °C (haut des nuages)' },
    ],
    realMission: 'La sonde Juno a mis 5 ans (2011-2016), en repassant près de la Terre pour prendre de l’élan.',
    note: 'Pas de sol où se poser : Starship resterait en orbite, par exemple autour de la lune Europe ou Callisto.',
  },
  {
    id: 'saturne',
    name: 'Saturne',
    a: 9.53667594,
    l0: 49.95424,
    rate: 0.03344414,
    radius: 3.7,
    tilt: 26.73,
    spin: 0.2,
    look: 'saturn',
    color: '#e9d39c',
    tagline: 'Ses anneaux font 280 000 km de large… et 10 m d’épaisseur.',
    facts: [
      { label: 'Diamètre', value: '116 460 km' },
      { label: 'Distance au Soleil', value: '1,4 milliard de km' },
      { label: 'Lunes', value: 'plus de 270' },
      { label: 'Température', value: '−140 °C (haut des nuages)' },
    ],
    realMission: 'La sonde Cassini a mis près de 7 ans (1997-2004), avec quatre passages près de Vénus, de la Terre et de Jupiter.',
    note: 'Pas de sol non plus : la destination serait Titan, sa grande lune à l’atmosphère épaisse.',
  },
  {
    id: 'uranus',
    name: 'Uranus',
    a: 19.18916464,
    l0: 313.23810,
    rate: 0.01172834,
    radius: 2.4,
    tilt: 97.77,
    spin: 0.16,
    look: 'uranus',
    color: '#9fe3e6',
    tagline: 'La géante de glace qui roule couchée sur le côté.',
    facts: [
      { label: 'Diamètre', value: '50 724 km' },
      { label: 'Distance au Soleil', value: '2,9 milliards de km' },
      { label: 'Lunes', value: 'une trentaine' },
      { label: 'Température', value: '−195 °C' },
    ],
    realMission: 'Voyager 2 l’a survolée après 8 ans et demi (1977-1986), grâce à l’élan de Jupiter et Saturne.',
  },
  {
    id: 'neptune',
    name: 'Neptune',
    a: 30.06992276,
    l0: 304.88003,
    rate: 0.00598103,
    radius: 2.3,
    tilt: 28.32,
    spin: 0.17,
    look: 'neptune',
    color: '#5b8cff',
    tagline: 'La plus lointaine, balayée par des vents de 2 000 km/h.',
    facts: [
      { label: 'Diamètre', value: '49 244 km' },
      { label: 'Distance au Soleil', value: '4,5 milliards de km' },
      { label: 'Lunes', value: '16' },
      { label: 'Température', value: '−200 °C' },
    ],
    realMission: 'Voyager 2 l’a survolée après 12 ans (1977-1989), sans s’arrêter.',
  },
];

export const EARTH = PLANETS.find((p) => p.id === 'terre')!;

/** Destinations proposées (toutes les planètes sauf la Terre). */
export const DESTINATIONS = PLANETS.filter((p) => p.id !== 'terre');

export function planetById(id: string | null | undefined): Planet | undefined {
  return PLANETS.find((p) => p.id === id);
}
