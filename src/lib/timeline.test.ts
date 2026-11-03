import type { Keyframe } from '../types';
import { activeIndex, locate, PART_IDS, sampleTimeline } from './timeline';

const frame = (overrides: Partial<Keyframe>): Keyframe => ({
  sectionId: 'x',
  cameraPosition: [0, 0, 0],
  cameraTarget: [0, 0, 0],
  explode: 0,
  legs: 0,
  launch: 0,
  spin: 0,
  focus: null,
  ...overrides,
});

describe('locate', () => {
  it('trouve les images clés encadrantes', () => {
    expect(locate(5, 0)).toEqual({ from: 0, to: 1, t: 0 });
    expect(locate(5, 1)).toEqual({ from: 3, to: 4, t: 1 });
    expect(locate(5, 0.5)).toMatchObject({ from: 2, to: 3, t: 0 });
  });

  it('gère une seule image clé et refuse une liste vide', () => {
    expect(locate(1, 0.7)).toEqual({ from: 0, to: 0, t: 0 });
    expect(() => locate(0, 0)).toThrow();
  });
});

describe('sampleTimeline', () => {
  const keyframes = [
    frame({ cameraPosition: [0, 0, 10], explode: 0 }),
    frame({ cameraPosition: [0, 10, 10], explode: 1, focus: 'fairing' }),
    frame({ cameraPosition: [0, 20, 10], explode: 1, focus: 'engines' }),
  ];

  it('restitue exactement une image clé', () => {
    const s = sampleTimeline(keyframes, 0.5);
    expect(s.cameraPosition).toEqual([0, 10, 10]);
    expect(s.explode).toBe(1);
    expect(s.focus.fairing).toBe(1);
    expect(s.focus.engines).toBe(0);
  });

  it('fait un fondu de la mise en valeur entre deux pièces', () => {
    const s = sampleTimeline(keyframes, 0.75);
    expect(s.focus.fairing).toBeCloseTo(0.5);
    expect(s.focus.engines).toBeCloseTo(0.5);
    expect(s.cameraPosition[1]).toBeCloseTo(15);
  });

  it('renseigne toutes les pièces', () => {
    const s = sampleTimeline(keyframes, 0);
    expect(Object.keys(s.focus).sort()).toEqual([...PART_IDS].sort());
  });
});

describe('activeIndex', () => {
  it("arrondit à la section la plus proche", () => {
    expect(activeIndex(10, 0)).toBe(0);
    expect(activeIndex(10, 1)).toBe(9);
    expect(activeIndex(10, 0.5)).toBe(5);
    expect(activeIndex(1, 0.8)).toBe(0);
  });
});
