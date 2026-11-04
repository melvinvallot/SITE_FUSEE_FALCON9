import { fbm2, valueNoise } from './terrain';

/** Rayon de courbure apparent du sol lunaire (exagéré pour voir l'horizon s'arrondir depuis l'orbite). */
export const MOON_CURVATURE = 1500;
/** Zone plane autour du site d'alunissage. */
const PAD = 16;

export interface Crater {
  x: number;
  z: number;
  r: number;
}

/** Cratères déterministes : beaucoup de petits, quelques grands, aucun sur le site d'alunissage. */
export const CRATERS: readonly Crater[] = (() => {
  const list: Crater[] = [];
  for (let i = 0; list.length < 90 && i < 400; i++) {
    const a = i * 2.39996;
    const d = 30 + valueNoise(i * 0.37, 4.1) * 700;
    const r = 3 + Math.pow(valueNoise(i * 0.91, 9.3), 3) * 60;
    const x = Math.cos(a) * d;
    const z = Math.sin(a) * d;
    if (Math.hypot(x, z) - r < PAD + 6) continue;
    list.push({ x, z, r });
  }
  return list;
})();

/** Profil d'un cratère : cuvette, puis bourrelet qui s'efface au-delà du rebord. */
function craterProfile(d: number, r: number): number {
  const u = d / r;
  if (u < 1) return r * 0.22 * (u * u - 1) + r * 0.06;
  return r * 0.06 * Math.exp(-((u - 1) * (u - 1)) * 6);
}

/** Altitude du sol (sans la courbure), plat autour du site. */
export function lunarRelief(x: number, z: number): number {
  const flat = Math.min(1, Math.max(0, (Math.hypot(x, z) - PAD) / 30));
  let h = (fbm2(x * 0.012, z * 0.012) - 0.5) * 26 + (fbm2(x * 0.08 + 5, z * 0.08) - 0.5) * 1.6;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z);
    if (d < c.r * 2) h += craterProfile(d, c.r);
  }
  return h * flat;
}

/** Altitude finale, courbure de la Lune comprise. */
export function lunarHeight(x: number, z: number): number {
  return lunarRelief(x, z) - (x * x + z * z) / (2 * MOON_CURVATURE);
}
