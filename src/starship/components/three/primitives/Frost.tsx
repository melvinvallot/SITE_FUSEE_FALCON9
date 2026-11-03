import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CylinderGeometry, MeshStandardMaterial, type Mesh } from 'three';
import { clamp, smoothstep } from '../../../../lib/math';
import { RADIUS } from '../../../data/layout';
import { useSceneState } from '../SceneStateContext';
import { frostTexture } from '../textures';

interface FrostProps {
  bottom: number;
  top: number;
  /** Portion de la circonférence couverte (le bouclier thermique ne givre pas). */
  thetaStart?: number;
  thetaLength?: number;
}

/**
 * Givre blanc qui se forme sur l'acier des réservoirs remplis d'ergols à
 * −180 °C, visible au pas de tir puis qui disparaît pendant l'ascension.
 */
export function Frost({ bottom, top, thetaStart = 0, thetaLength = Math.PI * 2 }: FrostProps) {
  const state = useSceneState();
  const mesh = useRef<Mesh>(null);
  const h = top - bottom;
  const geometry = useMemo(() => {
    const g = new CylinderGeometry(RADIUS + 0.006, RADIUS + 0.006, h, 72, 1, true, thetaStart, thetaLength);
    // Le motif se répète tous les ~1,8 unité autour du fût, et une fois sur la hauteur.
    const uv = g.getAttribute('uv');
    const turns = ((RADIUS * thetaLength) / 1.8) | 0 || 1;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * turns);
    uv.needsUpdate = true;
    return g;
  }, [h, thetaStart, thetaLength]);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#f1f5f8',
        roughness: 0.92,
        metalness: 0,
        alphaMap: frostTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0,
      }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(() => {
    const s = state.current;
    const o = clamp(s.site) * (1 - smoothstep((s.launch - 0.2) / 0.6)) * (1 - clamp(s.explode * 3)) * (1 - clamp(s.cutaway * 3)) * (s.env < 0.5 ? 1 : 0);
    material.opacity = o * 0.9;
    if (mesh.current) mesh.current.visible = o > 0.01;
  });

  return <mesh ref={mesh} geometry={geometry} material={material} position={[0, bottom + h / 2, 0]} renderOrder={1} />;
}
