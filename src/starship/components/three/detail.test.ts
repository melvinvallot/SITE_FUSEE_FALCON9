import { BoxGeometry, Vector3 } from 'three';
import { STACK_YAW, toWorld } from '../../data/layout';
import { Kit, projectUv, towerAngle } from './detail';

describe('Kit (fusion des micro-détails)', () => {
  it('fusionne toutes les pièces en une seule géométrie', () => {
    const k = new Kit().box([1, 1, 1], [0, 0, 0]).box([1, 1, 1], [2, 0, 0]).ring(1, 0.01, 3);
    const g = k.build();
    const box = new BoxGeometry(1, 1, 1).getAttribute('position').count;
    expect(g.getAttribute('position').count).toBeGreaterThan(2 * box);
    g.computeBoundingBox();
    expect(g.boundingBox!.max.y).toBeCloseTo(3.01, 2);
    expect(k.empty).toBe(true);
  });

  it('pose une pièce sur la coque, face vers l’extérieur', () => {
    const g = new Kit().onHull(new BoxGeometry(0.1, 0.1, 0.1), Math.PI / 2, 5, 1).build();
    g.computeBoundingBox();
    // Angle π/2 : la pièce est du côté +x, centrée à la hauteur 5.
    expect(g.boundingBox!.getCenter(new Vector3()).x).toBeCloseTo(1, 5);
  });

  it('projette les UV à l’échelle réelle', () => {
    const g = new BoxGeometry(4, 4, 4);
    projectUv(g, { u: 2, v: 2 });
    const uv = g.getAttribute('uv');
    const us = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
    expect(Math.max(...us) - Math.min(...us)).toBeCloseTo(2, 5);
  });
});

describe('towerAngle', () => {
  it('pointe vers la tour (–x de la scène)', () => {
    const a = towerAngle(STACK_YAW);
    const [x, , z] = toWorld([Math.sin(a), 0, Math.cos(a)]);
    expect(x).toBeCloseTo(-1, 5);
    expect(z).toBeCloseTo(0, 5);
  });
});
