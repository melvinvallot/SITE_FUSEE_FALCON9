import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, Color, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry, type Group } from 'three';
import { ShipModel } from '../ShipModel';
import { useSceneState } from '../SceneStateContext';
import { fbm2, marsHeight } from './terrain';

const SIZE = 520;
const ROCKS = 160;
const dummy = new Object3D();

/** Surface de Mars : relief, rochers, vaisseaux posés et premiers modules d'une base. */
export function MarsWorld() {
  const state = useSceneState();
  const root = useRef<Group>(null);
  const rocks = useRef<InstancedMesh>(null);

  const { ground, material, rockMaterial, habitat, panels } = useMemo(() => {
    const ground = new PlaneGeometry(SIZE, SIZE, 180, 180);
    ground.rotateX(-Math.PI / 2);
    const pos = ground.getAttribute('position');
    const colors = new Float32Array(pos.count * 3);
    const dust = new Color('#b8653b');
    const rock = new Color('#6e3a24');
    const light = new Color('#d79461');
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const h = marsHeight(x, z);
      pos.setY(i, h);
      const n = fbm2(x * 0.05 + 7, z * 0.05);
      c.copy(dust).lerp(rock, Math.min(1, Math.max(0, n * 1.4 - 0.3))).lerp(light, Math.max(0, h / 30));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    ground.setAttribute('color', new BufferAttribute(colors, 3));
    ground.computeVertexNormals();
    return {
      ground,
      material: new MeshStandardMaterial({ vertexColors: true, roughness: 0.97, metalness: 0 }),
      rockMaterial: new MeshStandardMaterial({ color: '#5a3020', roughness: 0.92, flatShading: true }),
      habitat: new MeshStandardMaterial({ color: '#e9e4dc', roughness: 0.5, metalness: 0.2 }),
      panels: new MeshStandardMaterial({ color: '#1a2547', roughness: 0.25, metalness: 0.6 }),
    };
  }, []);

  useEffect(() => {
    const m = rocks.current;
    if (!m) return;
    for (let i = 0; i < ROCKS; i++) {
      const a = i * 2.39996;
      const r = 12 + ((i * 37) % 100) * 0.9;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const s = 0.2 + ((i * 13) % 10) * 0.09;
      dummy.position.set(x, marsHeight(x, z) + s * 0.3, z);
      dummy.rotation.set(i, i * 0.7, i * 1.3);
      dummy.scale.set(s * 1.4, s, s * 1.1);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  }, []);

  useEffect(
    () => () => {
      ground.dispose();
      [material, rockMaterial, habitat, panels].forEach((m) => m.dispose());
    },
    [ground, material, rockMaterial, habitat, panels],
  );

  useFrame(() => {
    if (root.current) root.current.visible = state.current.env >= 1.5;
  });

  return (
    <group ref={root}>
      <mesh geometry={ground} material={material} receiveShadow />
      <instancedMesh ref={rocks} args={[undefined, rockMaterial, ROCKS]}>
        <dodecahedronGeometry args={[1, 0]} />
      </instancedMesh>
      <group position={[0, 0.12, 0]} rotation={[0, 0.5, 0]}>
        <ShipModel legs />
      </group>
      <group position={[-34, marsHeight(-34, -58) + 0.12, -58]} rotation={[0, 1.4, 0]}>
        <ShipModel legs />
      </group>
      <group position={[46, marsHeight(46, -95) + 0.12, -95]} rotation={[0, -0.6, 0]}>
        <ShipModel legs />
      </group>
      {/* Premiers modules d'une base : dômes habitables et champs de panneaux solaires. */}
      <group position={[20, 0, -26]}>
        {[
          [0, 0, 3],
          [7, 2, 2.2],
          [3, -6, 1.8],
        ].map(([x, z, r]) => (
          <mesh key={`${x}${z}`} material={habitat} position={[x!, marsHeight(20 + x!, -26 + z!) - 0.2, z!]}>
            <sphereGeometry args={[r!, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            material={panels}
            position={[-8 - (i % 4) * 3.2, marsHeight(12 - (i % 4) * 3.2, -26 + 6 + Math.floor(i / 4) * 2.4) + 0.6, 6 + Math.floor(i / 4) * 2.4]}
            rotation={[-0.5, 0, 0]}
          >
            <boxGeometry args={[2.8, 0.05, 1.6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
