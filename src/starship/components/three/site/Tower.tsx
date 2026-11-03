import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, MeshStandardMaterial, Object3D, type Group } from 'three';
import { lerp } from '../../../../lib/math';
import { GROUND_Y, RADIUS, TOWER_X } from '../../../data/layout';
import { armsClosure, ignition } from '../../../lib/flight';
import { useSceneState } from '../SceneStateContext';

const WIDTH = 2.6;
const TOP = 31.6;
const BAY = 2.4;
/** Hauteur du centre des bras : ils reposent sur les points de capture du propulseur. */
export const ARM_Y = 17.95;
const ARM_LENGTH = 7.8;
const ARM_Z = RADIUS + 0.26;
const QD_Y = 24.2;

interface Beam {
  pos: [number, number, number];
  size: [number, number, number];
  rot: [number, number, number];
}

/** Charpente en treillis : montants d'angle, traverses et croisillons sur les quatre faces. */
function latticeBeams(): Beam[] {
  const beams: Beam[] = [];
  const h = TOP - GROUND_Y;
  const half = WIDTH / 2;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      beams.push({ pos: [sx * half, GROUND_Y + h / 2, sz * half], size: [0.24, h, 0.24], rot: [0, 0, 0] });
    }
  }
  const bays = Math.floor(h / BAY);
  const diag = Math.hypot(WIDTH, BAY);
  const angle = Math.atan2(BAY, WIDTH);
  for (let b = 0; b <= bays; b++) {
    const y = GROUND_Y + b * BAY;
    for (const s of [-1, 1]) {
      beams.push({ pos: [0, y, s * half], size: [WIDTH, 0.14, 0.14], rot: [0, 0, 0] });
      beams.push({ pos: [s * half, y, 0], size: [0.14, 0.14, WIDTH], rot: [0, 0, 0] });
    }
    if (b === bays) continue;
    const cy = y + BAY / 2;
    for (const s of [-1, 1]) {
      for (const d of [-1, 1]) {
        beams.push({ pos: [0, cy, s * half], size: [diag, 0.08, 0.08], rot: [0, 0, d * angle] });
        beams.push({ pos: [s * half, cy, 0], size: [0.08, 0.08, diag], rot: [d * angle, 0, 0] });
      }
    }
  }
  return beams;
}

const dummy = new Object3D();

/** Bras de capture : poutre en caisson, rail supérieur et patin de contact. */
function Arm({ material, dark }: { material: MeshStandardMaterial; dark: MeshStandardMaterial }) {
  return (
    <group>
      <mesh material={material} position={[ARM_LENGTH / 2, 0, 0]}>
        <boxGeometry args={[ARM_LENGTH, 0.55, 0.36]} />
      </mesh>
      <mesh material={dark} position={[ARM_LENGTH / 2, 0.36, 0]}>
        <boxGeometry args={[ARM_LENGTH * 0.92, 0.12, 0.3]} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} material={dark} position={[0.5 + i * 0.85, 0, 0.19]}>
          <boxGeometry args={[0.06, 0.5, 0.02]} />
        </mesh>
      ))}
      <mesh material={dark} position={[ARM_LENGTH - 2.6, -0.3, 0]}>
        <boxGeometry args={[2.2, 0.08, 0.32]} />
      </mesh>
    </group>
  );
}

/**
 * Tour de lancement et de capture : treillis, chariot, deux bras mobiles
 * et bras d'avitaillement du vaisseau.
 */
export function Tower({ opacity }: { opacity: () => number }) {
  const state = useSceneState();
  const lattice = useRef<InstancedMesh>(null);
  const arms = useRef<(Group | null)[]>([]);
  const qd = useRef<Group>(null);
  const beams = useMemo(latticeBeams, []);
  const [steel, dark, light] = useMemo(
    () => [
      new MeshStandardMaterial({ color: '#4a5058', roughness: 0.6, metalness: 0.7, transparent: true }),
      new MeshStandardMaterial({ color: '#2b3036', roughness: 0.55, metalness: 0.75, transparent: true }),
      new MeshStandardMaterial({ color: '#ffe2b0', emissive: '#ffcf8a', emissiveIntensity: 3, toneMapped: false, transparent: true }),
    ],
    [],
  );

  useEffect(() => {
    const m = lattice.current;
    if (!m) return;
    beams.forEach((b, i) => {
      dummy.position.set(...b.pos);
      dummy.rotation.set(...b.rot);
      dummy.scale.set(...b.size);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [beams]);

  useEffect(
    () => () => {
      steel.dispose();
      dark.dispose();
      light.dispose();
    },
    [steel, dark, light],
  );

  useFrame(() => {
    const s = state.current;
    const o = opacity();
    for (const mat of [steel, dark, light]) {
      mat.opacity = o;
      mat.depthWrite = o > 0.98;
    }
    const open = lerp(0.62, 0, armsClosure(s.capture));
    arms.current.forEach((a, i) => a?.rotation.set(0, (i ? 1 : -1) * open, 0));
    qd.current?.rotation.set(0, Math.min(1, ignition(s.launch) * 1.5 + s.explode) * 1.2, 0);
  });

  const face = TOWER_X + WIDTH / 2;

  return (
    <group>
      <group position={[TOWER_X, 0, 0]}>
        <instancedMesh ref={lattice} args={[undefined, steel, beams.length]} frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
        {/* Chariot des bras, plateforme et grue au sommet, paratonnerre. */}
        <mesh material={dark} position={[0, ARM_Y, 0]}>
          <boxGeometry args={[WIDTH + 0.6, 1.5, WIDTH + 0.6]} />
        </mesh>
        <mesh material={dark} position={[0, TOP + 0.4, 0]}>
          <boxGeometry args={[WIDTH + 0.8, 0.8, WIDTH + 0.8]} />
        </mesh>
        <mesh material={steel} position={[0, TOP + 3.2, 0]}>
          <cylinderGeometry args={[0.05, 0.12, 4.8, 8]} />
        </mesh>
        <mesh material={light} position={[0, TOP + 5.7, 0]}>
          <sphereGeometry args={[0.12, 12, 8]} />
        </mesh>
        {[8, 16, 24].map((y) => (
          <mesh key={y} material={light} position={[WIDTH / 2 + 0.05, y, WIDTH / 2 + 0.05]}>
            <sphereGeometry args={[0.07, 8, 6]} />
          </mesh>
        ))}
      </group>
      {[1, -1].map((side, i) => (
        <group key={side} position={[face, ARM_Y, side * ARM_Z]}>
          <group ref={(g) => (arms.current[i] = g)}>
            <Arm material={steel} dark={dark} />
          </group>
        </group>
      ))}
      <group position={[face, QD_Y, 0]}>
        <group ref={qd}>
          <mesh material={dark} position={[(-TOWER_X - WIDTH / 2 - RADIUS) / 2, 0, 0]}>
            <boxGeometry args={[-TOWER_X - WIDTH / 2 - RADIUS, 0.7, 0.9]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
