import { useEffect, useMemo, useRef } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  AdditiveBlending,
  Color,
  IcosahedronGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  SpriteMaterial,
  Vector3,
  type Group,
  type Mesh,
} from 'three';
import { glowTexture } from '../../../starship/components/three/textures';
import type { Planet, PlanetId } from '../../data/planets';
import { sceneRadius } from '../../lib/scale';
import { cloudMaterial, coronaMaterial, haloMaterial, ringMaterial, skyMaterial, sunMaterial, surfaceMaterial } from './shaders/planetShaders';
import { useSim } from './sim';

export const SUN_RADIUS = 7;
const DEG = Math.PI / 180;

/** Libère les matériaux créés par un composant quand il disparaît. */
function useDispose(...materials: { dispose: () => void }[]) {
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
}

/* ---------- Soleil ---------- */

export function Sun() {
  const surface = useMemo(sunMaterial, []);
  const corona = useMemo(coronaMaterial, []);
  const glow = useMemo(
    () =>
      new SpriteMaterial({
        map: glowTexture('rgba(255,236,200,1)', 'rgba(255,140,40,0.35)'),
        color: new Color(2.2, 1.5, 0.9),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    [],
  );
  const halo = useMemo(
    () =>
      new SpriteMaterial({
        map: glowTexture('rgba(255,170,90,0.5)', 'rgba(255,90,20,0.08)'),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.22,
      }),
    [],
  );
  useDispose(surface, corona, glow, halo);
  const disc = useRef<Mesh>(null);

  useFrame(({ clock }) => {
    surface.uniforms.uTime!.value = clock.elapsedTime;
    corona.uniforms.uTime!.value = clock.elapsedTime;
    if (disc.current) disc.current.rotation.y = clock.elapsedTime * 0.01;
  });

  return (
    <group>
      <mesh ref={disc} material={surface}>
        <sphereGeometry args={[SUN_RADIUS, 96, 64]} />
      </mesh>
      <mesh material={corona} scale={1.6}>
        <sphereGeometry args={[SUN_RADIUS, 64, 32]} />
      </mesh>
      <sprite material={glow} scale={SUN_RADIUS * 4.5} />
      <sprite material={halo} scale={SUN_RADIUS * 14} />
      <pointLight intensity={7} decay={0} color="#fff3e0" />
    </group>
  );
}

/* ---------- Planètes ---------- */

const ATMOSPHERES: Partial<Record<Planet['look'], { color: string; rim: number; halo: number; scale: number }>> = {
  earth: { color: '#4f8dff', rim: 1.1, halo: 1.6, scale: 1.06 },
  venus: { color: '#ffd9a0', rim: 0.6, halo: 0.9, scale: 1.07 },
  mars: { color: '#ff9a6a', rim: 0.45, halo: 0.55, scale: 1.04 },
  jupiter: { color: '#ffe2b8', rim: 0.25, halo: 0.35, scale: 1.03 },
  saturn: { color: '#ffe9b8', rim: 0.25, halo: 0.35, scale: 1.03 },
  uranus: { color: '#9ff4ff', rim: 0.6, halo: 0.7, scale: 1.05 },
  neptune: { color: '#5c8dff', rim: 0.7, halo: 0.9, scale: 1.05 },
};

interface PlanetBodyProps {
  planet: Planet;
  selected: boolean;
  onSelect?: (id: PlanetId) => void;
}

export function PlanetBody({ planet, selected, onSelect }: PlanetBodyProps) {
  const sim = useSim();
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const clouds = useRef<Mesh>(null);
  const label = useRef<HTMLButtonElement>(null);
  const R = planet.radius;
  const atmo = ATMOSPHERES[planet.look];
  const ringKind = planet.look === 'saturn' ? 'saturn' : planet.look === 'uranus' ? 'uranus' : null;
  const ringInner = ringKind === 'saturn' ? R * 1.24 : R * 1.6;
  const ringOuter = ringKind === 'saturn' ? R * 2.3 : R * 2.05;

  const surface = useMemo(
    () =>
      surfaceMaterial({
        look: planet.look,
        radius: R,
        tint: planet.id === 'mercure' ? '#a59a8f' : undefined,
        atmo: atmo?.color,
        atmoStrength: atmo?.rim ?? 0,
        rings: ringKind === 'saturn',
      }),
    [planet, R, atmo, ringKind],
  );
  const halo = useMemo(() => (atmo ? haloMaterial(atmo.color, atmo.scale, atmo.halo) : null), [atmo]);
  const cloudMat = useMemo(() => (planet.look === 'earth' ? cloudMaterial() : null), [planet.look]);
  const rings = useMemo(() => (ringKind ? ringMaterial(ringInner, ringOuter, R, ringKind) : null), [ringKind, ringInner, ringOuter, R]);
  useEffect(
    () => () => {
      surface.dispose();
      halo?.dispose();
      cloudMat?.dispose();
      rings?.dispose();
    },
    [surface, halo, cloudMat, rings],
  );

  const tmp = useMemo(() => ({ n: new Vector3(), cam: new Vector3() }), []);

  useFrame(({ clock, camera }) => {
    const pos = sim.positions[planet.id];
    root.current?.position.copy(pos);
    const t = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y = t * planet.spin;
    surface.uniforms.uTime!.value = t;
    if (cloudMat) cloudMat.uniforms.uTime!.value = t;
    if (clouds.current) clouds.current.rotation.y = t * planet.spin * 0.25;
    if (rings) (rings.uniforms.uCenter!.value as Vector3).copy(pos);
    if (ringKind === 'saturn' && root.current) {
      (surface.uniforms.uCenter!.value as Vector3).copy(pos);
      // Normale du plan des anneaux, inclinée avec l'axe de la planète.
      tmp.n.set(0, 1, 0).applyAxisAngle(new Vector3(0, 0, 1), planet.tilt * DEG);
      (surface.uniforms.uRingNormal!.value as Vector3).copy(tmp.n);
      surface.uniforms.uRingInner!.value = ringInner;
      surface.uniforms.uRingOuter!.value = ringOuter;
    }
    // Étiquette visible seulement de loin.
    if (label.current) {
      const d = camera.position.distanceTo(pos);
      // Pendant un voyage, les étiquettes ne s'affichent que dans les plans larges.
      const f = sim.frame;
      const wide = !f || f.phase === 'window' || (f.phase === 'cruise' && f.s > 0.22 && f.s < 0.7);
      const show = wide && d > R * 14 && d < 900;
      label.current.style.opacity = show ? '1' : '0';
      label.current.style.pointerEvents = show ? 'auto' : 'none';
    }
  });

  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onSelect || e.delta > 6) return;
    e.stopPropagation();
    onSelect(planet.id);
  };

  return (
    <group ref={root}>
      <group rotation={[0, 0, planet.tilt * DEG]}>
        <group ref={spin}>
          <mesh material={surface} onClick={click}>
            <sphereGeometry args={[R, 128, 96]} />
          </mesh>
        </group>
        {cloudMat && (
          <mesh ref={clouds} material={cloudMat} scale={1.012}>
            <sphereGeometry args={[R, 96, 64]} />
          </mesh>
        )}
        {rings && (
          <mesh material={rings} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[ringInner, ringOuter, 256, 1]} />
          </mesh>
        )}
      </group>
      {halo && atmo && (
        <mesh material={halo} scale={atmo.scale}>
          <sphereGeometry args={[R, 96, 48]} />
        </mesh>
      )}
      {planet.id === 'terre' && <Moon />}
      <Html position={[0, R + 0.4, 0]} center zIndexRange={[3, 0]}>
        <button
          ref={label}
          type="button"
          className="planet-label"
          data-selected={selected}
          style={{ ['--accent' as string]: planet.color }}
          onClick={() => onSelect?.(planet.id)}
          tabIndex={-1}
        >
          {planet.name}
        </button>
      </Html>
    </group>
  );
}

/** La Lune, autour de la Terre. */
function Moon() {
  const sim = useSim();
  const ref = useRef<Mesh>(null);
  const mat = useMemo(() => surfaceMaterial({ look: 'rocky', radius: 0.36, tint: '#b9b4ad', maria: 1 }), []);
  useDispose(mat);
  useFrame(({ clock }) => {
    const a = (sim.day / 27.32) * Math.PI * 2 + clock.elapsedTime * 0.04;
    ref.current?.position.set(Math.cos(a) * 3.4, Math.sin(a) * 0.35, -Math.sin(a) * 3.4);
    if (ref.current) ref.current.rotation.y = a;
  });
  return (
    <mesh ref={ref} material={mat}>
      <sphereGeometry args={[0.36, 64, 48]} />
    </mesh>
  );
}

/* ---------- Ceinture d'astéroïdes ---------- */

const BELT_COUNT = 2400;

export function AsteroidBelt() {
  const ref = useRef<InstancedMesh>(null);
  const group = useRef<Group>(null);
  const [geometry, material] = useMemo(() => {
    const g = new IcosahedronGeometry(1, 1);
    const pos = g.attributes.position!;
    // Rochers irréguliers : chaque sommet est déplacé au hasard.
    for (let i = 0; i < pos.count; i++) {
      const k = 0.7 + 0.5 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1);
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.8, pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    return [g, new MeshStandardMaterial({ color: '#8d857b', roughness: 0.95, metalness: 0.05, flatShading: true })];
  }, []);
  useDispose(geometry, material);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const o = new Object3D();
    let seed = 7;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const inner = sceneRadius(2.15);
    const outer = sceneRadius(3.3);
    const color = new Color();
    for (let i = 0; i < BELT_COUNT; i++) {
      const a = rand() * Math.PI * 2;
      const r = inner + (outer - inner) * (0.5 + 0.5 * (rand() + rand() - 1));
      o.position.set(Math.cos(a) * r, (rand() + rand() + rand() - 1.5) * 1.6, -Math.sin(a) * r);
      o.rotation.set(rand() * 6, rand() * 6, rand() * 6);
      o.scale.setScalar(0.04 + Math.pow(rand(), 4) * 0.24);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, color.setHSL(0.07, 0.12 + rand() * 0.1, 0.35 + rand() * 0.3));
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += Math.min(delta, 0.1) * 0.004;
  });

  return (
    <group ref={group}>
      <instancedMesh ref={ref} args={[geometry, material, BELT_COUNT]} />
    </group>
  );
}

/* ---------- Voie lactée ---------- */

export function MilkyWay() {
  const mat = useMemo(skyMaterial, []);
  useDispose(mat);
  return (
    <mesh material={mat} renderOrder={-1}>
      <sphereGeometry args={[2400, 64, 32]} />
    </mesh>
  );
}
