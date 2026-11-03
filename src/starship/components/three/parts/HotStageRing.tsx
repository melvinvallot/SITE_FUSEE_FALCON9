import { useMemo } from 'react';
import { BoxGeometry, CylinderGeometry } from 'three';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { FINE, Kit, useKits } from '../detail';
import { useMaterials } from '../materials';
import { STEEL_TILE, scaleUv } from '../textures';

const { base, top } = LAYOUT.hotStage;
const H = top - base;
const PILLARS = 30;
const BAND = 0.2;
const DOME_R = RADIUS - 0.13;
const DOME_ANGLE = Math.PI / 5;
const DOME_Y = BAND - DOME_R * Math.cos(DOME_ANGLE);

/**
 * Anneau de séparation à chaud : deux bandeaux boulonnés reliés par des
 * montants, avec des déflecteurs inclinés dans chaque ouverture pour
 * évacuer les flammes du vaisseau, et un bouclier nervuré sur le dôme du propulseur.
 */
export function HotStageRing() {
  const m = useMaterials();
  const band = useMemo(
    () => scaleUv(new CylinderGeometry(RADIUS + 0.01, RADIUS + 0.01, BAND, 72, 1, true), 2 * Math.PI * RADIUS, BAND, STEEL_TILE),
    [],
  );
  const pillarH = H - 2 * BAND;

  const g = useKits(() => {
    const sooty = new Kit();
    const plumbing = new Kit();
    const gap = (2 * Math.PI * RADIUS) / PILLARS - 0.1;
    for (let i = 0; i < PILLARS; i++) {
      const a = (i / PILLARS) * Math.PI * 2;
      // Montant en I : âme et deux semelles.
      sooty.onHull(new BoxGeometry(0.1, pillarH, 0.035), a, BAND + pillarH / 2, RADIUS, [0, 0, 0.0]);
      sooty.onHull(new BoxGeometry(0.03, pillarH, 0.1), a, BAND + pillarH / 2, RADIUS, [0, 0, -0.05]);
      // Déflecteurs inclinés vers le bas dans l'ouverture suivante.
      const mid = a + Math.PI / PILLARS;
      for (let k = 0; k < 3; k++) {
        const y = BAND + pillarH * (0.22 + k * 0.28);
        sooty.onHull(new BoxGeometry(gap * 0.92, 0.022, 0.12), mid, y, RADIUS - 0.04, [0, 0, 0], [0.65, 0, 0]);
      }
      if (FINE) {
        // Goussets aux pieds et en tête des montants.
        for (const y of [BAND + 0.04, H - BAND - 0.04]) sooty.onHull(new BoxGeometry(0.16, 0.05, 0.03), a, y, RADIUS, [0, 0, 0.01]);
      }
    }
    if (FINE) {
      // Rangées de boulons sur les deux bandeaux.
      for (const y of [0.05, BAND - 0.05, H - BAND + 0.05, H - 0.05]) {
        for (let i = 0; i < 90; i++)
          plumbing.onHull(new CylinderGeometry(0.008, 0.008, 0.012, 6), ((i + 0.5) / 90) * Math.PI * 2, y, RADIUS + 0.01, [0, 0, 0.004], [Math.PI / 2, 0, 0]);
      }
    }
    // Nervures radiales et moyeu du bouclier de dôme.
    const ribs = 16;
    const thMid = DOME_ANGLE / 2;
    for (let i = 0; i < ribs; i++) {
      const phi = (i / ribs) * Math.PI * 2;
      const r = DOME_R + 0.012;
      sooty.add(
        new BoxGeometry(DOME_R * DOME_ANGLE, 0.03, 0.035),
        [r * Math.sin(thMid) * Math.cos(phi), DOME_Y + r * Math.cos(thMid), -r * Math.sin(thMid) * Math.sin(phi)],
        [0, phi, -thMid],
      );
    }
    sooty.add(new CylinderGeometry(0.16, 0.2, 0.06, 24), [0, BAND + 0.02, 0]);
    sooty.ring(DOME_R * Math.sin(DOME_ANGLE * 0.55), 0.014, DOME_Y + DOME_R * Math.cos(DOME_ANGLE * 0.55), Math.PI * 2, 0, 48);
    return { sooty: sooty.build(STEEL_TILE), plumbing: plumbing.build() };
  });

  return (
    <group position={[0, base, 0]}>
      <mesh geometry={band} material={m.sooty} position={[0, BAND / 2, 0]} />
      <mesh geometry={band} material={m.sooty} position={[0, H - BAND / 2, 0]} />
      <mesh geometry={g.sooty} material={m.sooty} />
      <mesh geometry={g.plumbing} material={m.fitting} />
      {/* Intérieur sombre et bouclier du dôme du propulseur. */}
      <mesh material={m.cavity} position={[0, H / 2, 0]}>
        <cylinderGeometry args={[RADIUS - 0.12, RADIUS - 0.12, pillarH + 0.05, 48, 1, true]} />
      </mesh>
      <mesh material={m.sooty} position={[0, DOME_Y, 0]}>
        <sphereGeometry args={[DOME_R, 48, 12, 0, Math.PI * 2, 0, DOME_ANGLE]} />
      </mesh>
      <mesh material={m.cavity} position={[0, H - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RADIUS - 0.13, RADIUS + 0.01, 48]} />
      </mesh>
    </group>
  );
}
