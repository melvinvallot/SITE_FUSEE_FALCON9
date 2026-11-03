import { describe, expect, it } from 'vitest';
import { framingFor, lateralScale, maxPixelRatio } from './device';

describe('format de l’écran', () => {
  it('classe les écrans : téléphone debout, ordinateur, téléphone couché', () => {
    expect(framingFor(390 / 844)).toBe('portrait');
    expect(framingFor(820 / 1180)).toBe('portrait');
    expect(framingFor(1280 / 800)).toBe('standard');
    expect(framingFor(1180 / 820)).toBe('standard');
    expect(framingFor(844 / 390)).toBe('wide');
  });

  it('écarte la fusée du texte seulement sur écran panoramique, avec une limite', () => {
    expect(lateralScale(1280 / 800)).toBe(1);
    expect(lateralScale(1)).toBe(1);
    expect(lateralScale(844 / 390)).toBeCloseTo(1.83, 2);
    expect(lateralScale(5)).toBe(2);
  });

  it('plafonne la résolution 3D sur les appareils modestes', () => {
    expect(maxPixelRatio(2, false)).toBe(2);
    expect(maxPixelRatio(2, true)).toBe(1.5);
    expect(maxPixelRatio(1.25, true)).toBe(1.25);
  });
});
