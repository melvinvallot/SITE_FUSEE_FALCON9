import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace, type Group } from 'three';
import { useSceneState } from './SceneStateContext';
import { Smoke } from './primitives/Smoke';

const GROUND_Y = -1.45;

function glowTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(160,182,214,0.55)');
    g.addColorStop(0.35, 'rgba(90,112,148,0.22)');
    g.addColorStop(1, 'rgba(14,26,43,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Sol et bras de maintien, visibles seulement quand le lanceur est assemblé. */
export function LaunchSite() {
  const state = useSceneState();
  const group = useRef<Group>(null);
  const material = useMemo(
    () => new MeshBasicMaterial({ map: glowTexture(), transparent: true, depthWrite: false }),
    [],
  );

  useEffect(
    () => () => {
      material.map?.dispose();
      material.dispose();
    },
    [material],
  );

  useFrame(() => {
    const visibility = 1 - state.current.explode;
    material.opacity = visibility;
    if (group.current) group.current.visible = visibility > 0.01;
  });

  return (
    <>
      <group ref={group}>
        <mesh position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
          <circleGeometry args={[9, 64]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.62, GROUND_Y + 0.4, Math.sin(a) * 0.62]}>
              <boxGeometry args={[0.08, 0.8, 0.08]} />
              <meshStandardMaterial color="#5d6670" metalness={0.7} roughness={0.4} />
            </mesh>
          );
        })}
      </group>
      <Smoke ground={GROUND_Y} />
    </>
  );
}
