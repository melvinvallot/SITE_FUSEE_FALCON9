import { clamp, lerp } from '../../lib/math';

export interface TelemetryPoint {
  /** Progression du défilement correspondant à ce point. */
  at: number;
  /** Temps écoulé depuis le décollage, en secondes. */
  time: number;
  booster: { altitude: number; speed: number };
  ship: { altitude: number; speed: number };
}

export interface TelemetryReading {
  time: number;
  booster: { altitude: number; speed: number };
  ship: { altitude: number; speed: number };
}

/** Interpolation linéaire par morceaux entre des points triés par `at`. */
export function readTelemetry(points: readonly TelemetryPoint[], progress: number): TelemetryReading {
  if (points.length === 0) throw new Error('Aucun point de télémétrie.');
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (progress <= first.at) return first;
  if (progress >= last.at) return last;
  let i = 0;
  while (points[i + 1]!.at < progress) i++;
  const a = points[i]!;
  const b = points[i + 1]!;
  const t = clamp((progress - a.at) / (b.at - a.at));
  return {
    time: lerp(a.time, b.time, t),
    booster: { altitude: lerp(a.booster.altitude, b.booster.altitude, t), speed: lerp(a.booster.speed, b.booster.speed, t) },
    ship: { altitude: lerp(a.ship.altitude, b.ship.altitude, t), speed: lerp(a.ship.speed, b.ship.speed, t) },
  };
}

/** Chronomètre de vol, au format T+00:02:42. */
export function formatMissionTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `T+${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}
