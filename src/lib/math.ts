import type { Vec3 } from '../types';

export const clamp = (v: number, min = 0, max = 1): number => Math.min(max, Math.max(min, v));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const lerpVec3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/** Courbe d'accélération douce (Hermite) entre 0 et 1. */
export const smoothstep = (t: number): number => {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
};

/**
 * Amortissement indépendant du nombre d'images par seconde.
 * `lambda` contrôle la vitesse de convergence.
 */
export const damp = (current: number, target: number, lambda: number, dt: number): number =>
  lerp(current, target, 1 - Math.exp(-lambda * dt));

/** Progression (0..1) du défilement d'une page. */
export const scrollProgress = (scrollY: number, scrollHeight: number, viewportHeight: number): number => {
  const max = scrollHeight - viewportHeight;
  return max <= 0 ? 0 : clamp(scrollY / max);
};
