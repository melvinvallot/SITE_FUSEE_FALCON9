import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type DirectionalLight, type HemisphereLight } from 'three';
import { clamp } from '../../../lib/math';
import { useSceneState } from './SceneStateContext';
import { SUN_DIRECTION } from './worlds/OrbitWorld';

/** Réglages d'éclairage par décor : nuit au pas de tir, orbite, Mars. */
const RIGS = [
  { sky: '#bcd3ef', ground: '#1a2433', hemi: 0.75, key: '#fff3e2', keyI: 2.6, keyPos: [14, 20, 12], fill: '#7fa6d9', fillI: 1.3 },
  { sky: '#0b1426', ground: '#3d6db5', hemi: 0.35, key: '#ffffff', keyI: 4.2, keyPos: [SUN_DIRECTION.x * 40, SUN_DIRECTION.y * 40, SUN_DIRECTION.z * 40 + 30], fill: '#3d6db5', fillI: 0.5 },
  { sky: '#f0c39a', ground: '#7a4127', hemi: 0.9, key: '#ffd9b0', keyI: 3.2, keyPos: [-20, 14, 18], fill: '#9bb2d8', fillI: 0.5 },
] as const;

const MARS_FOG = new Color('#8f5d3f');

/** Lumières et brume interpolées en continu d'un décor à l'autre. */
export function Lighting() {
  const state = useSceneState();
  const scene = useThree((s) => s.scene);
  const hemi = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const tmp = useRef({ a: new Color(), b: new Color() });
  const fog = useRef(new Fog(MARS_FOG, 1e4, 2e4));

  useFrame(() => {
    if (scene.fog !== fog.current) scene.fog = fog.current;
    const env = clamp(state.current.env, 0, 2);
    const i = Math.min(1, Math.floor(env));
    const t = env - i;
    const A = RIGS[i]!;
    const B = RIGS[i + 1]!;
    const { a, b } = tmp.current;
    const mix = (x: string, y: string) => a.set(x).lerp(b.set(y), t);
    if (hemi.current) {
      hemi.current.color.copy(mix(A.sky, B.sky));
      hemi.current.groundColor.copy(mix(A.ground, B.ground));
      hemi.current.intensity = A.hemi + (B.hemi - A.hemi) * t;
    }
    if (key.current) {
      key.current.color.copy(mix(A.key, B.key));
      key.current.intensity = A.keyI + (B.keyI - A.keyI) * t;
      key.current.position.set(
        A.keyPos[0] + (B.keyPos[0] - A.keyPos[0]) * t,
        A.keyPos[1] + (B.keyPos[1] - A.keyPos[1]) * t,
        A.keyPos[2] + (B.keyPos[2] - A.keyPos[2]) * t,
      );
    }
    if (fill.current) {
      fill.current.color.copy(mix(A.fill, B.fill));
      fill.current.intensity = A.fillI + (B.fillI - A.fillI) * t;
    }
    // Brume de poussière, seulement sur Mars.
    const dust = clamp(env - 1.5) * 2;
    fog.current.near = dust > 0 ? 60 : 1e4;
    fog.current.far = dust > 0 ? 260 : 2e4;
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={key} />
      <directionalLight ref={fill} position={[-16, 6, -14]} />
    </>
  );
}
