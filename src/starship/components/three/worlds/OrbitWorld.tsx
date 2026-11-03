import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BackSide, ShaderMaterial, Vector3, type Group } from 'three';
import { lerp, smoothstep } from '../../../../lib/math';
import { ShipModel } from '../ShipModel';
import { useSceneState } from '../SceneStateContext';
import { NOISE_GLSL } from './noise.glsl';

/** Direction du Soleil, partagée avec l'éclairage. */
export const SUN_DIRECTION = new Vector3(0.75, 0.32, -0.58).normalize();

const earthVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  void main() {
    vPos = position;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vView = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const earthFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vPos;
  varying vec3 vView;
  ${NOISE_GLSL}
  void main() {
    vec3 p = normalize(vPos);
    float land = fbm(p * 2.2 + vec3(4.1, 1.3, 7.7));
    float clouds = fbm(p * 5.0 + vec3(uTime * 0.004, 0.0, uTime * 0.002));
    vec3 ocean = mix(vec3(0.01, 0.06, 0.16), vec3(0.03, 0.16, 0.32), smoothstep(-0.3, 0.1, land));
    vec3 ground = mix(vec3(0.16, 0.24, 0.1), vec3(0.42, 0.34, 0.22), smoothstep(0.1, 0.45, land));
    vec3 color = land > 0.06 ? ground : ocean;
    color = mix(color, vec3(0.95), smoothstep(0.05, 0.45, clouds) * 0.85);
    float light = dot(normalize(vNormal), normalize(uSun));
    float day = smoothstep(-0.12, 0.25, light);
    vec3 night = vec3(1.0, 0.72, 0.4) * smoothstep(0.25, 0.4, land) * smoothstep(0.3, 0.0, clouds) * 0.08;
    // Reflet du Soleil sur les océans.
    vec3 h = normalize(normalize(uSun) + vView);
    float spec = pow(max(dot(normalize(vNormal), h), 0.0), 60.0) * (land > 0.06 ? 0.0 : 0.6);
    vec3 lit = color * (0.08 + 1.1 * max(light, 0.0)) + spec;
    float rim = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0), 3.0);
    lit += vec3(0.3, 0.55, 1.0) * rim * day * 0.8;
    gl_FragColor = vec4(mix(night, lit, day), 1.0);
  }
`;

const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    float rim = pow(1.0 - clamp(abs(dot(normalize(vNormal), normalize(vView))), 0.0, 1.0), 2.2);
    float day = smoothstep(-0.3, 0.4, dot(normalize(vNormal), normalize(uSun)));
    gl_FragColor = vec4(vec3(0.35, 0.6, 1.0) * 1.6, rim * day);
  }
`;

const EARTH_RADIUS = 210;
const EARTH_CENTER: [number, number, number] = [0, -228, -70];
const ORBIT_Y = 14;

/**
 * Orbite basse : la Terre en contrebas et deux vaisseaux qui s'arriment par
 * l'arrière pour transférer les ergols.
 */
export function OrbitWorld() {
  const state = useSceneState();
  const root = useRef<Group>(null);
  const tanker = useRef<Group>(null);
  const receiver = useRef<Group>(null);
  const spin = useRef<Group>(null);

  const [earth, atmosphere] = useMemo(() => {
    const uniforms = { uSun: { value: SUN_DIRECTION }, uTime: { value: 0 } };
    return [
      new ShaderMaterial({ vertexShader: earthVertex, fragmentShader: earthFragment, uniforms }),
      new ShaderMaterial({
        vertexShader: earthVertex,
        fragmentShader: atmosphereFragment,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
        toneMapped: false,
      }),
    ];
  }, []);

  useEffect(
    () => () => {
      earth.dispose();
      atmosphere.dispose();
    },
    [earth, atmosphere],
  );

  useFrame(({ clock }, delta) => {
    const s = state.current;
    const visible = s.env >= 0.5 && s.env < 1.5;
    if (root.current) root.current.visible = visible;
    if (!visible) return;
    earth.uniforms.uTime!.value = clock.elapsedTime;
    if (spin.current) spin.current.rotation.y += Math.min(delta, 0.1) * 0.004;
    const dock = smoothstep(s.refuel);
    tanker.current?.position.set(lerp(9, 0.02, dock), ORBIT_Y + lerp(1.2, 0, dock), lerp(-2, 0, dock));
    receiver.current?.position.set(0, ORBIT_Y, 0);
  });

  return (
    <group ref={root}>
      <group position={EARTH_CENTER}>
        <group ref={spin} rotation={[0.35, 0, 0.2]}>
          <mesh material={earth}>
            <sphereGeometry args={[EARTH_RADIUS, 128, 64]} />
          </mesh>
        </group>
        <mesh material={atmosphere} scale={1.035}>
          <sphereGeometry args={[EARTH_RADIUS, 96, 48]} />
        </mesh>
      </group>
      {/* Vaisseau à ravitailler (nez vers -x) et ravitailleur (nez vers +x), ventre vers la Terre. */}
      <group ref={receiver}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <ShipModel />
          </group>
        </group>
      </group>
      <group ref={tanker}>
        <group rotation={[Math.PI / 2, 0, 0]}>
          <group rotation={[0, 0, -Math.PI / 2]}>
            <ShipModel />
          </group>
        </group>
      </group>
    </group>
  );
}

