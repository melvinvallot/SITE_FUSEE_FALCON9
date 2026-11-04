/** Type de satellite largué : simulateur de masse (bloc inerte) ou Starlink V3 avec ses panneaux solaires. */
export type SatelliteKind = 'simulator' | 'v3';

export interface Deployment {
  id: string;
  /** Nom court affiché sur le sélecteur. */
  flight: string;
  date: string;
  /** Satellites largués, dans l'ordre de sortie. */
  satellites: readonly SatelliteKind[];
  /** Charge, en une ligne. */
  payload: string;
  /** Ce que le vol a démontré. */
  note: string;
}

const repeat = (kind: SatelliteKind, n: number): SatelliteKind[] => Array.from({ length: n }, () => kind);

/**
 * Largages réussis des vols d'essai de Starship, d'après les comptes rendus de
 * SpaceX et la liste des lancements Starship (Wikipédia), vérifiés le 4 novembre 2026.
 * Les vols 7, 8 et 9 emportaient aussi des simulateurs, mais n'ont pas pu les larguer.
 */
export const DEPLOYMENTS: readonly Deployment[] = [
  {
    id: 'vol-10',
    flight: 'Vol 10',
    date: '26 août 2025',
    satellites: repeat('simulator', 8),
    payload: '8 simulateurs de satellites Starlink',
    note: 'Premier largage réussi : la trappe s’ouvre et les huit simulateurs sortent un à un, sur une trajectoire qui les fait retomber dans l’atmosphère.',
  },
  {
    id: 'vol-11',
    flight: 'Vol 11',
    date: '13 octobre 2025',
    satellites: repeat('simulator', 8),
    payload: '8 simulateurs Starlink, environ 16 tonnes',
    note: 'Dernier vol du vaisseau de 2e génération : largage en sept minutes environ, puis amerrissage contrôlé dans l’océan Indien.',
  },
  {
    id: 'vol-12',
    flight: 'Vol 12',
    date: '22 mai 2026',
    satellites: [...repeat('simulator', 10), 'v3', ...repeat('simulator', 10), 'v3'],
    payload: '20 simulateurs Starlink V3 et 2 satellites Starlink modifiés',
    note: 'Premier vol du Starship de 3e génération, avec un distributeur amélioré : 22 satellites largués en une dizaine de minutes.',
  },
  {
    id: 'vol-13',
    flight: 'Vol 13',
    date: '24 juillet 2026',
    satellites: repeat('v3', 20),
    payload: '20 satellites Starlink V3',
    note: 'Premiers vrais Starlink V3 largués par Starship. Sur une trajectoire presque orbitale, ils ont été testés puis sont rentrés dans l’atmosphère.',
  },
  {
    id: 'vol-14',
    flight: 'Vol 14',
    date: '28 septembre 2026',
    satellites: repeat('v3', 26),
    payload: '26 satellites Starlink V3, en orbite vers 275 km',
    note: 'Première mise en orbite de Starship : les 26 satellites sont déployés, panneaux solaires ouverts, avant le retour du vaisseau au-dessus du Pacifique.',
  },
];

/** Vol présenté par défaut : le plus récent. */
export const DEFAULT_DEPLOYMENT = DEPLOYMENTS.length - 1;
