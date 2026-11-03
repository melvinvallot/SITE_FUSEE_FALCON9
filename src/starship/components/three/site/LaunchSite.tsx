import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshBasicMaterial, MeshStandardMaterial, SpriteMaterial, type Group } from 'three';
import { smoothstep } from '../../../../lib/math';
import { GROUND_Y } from '../../../data/layout';
import { Steam } from '../primitives/Steam';
import { useSceneState } from '../SceneStateContext';
import { concreteTexture, glowTexture } from '../textures';
import { Tower } from './Tower';
import { FalconGhost } from './FalconGhost';

const RING_OUTER = 2.1;
const RING_INNER = 1.25;
const LEG_RADIUS = 2.1;

/** Pas de tir de Starbase : sol, table de lancement, tour, réservoirs et projecteurs. */
export function LaunchSite() {
  const state = useSceneState();
  const group = useRef<Group>(null);
  const fade = useRef(1);

  const mats = useMemo(() => {
    const concrete = concreteTexture().clone();
    concrete.repeat.set(6, 6);
    concrete.needsUpdate = true;
    return {
      mount: new MeshStandardMaterial({ color: '#8d9298', roughness: 0.5, metalness: 0.6, transparent: true }),
      deck: new MeshStandardMaterial({ color: '#3a3f45', roughness: 0.6, metalness: 0.7, transparent: true }),
      concrete: new MeshStandardMaterial({ map: concrete, color: '#7f848a', roughness: 0.95, metalness: 0, transparent: true }),
      tank: new MeshStandardMaterial({ color: '#cfd3d8', roughness: 0.35, metalness: 0.7, transparent: true }),
      glow: new MeshBasicMaterial({ map: glowTexture('rgba(150,170,205,0.55)', 'rgba(60,80,115,0.22)'), transparent: true, depthWrite: false }),
      lamp: new SpriteMaterial({ map: glowTexture('rgba(255,236,200,1)', 'rgba(255,190,120,0.25)'), transparent: true, depthWrite: false, toneMapped: false }),
    };
  }, []);

  useEffect(
    () => () =>
      Object.values(mats).forEach((m) => {
        m.dispose();
      }),
    [mats],
  );

  useFrame(() => {
    const s = state.current;
    // Le pas de tir s'efface quand la fusée monte haut dans l'atmosphère.
    fade.current = s.env < 0.5 ? s.site * (1 - smoothstep((s.alt - 0.32) / 0.38)) : 0;
    const o = fade.current;
    if (group.current) group.current.visible = o > 0.01;
    for (const m of Object.values(mats)) {
      m.opacity = m === mats.glow ? o * 0.9 : o;
      if (m instanceof MeshStandardMaterial) m.depthWrite = o > 0.98;
    }
  });

  return (
    <>
      <group ref={group}>
        {/* Sol */}
        <mesh material={mats.glow} position={[0, GROUND_Y - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[90, 64]} />
        </mesh>
        <mesh material={mats.concrete} position={[0, GROUND_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[16, 64]} />
        </mesh>
        {/* Table de lancement : anneau sur six piliers, pinces et déflecteur refroidi par eau. */}
        <mesh material={mats.mount} position={[0, -0.6, 0]}>
          <cylinderGeometry args={[RING_OUTER, RING_OUTER, 1.2, 48, 1, true]} />
        </mesh>
        <mesh material={mats.deck} position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[RING_INNER, RING_OUTER, 48]} />
        </mesh>
        <mesh material={mats.deck} position={[0, -1.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[RING_INNER, RING_OUTER, 48]} />
        </mesh>
        {Array.from({ length: 20 }, (_, i) => {
          const a = (i / 20) * Math.PI * 2;
          return (
            <mesh key={i} material={mats.deck} position={[Math.sin(a) * 1.3, 0.18, Math.cos(a) * 1.3]} rotation={[0, a, 0]}>
              <boxGeometry args={[0.16, 0.36, 0.22]} />
            </mesh>
          );
        })}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
          return (
            <mesh key={i} material={mats.mount} position={[Math.sin(a) * LEG_RADIUS, (GROUND_Y - 1.2) / 2, Math.cos(a) * LEG_RADIUS]}>
              <boxGeometry args={[0.55, -GROUND_Y - 1.2, 0.55]} />
            </mesh>
          );
        })}
        <mesh material={mats.deck} position={[0, GROUND_Y + 1.2, 0]}>
          <cylinderGeometry args={[2.4, 2.6, 0.3, 48]} />
        </mesh>
        {/* Réservoirs d'ergols (ferme de stockage) et projecteurs. */}
        <group position={[19, GROUND_Y, -16]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} material={mats.tank} position={[i * 2.4, 1.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1, 1, 9, 24]} />
            </mesh>
          ))}
          {[0, 1].map((i) => (
            <mesh key={i} material={mats.tank} position={[-4 - i * 4.5, 3.5, 2]}>
              <cylinderGeometry args={[1.6, 1.6, 7, 28]} />
            </mesh>
          ))}
        </group>
        {[
          [11, 9],
          [-12, -8],
          [9, -13],
          [-9, 12],
        ].map(([x, z]) => (
          <group key={`${x}${z}`} position={[x!, GROUND_Y, z!]}>
            <mesh material={mats.deck} position={[0, 3, 0]}>
              <cylinderGeometry args={[0.07, 0.1, 6, 8]} />
            </mesh>
            <sprite material={mats.lamp} position={[0, 6.1, 0]} scale={[2.4, 2.4, 1]} />
          </group>
        ))}
        <Tower opacity={() => fade.current} />
      </group>
      <Steam ground={GROUND_Y} />
      <FalconGhost />
    </>
  );
}
