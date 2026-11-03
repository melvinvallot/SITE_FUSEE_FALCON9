import { BOOSTER_PIVOT, CATCH_BASE, LAUNCH_ALTITUDE, toWorld } from '../data/layout';
import type { Keyframe, Scalars } from '../types';
import { SCALAR_KEYS } from '../types';
import { stage, armsClosure, boosterPose, boosterThrust, bump, ignition, IGNITION_SHARE, launchLift, shipLift, shipThrust } from './flight';
import { easeOutCubic, formatNumber } from './format';
import { sectionProgress } from './sectionProgress';
import { formatMissionTime, readTelemetry, type TelemetryPoint } from './telemetry';
import { activeIndex, dimming, FOCUS_IDS, locate, sampleTimeline } from './timeline';

const zero = Object.fromEntries(SCALAR_KEYS.map((k) => [k, 0])) as Scalars;
const frame = (o: Partial<Keyframe>): Keyframe => ({
  ...zero,
  sectionId: 'x',
  cameraPosition: [0, 0, 0],
  cameraTarget: [0, 0, 0],
  focus: null,
  ...o,
});

describe('timeline', () => {
  it('situe la progression entre deux images clés', () => {
    expect(locate(5, 0)).toEqual({ from: 0, to: 1, t: 0 });
    expect(locate(5, 1)).toEqual({ from: 3, to: 4, t: 1 });
    expect(() => locate(0, 0)).toThrow();
  });

  it('interpole toutes les valeurs et la mise en valeur', () => {
    const kfs = [frame({ explode: 0, env: 0, cameraPosition: [0, 0, 0] }), frame({ explode: 1, env: 2, cameraPosition: [0, 10, 0], focus: 'raptor' })];
    const s = sampleTimeline(kfs, 0.5);
    expect(s.explode).toBeCloseTo(0.5);
    expect(s.env).toBeCloseTo(1);
    expect(s.cameraPosition[1]).toBeCloseTo(5);
    expect(s.focus.raptor).toBeCloseTo(0.5);
    expect(Object.keys(s.focus).sort()).toEqual([...FOCUS_IDS].sort());
  });

  it('arrondit à la section la plus proche', () => {
    expect(activeIndex(22, 0)).toBe(0);
    expect(activeIndex(22, 1)).toBe(21);
    expect(activeIndex(1, 0.6)).toBe(0);
  });

  it('assombrit seulement ce qui n’est pas présenté', () => {
    const focus = Object.fromEntries(FOCUS_IDS.map((f) => [f, f === 'raptor' ? 1 : 0])) as Record<(typeof FOCUS_IDS)[number], number>;
    expect(dimming(focus, ['booster', 'raptor'])).toBe(0);
    expect(dimming(focus, ['nose'])).toBe(1);
    const none = Object.fromEntries(FOCUS_IDS.map((f) => [f, 0])) as typeof focus;
    expect(dimming(none, ['nose'])).toBe(0);
  });
});

describe('vol', () => {
  it('allume les moteurs avant de quitter le sol, puis accélère', () => {
    expect(ignition(0)).toBe(0);
    expect(ignition(IGNITION_SHARE)).toBe(1);
    expect(launchLift(IGNITION_SHARE)).toBe(0);
    expect(launchLift(1)).toBe(LAUNCH_ALTITUDE);
    expect(launchLift(IGNITION_SHARE + (1 - IGNITION_SHARE) / 2)).toBeCloseTo(LAUNCH_ALTITUDE / 4);
  });

  it('fait basculer le propulseur après la séparation', () => {
    const stacked = boosterPose(1, 0, 0);
    expect(stacked.angle).toBe(0);
    expect(stacked.y).toBeCloseTo(LAUNCH_ALTITUDE + BOOSTER_PIVOT);
    expect(boosterPose(1, 1, 0).angle).toBeGreaterThan(Math.PI / 2);
  });

  it('ramène le propulseur droit entre les bras de la tour', () => {
    const caught = boosterPose(1, 1, 1);
    expect(caught.x).toBeCloseTo(0);
    expect(caught.y).toBeCloseTo(CATCH_BASE + BOOSTER_PIVOT);
    expect(caught.angle).toBeCloseTo(0);
    expect(armsClosure(1)).toBe(1);
    expect(armsClosure(0.5)).toBe(0);
  });

  it('enchaîne les allumages des deux étages', () => {
    expect(boosterThrust(1, 0, 0)).toBe(1);
    expect(boosterThrust(1, 1, 0)).toBe(0);
    // Allumage de retour à la section « Demi-tour », éteint pendant la descente, puis allumage d'atterrissage.
    expect(boosterThrust(1, 1, 0.3)).toBeGreaterThan(0.5);
    expect(boosterThrust(1, 1, 0.6)).toBe(0);
    expect(boosterThrust(1, 1, 0.86)).toBeGreaterThan(0.5);
    expect(armsClosure(0.86)).toBe(0);
    expect(shipThrust(0, 0)).toBe(0);
    expect(shipThrust(1, 0)).toBe(1);
    expect(shipLift(1, 1, 0)).toBeGreaterThan(shipLift(1, 0, 0));
  });

  it('dessine une cloche nulle hors de son intervalle', () => {
    expect(bump(0.1, 0.2, 0.8)).toBe(0);
    expect(bump(0.5, 0.2, 0.8)).toBe(1);
    expect(bump(0.9, 0.2, 0.8)).toBe(0);
  });
});

describe('télémétrie', () => {
  const pts: TelemetryPoint[] = [
    { at: 0.5, time: 0, booster: { altitude: 0, speed: 0 }, ship: { altitude: 0, speed: 0 } },
    { at: 0.7, time: 100, booster: { altitude: 50, speed: 5000 }, ship: { altitude: 60, speed: 6000 } },
  ];

  it('interpole entre deux repères et borne aux extrémités', () => {
    expect(readTelemetry(pts, 0.6).booster.altitude).toBeCloseTo(25);
    expect(readTelemetry(pts, 0.6).ship.speed).toBeCloseTo(3000);
    expect(readTelemetry(pts, 0).time).toBe(0);
    expect(readTelemetry(pts, 1).time).toBe(100);
    expect(() => readTelemetry([], 0)).toThrow();
  });

  it('affiche le chronomètre de vol', () => {
    expect(formatMissionTime(0)).toBe('T+00:00:00');
    expect(formatMissionTime(162.7)).toBe('T+00:02:42');
    expect(formatMissionTime(3725)).toBe('T+01:02:05');
  });
});

describe('progression par section', () => {
  it('cale chaque section sur son index, même si elle est plus haute que l’écran', () => {
    const tops = [0, 800, 2000, 2800];
    expect(sectionProgress(0, tops, 3000)).toBe(0);
    expect(sectionProgress(800, tops, 3000)).toBeCloseTo(1 / 3);
    expect(sectionProgress(1400, tops, 3000)).toBeCloseTo(0.5);
    expect(sectionProgress(2800, tops, 3000)).toBe(1);
  });

  it('ramène les dernières sections au défilement maximal', () => {
    expect(sectionProgress(2500, [0, 1000, 2000, 3000], 2500)).toBe(1);
    expect(sectionProgress(100, [0], 1000)).toBe(0);
  });
});

describe('format', () => {
  it('écrit les nombres à la française', () => {
    expect(formatNumber(8240).replace(/\s/g, ' ')).toBe('8 240');
    expect(formatNumber(22.8, 1)).toBe('22,8');
  });

  it('décélère jusqu’à 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
  });
});

describe('repère du lanceur', () => {
  it('tourne autour de l’axe vertical sans déformer', () => {
    const [x, y, z] = toWorld([3, 7, 4]);
    expect(y).toBe(7);
    expect(Math.hypot(x, z)).toBeCloseTo(5);
  });
});

describe('séparation en altitude', () => {
  it('garde les étages assemblés pendant la première moitié de la montée', () => {
    expect(stage(0.5)).toBe(0);
    expect(stage(1)).toBe(1);
    expect(shipLift(0.8, 0.5, 0)).toBe(launchLift(0.8));
    expect(boosterThrust(0.8, 0.5, 0)).toBe(1);
  });

  it('sépare les étages bien au-dessus de la tour (plus de 100 m)', () => {
    // Début de la séparation : la fusée a parcouru l'essentiel de sa montée.
    expect(launchLift(0.83)).toBeGreaterThan(80);
  });
});
