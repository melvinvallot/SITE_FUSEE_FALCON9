import { clamp, damp, lerp, lerpVec3, scrollProgress, smoothstep } from './math';

describe('math', () => {
  it('borne une valeur', () => {
    expect(clamp(-1)).toBe(0);
    expect(clamp(2)).toBe(1);
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('interpole linéairement', () => {
    expect(lerp(0, 10, 0.25)).toBe(2.5);
    expect(lerpVec3([0, 0, 0], [2, 4, 6], 0.5)).toEqual([1, 2, 3]);
  });

  it('adoucit les extrémités avec smoothstep', () => {
    expect(smoothstep(0)).toBe(0);
    expect(smoothstep(1)).toBe(1);
    expect(smoothstep(0.5)).toBe(0.5);
    expect(smoothstep(0.1)).toBeLessThan(0.1);
  });

  it('converge sans dépasser la cible', () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = damp(v, 1, 4, 1 / 60);
    expect(v).toBeGreaterThan(0.99);
    expect(v).toBeLessThanOrEqual(1);
  });

  it('calcule la progression du défilement', () => {
    expect(scrollProgress(0, 2000, 1000)).toBe(0);
    expect(scrollProgress(500, 2000, 1000)).toBe(0.5);
    expect(scrollProgress(5000, 2000, 1000)).toBe(1);
    expect(scrollProgress(100, 800, 1000)).toBe(0);
  });
});
