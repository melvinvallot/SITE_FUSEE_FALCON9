/** Bruit de valeur 2D déterministe et somme fractale, pour le relief martien. */
const hash = (x: number, y: number): number => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

const fade = (t: number) => t * t * (3 - 2 * t);

export function valueNoise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = fade(x - xi);
  const yf = fade(y - yi);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
}

export function fbm2(x: number, y: number, octaves = 5): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(x * f, y * f);
    f *= 2.07;
    amp *= 0.5;
  }
  return sum;
}

/**
 * Altitude du terrain : plat autour de la zone d'atterrissage, dunes et
 * collines au-delà, reliefs plus marqués à l'horizon.
 */
export function marsHeight(x: number, z: number): number {
  const d = Math.hypot(x, z);
  const flat = Math.min(1, Math.max(0, (d - 9) / 25));
  const hills = (fbm2(x * 0.02, z * 0.02) - 0.5) * 22;
  const dunes = (fbm2(x * 0.09 + 10, z * 0.09) - 0.5) * 3;
  const far = Math.max(0, (d - 90) / 120) * 30 * fbm2(x * 0.01 + 3, z * 0.01);
  return (hills + dunes) * flat + far;
}
