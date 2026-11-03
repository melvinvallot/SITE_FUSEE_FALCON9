import { useMemo } from 'react';
import { CylinderGeometry } from 'three';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { useMaterials } from '../materials';
import { STEEL_TILE, scaleUv } from '../textures';

const { base, top } = LAYOUT.hotStage;
const H = top - base;
const PILLARS = 30;
const BAND = 0.2;

/** Anneau de séparation à chaud : deux bandeaux reliés par des montants ajourés. */
export function HotStageRing() {
  const m = useMaterials();
  const band = useMemo(
    () => scaleUv(new CylinderGeometry(RADIUS + 0.01, RADIUS + 0.01, BAND, 72, 1, true), 2 * Math.PI * RADIUS, BAND, STEEL_TILE),
    [],
  );
  const pillarH = H - 2 * BAND;

  return (
    <group position={[0, base, 0]}>
      <mesh geometry={band} material={m.sooty} position={[0, BAND / 2, 0]} />
      <mesh geometry={band} material={m.sooty} position={[0, H - BAND / 2, 0]} />
      {Array.from({ length: PILLARS }, (_, i) => {
        const a = (i / PILLARS) * Math.PI * 2;
        return (
          <mesh
            key={i}
            material={m.sooty}
            position={[Math.sin(a) * RADIUS, BAND + pillarH / 2, Math.cos(a) * RADIUS]}
            rotation={[0, a, 0]}
          >
            <boxGeometry args={[0.1, pillarH, 0.07]} />
          </mesh>
        );
      })}
      {/* Intérieur sombre et bouclier du dôme du propulseur. */}
      <mesh material={m.cavity} position={[0, H / 2, 0]}>
        <cylinderGeometry args={[RADIUS - 0.12, RADIUS - 0.12, pillarH + 0.05, 48, 1, true]} />
      </mesh>
      <mesh material={m.sooty} position={[0, BAND - (RADIUS - 0.13) * Math.cos(Math.PI / 5), 0]}>
        <sphereGeometry args={[RADIUS - 0.13, 48, 12, 0, Math.PI * 2, 0, Math.PI / 5]} />
      </mesh>
      <mesh material={m.cavity} position={[0, H - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[RADIUS - 0.13, RADIUS + 0.01, 48]} />
      </mesh>
    </group>
  );
}
