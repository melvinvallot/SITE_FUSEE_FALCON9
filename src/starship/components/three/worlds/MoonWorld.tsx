import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, PointsMaterial, Vector3, type Group } from 'three';
import { glowTexture } from '../textures';
import { landing } from '../../../lib/moon';
import { ShipModel } from '../ShipModel';
import { useSceneState } from '../SceneStateContext';
import { Earth } from './Earth';
import { fbm2 } from './terrain';
import { lunarHeight, lunarRelief } from './lunarTerrain';

const SIZE = 1800;
const ROCKS = 220;
const PUFFS = 160;
const dummy = new Object3D();
/** Orientation du vaisseau posé : la limite entre bouclier thermique et acier face à la caméra. */
const SHIP_YAW = 2.1;

/** Soleil rasant du pôle Sud lunaire : longues zones d'ombre dans les cratères. */
export const MOON_SUN = new Vector3(0.78, 0.3, 0.42).normalize();
/** La Terre, basse sur l'horizon, au-dessus des cratères. */
const EARTH_POSITION: [number, number, number] = [-390, 120, -900];

/**
 * La Lune : sol gris criblé de cratères, rochers, la Terre dans le ciel noir,
 * et le vaisseau lunaire qui freine, se redresse et se pose dans un nuage de poussière.
 */
export function MoonWorld({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const state = useSceneState();
  const root = useRef<Group>(null);
  const ship = useRef<Group>(null);
  const rocks = useRef<InstancedMesh>(null);
  const live = useRef({ main: 0 });
  const main = useMemo(() => () => live.current.main, []);

  const { ground, material, rockMaterial, dustMaterial, dust } = useMemo(() => {
    const ground = new PlaneGeometry(SIZE, SIZE, 260, 260);
    ground.rotateX(-Math.PI / 2);
    const pos = ground.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const regolith = new Color('#8d8a86');
    const mare = new Color('#5a5857');
    const bright = new Color('#b9b5ae');
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const relief = lunarRelief(x, z);
      pos.setY(i, lunarHeight(x, z));
      const n = fbm2(x * 0.004 + 11, z * 0.004);
      c.copy(regolith)
        .lerp(mare, Math.min(1, Math.max(0, n * 2 - 0.7)))
        .lerp(bright, Math.min(1, Math.max(0, relief / 6)) * 0.6);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    ground.setAttribute('color', new BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    return {
      ground,
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }),
      rockMaterial: new MeshStandardMaterial({ color: '#6f6c69', roughness: 0.95, flatShading: true }),
      dustMaterial: new PointsMaterial({
        color: '#b3ada4',
        map: glowTexture('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.35)'),
        size: 5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
      dust: (() => {
        const g = new BufferGeometry();
        g.setAttribute('position', new BufferAttribute(new Float32Array(PUFFS * 3), 3));
        return g;
      })(),
    };
  }, []);

  useEffect(() => {
    const r = rocks.current;
    if (!r) return;
    for (let i = 0; i < ROCKS; i++) {
      const a = i * 2.39996;
      const d = 14 + ((i * 37) % 100) * 1.4;
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      const s = 0.15 + ((i * 13) % 10) * 0.08;
      dummy.position.set(x, lunarHeight(x, z) + s * 0.25, z);
      dummy.rotation.set(i, i * 0.7, i * 1.3);
      dummy.scale.set(s * 1.3, s * 0.8, s);
      dummy.updateMatrix();
      r.setMatrixAt(i, dummy.matrix);
    }
    r.instanceMatrix.needsUpdate = true;
  }, []);

  useEffect(
    () => () => {
      ground.dispose();
      dust.dispose();
      [material, rockMaterial, dustMaterial].forEach((x) => x.dispose());
    },
    [ground, material, rockMaterial, dustMaterial, dust],
  );

  useFrame(({ clock }) => {
    const s = state.current;
    const visible = s.env >= 2.5;
    if (root.current) root.current.visible = visible;
    if (!visible) return;
    const pose = landing(s.land);
    live.current.main = pose.main;
    const g = ship.current;
    if (g) {
      g.position.set(pose.x, pose.y + 0.12, 0);
      g.rotation.set(0, 0, pose.tilt);
    }
    // Poussière : un anneau de grains qui file au ras du sol, depuis le pied du vaisseau.
    dustMaterial.opacity = 0.5 * pose.dust;
    const t = reducedMotion ? 0 : clock.elapsedTime;
    const pos = dust.getAttribute('position') as BufferAttribute;
    for (let i = 0; i < PUFFS; i++) {
      const a = (i / PUFFS) * Math.PI * 2 + Math.sin(i * 7.1) * 0.3;
      const phase = (t * 0.45 + ((i * 0.618) % 1)) % 1;
      const r = 1.2 + phase * (5 + 16 * pose.dust);
      pos.setXYZ(i, Math.cos(a) * r, 0.3 + phase * (0.6 + Math.sin(i) * 0.4 + 0.4), Math.sin(a) * r);
    }
    pos.needsUpdate = true;
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={ground} material={material} />
      <instancedMesh ref={rocks} args={[undefined, rockMaterial, ROCKS]}>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <points geometry={dust} material={dustMaterial} frustumCulled={false} />
      <group position={EARTH_POSITION}>
        <Earth radius={46} sun={MOON_SUN} latitude={20} longitude={-20} segments={96} />
      </group>
      {/* Vaisseau lunaire : pivot à la base des moteurs, couché pendant le freinage (nez vers -x). */}
      <group ref={ship}>
        {/* Le vrai Starship de la page, tourné pour montrer à la fois les tuiles noires, l'acier et les volets. */}
        <group rotation={[0, SHIP_YAW, 0]}>
          <ShipModel legs thrust={main} />
        </group>
      </group>
    </group>
  );
}
