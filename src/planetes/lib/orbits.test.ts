import { DESTINATIONS, EARTH, planetById } from '../data/planets';
import { cruiseEase, frameAt, timing } from './mission';
import {
  dayFromDate,
  daysToWindow,
  distanceKm,
  eccentricAnomaly,
  hohmann,
  lightMinutes,
  pathLengthKm,
  planMission,
  planetAngle,
  shipState,
  synodicDays,
  wrap,
} from './orbits';
import { durationText, formatKm, formatLight } from './format';

const mars = planetById('mars')!;
const NOW = dayFromDate(new Date(Date.UTC(2026, 10, 3)));

describe('transfert de Hohmann', () => {
  it.each([
    ['mercure', 105.5],
    ['venus', 146],
    ['mars', 259],
    ['jupiter', 997],
    ['saturne', 2209],
    ['uranus', 5857],
    ['neptune', 11_200],
  ])('%s : environ %d jours', (id, days) => {
    expect(hohmann(planetById(id)!).days).toBeGreaterThan(days * 0.98);
    expect(hohmann(planetById(id)!).days).toBeLessThan(days * 1.02);
  });

  it('les durées croissent avec la distance au Soleil, sauf pour les planètes intérieures', () => {
    const outer = DESTINATIONS.filter((p) => p.a > 1).map((p) => hohmann(p).days);
    expect([...outer].sort((a, b) => a - b)).toEqual(outer);
  });

  it('résout l’équation de Kepler', () => {
    const E = eccentricAnomaly(1.2, 0.6);
    expect(E - 0.6 * Math.sin(E)).toBeCloseTo(1.2, 10);
  });
});

describe('fenêtres de tir', () => {
  it('Mars revient tous les 26 mois environ', () => {
    expect(synodicDays(mars)).toBeGreaterThan(775);
    expect(synodicDays(mars)).toBeLessThan(785);
  });

  it('l’attente est comprise entre 0 et une période synodique', () => {
    for (const p of DESTINATIONS) {
      const w = daysToWindow(p, NOW);
      expect(w).toBeGreaterThanOrEqual(0);
      expect(w).toBeLessThan(synodicDays(p));
    }
  });

  it.each(DESTINATIONS.map((p) => [p.id]))('%s : la planète est au rendez-vous à l’arrivée', (id) => {
    const m = planMission(planetById(id)!, NOW);
    const end = shipState(m, m.arrivalDay);
    expect(end.r).toBeCloseTo(m.target.a, 6);
    const gap = wrap(end.angle - planetAngle(m.target, m.arrivalDay));
    expect(Math.min(gap, 2 * Math.PI - gap)).toBeLessThan(1e-6);
    const start = shipState(m, m.launchDay);
    expect(start.r).toBeCloseTo(EARTH.a, 6);
  });

  it('vitesse de départ vers Mars : environ 32,7 km/s autour du Soleil', () => {
    const m = planMission(mars, NOW);
    expect(shipState(m, m.launchDay).speed).toBeCloseTo(32.7, 0);
    expect(shipState(m, m.arrivalDay).speed).toBeCloseTo(21.5, 0);
  });
});

describe('distances', () => {
  it('trajet vers Mars : plus long que la ligne droite', () => {
    const km = pathLengthKm(hohmann(mars));
    expect(km).toBeGreaterThan(5e8);
    expect(km).toBeLessThan(7e8);
  });

  it('distance Terre-Mars entre 55 et 400 millions de km', () => {
    const d = distanceKm(EARTH, mars, NOW);
    expect(d).toBeGreaterThan(5.5e7);
    expect(d).toBeLessThan(4.01e8);
  });

  it('le Soleil est à 8 minutes-lumière', () => {
    expect(lightMinutes(149_597_870.7)).toBeCloseTo(8.3, 1);
  });
});

describe('mise en forme', () => {
  it('durées', () => {
    expect(durationText(30)).toBe('30 jours');
    expect(durationText(259)).toBe('8,5 mois');
    expect(durationText(11_200)).toBe('30,7 ans');
  });
  it('distances et délais', () => {
    expect(formatKm(6.5e8)).toBe('650 millions de km');
    expect(formatKm(1.43e9)).toBe('1,4 milliard de km');
    expect(formatKm(4.5e9)).toBe('4,5 milliards de km');
    expect(formatLight(3.2)).toBe('3 min');
    expect(formatLight(250)).toBe('4 h 10 min');
  });
});

describe('animation de la mission', () => {
  it('avance de la fenêtre de tir jusqu’à l’arrivée', () => {
    const m = planMission(mars, NOW);
    const t = timing(m);
    expect(frameAt(m, t, 0).day).toBeCloseTo(NOW, 6);
    expect(frameAt(m, t, t.window).day).toBeCloseTo(m.launchDay, 6);
    expect(frameAt(m, t, t.window + t.cruise).phase).toBe('arrived');
    expect(frameAt(m, t, 1e6).day).toBeCloseTo(m.arrivalDay, 6);
  });

  it('les longs trajets durent plus longtemps à l’écran', () => {
    const short = timing(planMission(planetById('mercure')!, NOW)).cruise;
    const long = timing(planMission(planetById('neptune')!, NOW)).cruise;
    expect(long).toBeGreaterThan(short);
    expect(long).toBeLessThan(30);
  });

  it('l’avancement est monotone', () => {
    let prev = -1;
    for (let s = 0; s <= 1; s += 0.01) {
      expect(cruiseEase(s)).toBeGreaterThan(prev);
      prev = cruiseEase(s);
    }
  });
});
