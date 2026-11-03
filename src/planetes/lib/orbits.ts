import { EARTH, type Planet } from '../data/planets';

/** Unité astronomique, en km. */
export const AU_KM = 149_597_870.7;
/** Paramètre gravitationnel du Soleil (G × masse), en km³/s². */
export const MU_SUN = 1.32712440018e11;
export const DAY_S = 86_400;
/** Vitesse de la lumière, en km/s. */
export const LIGHT_KM_S = 299_792.458;
/** 1er janvier 2000 à midi (temps universel), origine des longitudes moyennes. */
const J2000_MS = Date.UTC(2000, 0, 1, 12);
const DAY_MS = DAY_S * 1000;
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

/** Ramène un angle entre 0 et 2π. */
export const wrap = (a: number) => ((a % TAU) + TAU) % TAU;

export const dayFromDate = (date: Date) => (date.getTime() - J2000_MS) / DAY_MS;
export const dateFromDay = (day: number) => new Date(J2000_MS + day * DAY_MS);

/** Position angulaire moyenne d'une planète sur son orbite (radians), à une date donnée. */
export const planetAngle = (p: Planet, day: number) => wrap((p.l0 + p.rate * day) * RAD);

/** Mouvement moyen d'une planète, en radians par jour. */
export const meanMotion = (p: Planet) => p.rate * RAD;

/** Période synodique : délai entre deux fenêtres de tir (même position relative Terre-planète), en jours. */
export const synodicDays = (p: Planet, from: Planet = EARTH) => 360 / Math.abs(p.rate - from.rate);

export interface Transfer {
  /** Rayon de départ et d'arrivée, en UA. */
  r1: number;
  r2: number;
  /** Demi-grand axe et excentricité de l'ellipse de transfert. */
  a: number;
  e: number;
  /** Durée du transfert, en jours. */
  days: number;
  /** Vers l'extérieur du système solaire (planète plus loin du Soleil que la Terre). */
  outward: boolean;
}

/**
 * Transfert de Hohmann : la moitié d'une ellipse qui touche l'orbite de départ et
 * celle d'arrivée. C'est le trajet le plus économique en carburant entre deux orbites
 * circulaires ; sa durée vaut la moitié de la période de l'ellipse (3e loi de Kepler).
 */
export function hohmann(target: Planet, from: Planet = EARTH): Transfer {
  const r1 = from.a;
  const r2 = target.a;
  const a = (r1 + r2) / 2;
  const e = Math.abs(r2 - r1) / (r1 + r2);
  const seconds = Math.PI * Math.sqrt((a * AU_KM) ** 3 / MU_SUN);
  return { r1, r2, a, e, days: seconds / DAY_S, outward: r2 > r1 };
}

/**
 * Angle d'avance que doit avoir la planète visée sur la Terre au départ, pour être au
 * rendez-vous à l'arrivée (radians, entre 0 et 2π).
 */
export const launchPhase = (target: Planet, t: Transfer = hohmann(target)) => wrap(Math.PI - meanMotion(target) * t.days);

/** Nombre de jours à attendre, à partir de `fromDay`, avant la prochaine fenêtre de tir. */
export function daysToWindow(target: Planet, fromDay: number, from: Planet = EARTH): number {
  const k = meanMotion(target) - meanMotion(from);
  const phase = wrap(planetAngle(target, fromDay) - planetAngle(from, fromDay));
  const need = launchPhase(target);
  const wait = k > 0 ? wrap(need - phase) / k : wrap(phase - need) / -k;
  // Une fenêtre « tout juste passée » de quelques heures compte comme maintenant.
  return wait > synodicDays(target, from) - 0.5 ? 0 : wait;
}

/** Résout l'équation de Kepler E − e·sin E = M (méthode de Newton). */
export function eccentricAnomaly(M: number, e: number): number {
  let E = e < 0.8 ? M : Math.PI;
  for (let i = 0; i < 30; i++) {
    const d = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= d;
    if (Math.abs(d) < 1e-12) break;
  }
  return E;
}

export interface Mission {
  target: Planet;
  transfer: Transfer;
  /** Date de référence (aujourd'hui), en jours depuis l'an 2000. */
  nowDay: number;
  /** Attente avant la fenêtre de tir, en jours. */
  wait: number;
  launchDay: number;
  arrivalDay: number;
  /** Angle de la Terre au départ (radians). */
  launchAngle: number;
}

export function planMission(target: Planet, nowDay: number): Mission {
  const transfer = hohmann(target);
  const wait = daysToWindow(target, nowDay);
  const launchDay = nowDay + wait;
  return {
    target,
    transfer,
    nowDay,
    wait,
    launchDay,
    arrivalDay: launchDay + transfer.days,
    launchAngle: planetAngle(EARTH, launchDay),
  };
}

export interface ShipState {
  /** Distance au Soleil, en UA. */
  r: number;
  /** Angle autour du Soleil (radians). */
  angle: number;
  /** Vitesse par rapport au Soleil, en km/s. */
  speed: number;
}

/** Position et vitesse du vaisseau sur l'ellipse de transfert, à une date donnée. */
export function shipState(m: Mission, day: number): ShipState {
  const { a, e, days, outward } = m.transfer;
  const t = Math.min(Math.max(day - m.launchDay, 0), days);
  // Temps écoulé depuis le périhélie : on part du périhélie vers l'extérieur, de l'aphélie vers l'intérieur.
  const sincePeri = outward ? t : t + days;
  const E = eccentricAnomaly((Math.PI * sincePeri) / days, e);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = a * (1 - e * Math.cos(E));
  const start = outward ? 0 : Math.PI;
  const speed = Math.sqrt(MU_SUN * (2 / (r * AU_KM) - 1 / (a * AU_KM)));
  return { r, angle: wrap(m.launchAngle + nu - start), speed };
}

/** Position (x, y) dans le plan de l'orbite, en UA. */
export const toPlane = (r: number, angle: number): [number, number] => [r * Math.cos(angle), r * Math.sin(angle)];

/** Distance entre deux planètes à une date donnée, en km. */
export function distanceKm(p: Planet, q: Planet, day: number): number {
  const [x1, y1] = toPlane(p.a, planetAngle(p, day));
  const [x2, y2] = toPlane(q.a, planetAngle(q, day));
  return Math.hypot(x1 - x2, y1 - y2) * AU_KM;
}

/** Longueur du trajet (demi-ellipse, formule de Ramanujan), en km. */
export function pathLengthKm(t: Transfer): number {
  const b = t.a * Math.sqrt(1 - t.e * t.e);
  const h = ((t.a - b) / (t.a + b)) ** 2;
  const perimeter = Math.PI * (t.a + b) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)));
  return (perimeter / 2) * AU_KM;
}

/** Temps mis par un message radio pour parcourir une distance, en minutes. */
export const lightMinutes = (km: number) => km / LIGHT_KM_S / 60;
