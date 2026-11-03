import { octawebLayout } from './EngineSection';

describe('octawebLayout', () => {
  it('place un moteur central et huit en couronne', () => {
    const engines = octawebLayout(0.25);
    expect(engines).toHaveLength(9);
    expect(engines[0]).toEqual([0, 0, 0]);
    for (const [x, , z] of engines.slice(1)) {
      expect(Math.hypot(x, z)).toBeCloseTo(0.25);
    }
  });
});
