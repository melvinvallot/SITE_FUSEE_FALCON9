import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, InstancedMesh, Object3D, SpriteMaterial, type Group, type PointLight, type Sprite } from 'three';
import { glowTexture } from '../textures';
import { flameMaterial } from './flameMaterial';

interface PlumeProps {
  /** Positions (x, z) des tuyères, à la sortie y = 0 du groupe. */
  nozzles: readonly (readonly [number, number])[];
  /** Rayon de sortie d'une tuyère. */
  nozzleRadius: number;
  /** Rayon de l'enveloppe commune. */
  radius: number;
  length: number;
  /** Intensité (0..1), lue à chaque image. */
  intensity: () => number;
  /** Élargissement du panache (0 = niveau de la mer, 1 = vide spatial). */
  spread?: () => number;
  flicker?: boolean;
  light?: number;
}

const dummy = new Object3D();
/** Halos le long de l'axe : position relative (0 = tuyère), taille relative et intensité. */
const GLOWS = [
  { at: 0.03, size: 1.6, alpha: 0.7 },
  { at: 0.18, size: 2.1, alpha: 0.35 },
  { at: 0.4, size: 2.6, alpha: 0.16 },
] as const;

/**
 * Panache d'un groupe de moteurs, en couches volumétriques superposées :
 * - un dard par tuyère (instancié), blanc rosé avec ses disques de Mach ;
 * - un corps de flamme jaune orangé, turbulent, qui s'effiloche ;
 * - un manteau extérieur rougeoyant, qui s'évase fortement en altitude ;
 * - quelques halos face caméra près des tuyères.
 */
export function Plume({ nozzles, nozzleRadius, radius, length, intensity, spread, flicker = true, light = 120 }: PlumeProps) {
  const root = useRef<Group>(null);
  const cores = useRef<InstancedMesh>(null);
  const lamp = useRef<PointLight>(null);
  const glows = useRef<(Sprite | null)[]>([]);

  const [coreMat, bodyMat, mantleMat] = useMemo(
    () => [
      flameMaterial({
        hot: '#fff8ff',
        mid: '#ffc6e6',
        cool: '#ff8a3d',
        falloff: 1.2,
        diamonds: 2.4,
        gain: 3.2,
        turbulence: 0.3,
        speed: 9,
        r0: nozzleRadius * 0.95,
        r1: nozzleRadius * 1.25,
        length: length * 0.32,
        shape: 1.2,
      }),
      flameMaterial({
        hot: '#fff4d2',
        mid: '#ffb347',
        cool: '#ff5418',
        falloff: 1.25,
        gain: 2.5,
        turbulence: 0.85,
        speed: 7,
        seed: 3.7,
        r0: radius * 0.9,
        r1: radius * 1.5,
        length,
        shape: 1.4,
      }),
      flameMaterial({
        hot: '#ffc88a',
        mid: '#ff7a2a',
        cool: '#8f2606',
        falloff: 1.8,
        gain: 1.2,
        turbulence: 1,
        speed: 5,
        seed: 8.1,
        r0: radius,
        r1: radius * 2.3,
        length: length * 1.3,
        shape: 0.9,
      }),
    ],
    [nozzleRadius, radius, length],
  );
  const spriteMats = useMemo(
    () =>
      GLOWS.map(
        () =>
          new SpriteMaterial({
            map: glowTexture('rgba(255,236,190,1)', 'rgba(255,140,50,0.35)'),
            blending: AdditiveBlending,
            transparent: true,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [],
  );

  useEffect(
    () => () => {
      coreMat.dispose();
      bodyMat.dispose();
      mantleMat.dispose();
      spriteMats.forEach((m) => m.dispose());
    },
    [coreMat, bodyMat, mantleMat, spriteMats],
  );

  useEffect(() => {
    const m = cores.current;
    if (!m) return;
    nozzles.forEach(([x, z], i) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [nozzles]);

  useFrame(({ clock }) => {
    const ig = intensity();
    const g = root.current;
    if (!g) return;
    g.visible = ig > 0.002;
    if (lamp.current) lamp.current.intensity = 0;
    if (!g.visible) return;
    const t = clock.elapsedTime;
    const jitter = flicker ? 1 + Math.sin(t * 47) * 0.03 + Math.sin(t * 23.3) * 0.02 + Math.sin(t * 91.7) * 0.012 : 1;
    const wide = spread ? spread() : 0;
    const time = flicker ? t : 0;
    g.scale.set(1, (0.3 + 0.7 * ig) * jitter, 1);

    // En altitude, la pression extérieure chute : le panache s'évase et devient plus diffus.
    const body = bodyMat.uniforms;
    body.uR1!.value = radius * (1.5 + wide * 2.6);
    body.uLen!.value = length * (1 + wide * 0.35);
    body.uPow!.value = 1.4 - wide * 0.8;
    const mantle = mantleMat.uniforms;
    mantle.uR1!.value = radius * (2.3 + wide * 4.5);
    mantle.uLen!.value = length * 1.3 * (1 + wide * 0.4);
    mantle.uPow!.value = 0.9 - wide * 0.35;
    coreMat.uniforms.uR1!.value = nozzleRadius * (1.25 + wide * 2.2);

    for (const m of [coreMat, bodyMat, mantleMat]) m.uniforms.uTime!.value = time;
    // Les dards se superposent vus de profil : leur éclat est réparti entre les tuyères.
    coreMat.uniforms.uOpacity!.value = 1.4 * ig * Math.min(1, 2.6 / Math.sqrt(nozzles.length));
    body.uOpacity!.value = 1.05 * ig * (1 - wide * 0.45);
    mantle.uOpacity!.value = 0.7 * ig * (1 - wide * 0.5);
    GLOWS.forEach((cfg, i) => {
      const s = glows.current[i];
      if (!s) return;
      const size = radius * cfg.size * (1 + wide * 0.8);
      s.scale.set(size, size * 1.2, 1);
      s.position.set(0, -length * cfg.at, 0);
      spriteMats[i]!.opacity = Math.min(1, ig) * jitter * cfg.alpha;
    });
    if (lamp.current) lamp.current.intensity = light * ig * jitter;
  });

  return (
    <group>
      <group ref={root}>
        <instancedMesh ref={cores} args={[undefined, undefined, nozzles.length]} material={coreMat} frustumCulled={false}>
          <planeGeometry args={[1, 1, 1, 1]} />
        </instancedMesh>
        <mesh material={bodyMat} frustumCulled={false} renderOrder={3}>
          <planeGeometry args={[1, 1, 1, 1]} />
        </mesh>
        <mesh material={mantleMat} frustumCulled={false} renderOrder={3}>
          <planeGeometry args={[1, 1, 1, 1]} />
        </mesh>
        {GLOWS.map((_, i) => (
          <sprite
            key={i}
            ref={(el) => {
              glows.current[i] = el;
            }}
            material={spriteMats[i]}
          />
        ))}
      </group>
      <pointLight ref={lamp} position={[0, -radius * 2.5, 0]} color="#ffa04d" intensity={0} distance={radius * 40} decay={2} />
    </group>
  );
}
