import { BoxGeometry, CylinderGeometry } from 'three';
import { LAYOUT, RADIUS, STACK_YAW } from '../../../data/layout';
import { FINE, Kit, towerAngle, useKits } from '../detail';
import type { MaterialSet } from '../materials';
import { STEEL_TILE } from '../textures';
import { RACEWAY_ANGLE, RING_PITCH, qdPlate } from './ShipDetails';

const { top } = LAYOUT.booster;
const SKIRT = 1.1;

/**
 * Détails du propulseur : cordons de soudure, jupe arrière raidie et
 * ajourée, colliers de la gaine de câbles, conduite secondaire, évents de
 * méthane, bride supérieure boulonnée, renforts des points de capture et
 * plaque de raccordement au sol.
 */
export function BoosterDetails({ m, catchPinY }: { m: MaterialSet; catchPinY: number }) {
  const g = useKits(() => {
    const steel = new Kit();
    const sooty = new Kit();
    const cavity = new Kit();
    const plumbing = new Kit();

    for (let y = RING_PITCH * 3; y < top - 0.2; y += RING_PITCH) steel.ring(RADIUS + 0.003, 0.0055, y, Math.PI * 2);

    // Jupe arrière : bandeaux, raidisseurs et ouïes de ventilation du compartiment moteurs.
    sooty.ring(RADIUS + 0.04, 0.016, 0.03, Math.PI * 2);
    sooty.ring(RADIUS + 0.025, 0.012, SKIRT, Math.PI * 2);
    const ribs = 40;
    for (let i = 0; i < ribs; i++) {
      const a = (i / ribs) * Math.PI * 2;
      sooty.onHull(new BoxGeometry(0.035, SKIRT - 0.08, 0.03), a, SKIRT / 2, RADIUS + 0.03);
      if (FINE && i % 2 === 0) {
        const mid = a + Math.PI / ribs;
        cavity.onHull(new BoxGeometry(0.1, 0.16, 0.01), mid, 0.78, RADIUS + 0.035);
        sooty.onHull(new BoxGeometry(0.12, 0.02, 0.03), mid, 0.87, RADIUS + 0.04);
      }
    }

    // Gaine de câbles : colliers et conduite secondaire avec ses supports.
    for (let y = 1.4; y < 16; y += 0.5) sooty.onHull(new BoxGeometry(0.34, 0.035, 0.03), RACEWAY_ANGLE, y, RADIUS, [0, 0, 0.1]);
    const pipeA = RACEWAY_ANGLE - 0.22;
    plumbing.onHull(new CylinderGeometry(0.026, 0.026, 15.2, 10), pipeA, 1.25 + 7.6, RADIUS, [0, 0, 0.045]);
    if (FINE) {
      for (let y = 1.6; y < 16.4; y += 0.45) sooty.onHull(new BoxGeometry(0.08, 0.025, 0.07), pipeA, y, RADIUS, [0, 0, 0.035]);
      for (const y of [3.0, 9.85, 15.0]) sooty.onHull(new BoxGeometry(0.24, 0.36, 0.08), RACEWAY_ANGLE + 0.24, y, RADIUS, [0, 0, 0.035]);
    }

    // Bride supérieure, sous l'anneau de séparation.
    sooty.ring(RADIUS + 0.01, 0.018, top - 0.04, Math.PI * 2);
    if (FINE) {
      for (let i = 0; i < 72; i++)
        plumbing.onHull(new CylinderGeometry(0.009, 0.009, 0.012, 6), (i / 72) * Math.PI * 2, top - 0.1, RADIUS, [0, 0, 0.006], [Math.PI / 2, 0, 0]);
    }

    // Évents de méthane et d'oxygène (dégazage au pas de tir).
    for (const [a, y] of [
      [Math.PI / 2 + 0.25, top - 0.55],
      [-Math.PI / 2 - 0.25, top - 0.55],
      [Math.PI / 2 + 0.25, 9.3],
    ] as const) {
      sooty.onHull(new BoxGeometry(0.2, 0.22, 0.03), a, y, RADIUS, [0, 0, 0.012]);
      plumbing.onHull(new CylinderGeometry(0.035, 0.04, 0.12, 12), a, y, RADIUS, [0, 0, 0.07], [Math.PI / 2, 0, 0]);
      cavity.onHull(new CylinderGeometry(0.024, 0.024, 0.01, 12), a, y, RADIUS, [0, 0, 0.132], [Math.PI / 2, 0, 0]);
    }

    // Renforts autour des points de capture (tôles doublées, boulonnées).
    for (const side of [1, -1]) {
      const a = Math.atan2(-side * Math.sin(STACK_YAW), side * Math.cos(STACK_YAW));
      sooty.onHull(new BoxGeometry(0.62, 0.55, 0.02), a, catchPinY - 0.05, RADIUS, [0, 0, 0.006]);
      sooty.onHull(new BoxGeometry(0.08, 0.5, 0.12), a, catchPinY - 0.25, RADIUS, [0.17, 0, 0.04]);
      sooty.onHull(new BoxGeometry(0.08, 0.5, 0.12), a, catchPinY - 0.25, RADIUS, [-0.17, 0, 0.04]);
      if (FINE)
        for (let i = 0; i < 6; i++)
          for (const dy of [-0.28, 0.18])
            plumbing.onHull(new CylinderGeometry(0.01, 0.01, 0.012, 6), a, catchPinY + dy, RADIUS, [-0.25 + i * 0.1, 0, 0.02], [Math.PI / 2, 0, 0]);
    }

    // Plaque de raccordement au sol, tournée vers la tour, juste au-dessus de la jupe.
    qdPlate(sooty, cavity, plumbing, towerAngle(STACK_YAW) - 0.4, SKIRT + 0.45, RADIUS, 0.72, 0.46);

    return { steel: steel.build(STEEL_TILE), sooty: sooty.build(STEEL_TILE), cavity: cavity.build(), plumbing: plumbing.build() };
  });

  return (
    <group>
      <mesh geometry={g.steel} material={m.steel} />
      <mesh geometry={g.sooty} material={m.sooty} />
      <mesh geometry={g.cavity} material={m.hole} />
      <mesh geometry={g.plumbing} material={m.fitting} />
    </group>
  );
}
