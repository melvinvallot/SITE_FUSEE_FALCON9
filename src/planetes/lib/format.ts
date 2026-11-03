import { dateFromDay } from './orbits';

const nf = (digits: number) =>
  new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Nombre à la française : espace pour les milliers, virgule pour les décimales. */
export const formatNumber = (n: number, digits = 0) => nf(digits).format(n).replace(/ | /g, ' ');

export interface Duration {
  value: string;
  unit: string;
}

/** Durée lisible : en jours sous deux mois, en mois sous deux ans, en années au-delà. */
export function formatDuration(days: number): Duration {
  if (days < 60) return { value: formatNumber(Math.round(days)), unit: Math.round(days) > 1 ? 'jours' : 'jour' };
  if (days < 730) return { value: formatNumber(days / 30.44, 1), unit: 'mois' };
  return { value: formatNumber(days / 365.25, 1), unit: 'ans' };
}

export const durationText = (days: number) => {
  const d = formatDuration(days);
  return `${d.value} ${d.unit}`;
};

/** Grandes distances : « 650 millions de km », « 1,2 milliard de km ». */
export function formatKm(km: number): string {
  if (km >= 1e9) {
    const v = km / 1e9;
    return `${formatNumber(v, v < 10 ? 1 : 0)} ${v < 2 ? 'milliard' : 'milliards'} de km`;
  }
  if (km >= 1e6) return `${formatNumber(km / 1e6)} millions de km`;
  return `${formatNumber(km)} km`;
}

/** Délai d'un message radio : en minutes, ou en heures et minutes. */
export function formatLight(minutes: number): string {
  if (minutes < 60) return `${formatNumber(Math.max(1, Math.round(minutes)))} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m ? `${h} h ${m} min` : `${h} h`;
}

const monthYear = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const fullDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

export const formatMonth = (day: number) => monthYear.format(dateFromDay(day));
export const formatDate = (day: number) => fullDate.format(dateFromDay(day));
