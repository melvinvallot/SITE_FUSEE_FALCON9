import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Color, Fog, type DirectionalLight, type HemisphereLight } from 'three';
import { clamp } from '../../../lib/math';
import { useSceneState } from './SceneStateContext';
import { SUN_DIRECTION } from './worlds/OrbitWorld';
import { MOON_SUN } from './worlds/MoonWorld';

const SPACE = { sky: '#0b1426', ground: '#3d6db5', hemi: 0.3, key: '#fff6ea', keyI: 2.4, keyPos: [SUN_DIRECTION.x * 40, SUN_DIRECTION.y * 40, SUN_DIRECTION.z * 40 + 30], fill: '#3d6db5', fillI: 0.5 } as const;

/** Réglages d'éclairage par décor : nuit au pas de tir, orbite (deux décors), Lune. */
const RIGS = [
  { sky: '#bcd3ef', ground: '#1a2433', hemi: 0.75, key: '#fff3e2', keyI: 2.6, keyPos: [14, 20, 12], fill: '#7fa6d9', fillI: 1.3 },
  SPACE,
  SPACE,
  // Lune : Soleil cru et rasant, pas de ciel pour adoucir les ombres, un peu de clair de Terre.
  { sky: '#1a2233', ground: '#4a4845', hemi: 0.22, key: '#fffaf2', keyI: 3.4, keyPos: [MOON_SUN.x * 40, MOON_SUN.y * 40, MOON_SUN.z * 40], fill: '#6f8fc4', fillI: 0.35 },
] as const;

const FOG = new Color('#000000');

/** Lumières et brume interpolées en continu d'un décor à l'autre. */
export function Lighting() {
  const state = useSceneState();
  const scene = useThree((s) => s.scene);
  const hemi = useRef<HemisphereLight>(null);
  const key = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const tmp = useRef({ a: new Color(), b: new Color() });
  const fog = useRef(new Fog(FOG, 1e4, 2e4));

  useFrame(() => {
    if (scene.fog !== fog.current) scene.fog = fog.current;
    const env = clamp(state.current.env, 0, RIGS.length - 1);
    const i = Math.min(RIGS.length - 2, Math.floor(env));
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
  });

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight ref={key} />
      <directionalLight ref={fill} position={[-16, 6, -14]} />
    </>
  );
}
