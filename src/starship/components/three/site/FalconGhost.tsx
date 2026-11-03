import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { AdditiveBlending, EdgesGeometry, LatheGeometry, LineBasicMaterial, MeshBasicMaterial, Vector2, type Group } from 'three';
import { smoothstep } from '../../../../lib/math';
import { LAYOUT, METERS_PER_UNIT } from '../../../data/layout';
import { useSceneState } from '../SceneStateContext';

/** Falcon 9 à la même échelle : 70 m de haut, 3,7 m de diamètre, coiffe de 5,2 m. */
const H = 70 / METERS_PER_UNIT;
const R = 3.7 / 2 / METERS_PER_UNIT;
const FAIRING_R = 5.2 / 2 / METERS_PER_UNIT;
const X = 4.8;

function profile(): Vector2[] {
  const pts = [new Vector2(0, 0), new Vector2(R, 0), new Vector2(R, H - 3.6), new Vector2(FAIRING_R, H - 3.25), new Vector2(FAIRING_R, H - 1.9)];
  for (let i = 1; i <= 10; i++) {
    const t = i / 10;
    pts.push(new Vector2(FAIRING_R * Math.sqrt(1 - t * t), H - 1.9 + t * 1.9));
  }
  return pts;
}

/** Silhouette holographique de Falcon 9, avec les repères de hauteur. */
export function FalconGhost() {
  const state = useSceneState();
  const group = useRef<Group>(null);
  const labels = useRef<(HTMLDivElement | null)[]>([]);
  const { fill, edges, fillMat, lineMat } = useMemo(() => {
    const fill = new LatheGeometry(profile(), 32);
    return {
      fill,
      edges: new EdgesGeometry(fill, 20),
      fillMat: new MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending }),
      lineMat: new LineBasicMaterial({ color: '#ffc773', transparent: true, opacity: 0 }),
    };
  }, []);

  useEffect(
    () => () => {
      fill.dispose();
      edges.dispose();
      fillMat.dispose();
      lineMat.dispose();
    },
    [fill, edges, fillMat, lineMat],
  );

  useFrame(() => {
    const s = state.current;
    const k = s.env < 0.5 ? smoothstep(s.compare) : 0;
    const g = group.current;
    if (g) {
      g.visible = k > 0.01;
      g.scale.set(1, Math.max(0.001, k), 1);
    }
    fillMat.opacity = 0.16 * k;
    lineMat.opacity = 0.75 * k;
    labels.current.forEach((l) => {
      if (l) l.style.opacity = String(k);
    });
  });

  return (
    <group>
      <group ref={group} position={[X, 0, 0]}>
        <mesh geometry={fill} material={fillMat} />
        <lineSegments geometry={edges} material={lineMat} />
      </group>
      <Html position={[X, H + 1.2, 0]} center zIndexRange={[1, 0]}>
        <div ref={(d) => (labels.current[0] = d)} className="scene-label">
          Falcon 9 · 70 m
        </div>
      </Html>
      <Html position={[0, LAYOUT.ship.top + 1.4, 0]} center zIndexRange={[1, 0]}>
        <div ref={(d) => (labels.current[1] = d)} className="scene-label scene-label--hot">
          Starship · 124 m
        </div>
      </Html>
    </group>
  );
}
