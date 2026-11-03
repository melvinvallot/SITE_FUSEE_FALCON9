import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial, Vector3, type Group } from 'three';
import { lerp, smoothstep } from '../../../../lib/math';
import { ShipModel } from '../ShipModel';
import { useSceneState } from '../SceneStateContext';
import { NOISE_GLSL } from './noise.glsl';
import { Earth } from './Earth';

/**
 * Direction du Soleil, partagée avec l'éclairage : derrière la caméra, à droite.
 * Les vaisseaux sont éclairés de face et le terminateur (jour/nuit) passe à l'horizon.
 */
export const SUN_DIRECTION = new Vector3(0.62, 0.5, 0.6).normalize();

/** La Lune, au loin : mers sombres et cratères générés par du bruit. */
const moonVertex = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocal;
  void main() {
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const moonFragment = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec3 vLocal;
  ${NOISE_GLSL}
  void main() {
    float maria = smoothstep(0.05, 0.35, fbm(vLocal * 1.6 + 3.0));
    float craters = fbm(vLocal * 9.0) * 0.5 + 0.5;
    vec3 albedo = mix(vec3(0.62, 0.61, 0.6), vec3(0.32, 0.32, 0.34), maria) * (0.8 + 0.35 * craters);
    float light = max(dot(normalize(vNormal), normalize(uSun)), 0.0);
    gl_FragColor = vec4(albedo * (0.015 + 1.3 * light), 1.0);
  }
`;

const EARTH_RADIUS = 600;
const EARTH_CENTER: [number, number, number] = [0, -640, -120];
const ORBIT_Y = 14;
/** Point de la Terre survolé par les vaisseaux : le golfe du Mexique, près de Starbase. */
const OVERFLIGHT = { latitude: 23, longitude: -91 };
const UNDER_SHIPS = new Vector3(-EARTH_CENTER[0], ORBIT_Y - EARTH_CENTER[1], -EARTH_CENTER[2]).normalize();

/**
 * Orbite basse : la Terre en contrebas et deux vaisseaux qui s'arriment par
 * l'arrière pour transférer les ergols.
 */
export function OrbitWorld() {
  const state = useSceneState();
  const root = useRef<Group>(null);
  const tanker = useRef<Group>(null);
  const receiver = useRef<Group>(null);
  const moon = useMemo(
    () => new ShaderMaterial({ vertexShader: moonVertex, fragmentShader: moonFragment, uniforms: { uSun: { value: SUN_DIRECTION } } }),
    [],
  );
  useEffect(() => () => moon.dispose(), [moon]);

  useFrame(() => {
    const s = state.current;
    const visible = s.env >= 0.5 && s.env < 1.5;
    if (root.current) root.current.visible = visible;
    if (!visible) return;
    const dock = smoothstep(s.refuel);
    tanker.current?.position.set(lerp(9, 0.02, dock), ORBIT_Y + lerp(1.2, 0, dock), lerp(-2, 0, dock));
    receiver.current?.position.set(0, ORBIT_Y, 0);
  });

  return (
    <group ref={root}>
      <group position={EARTH_CENTER}>
        <Earth radius={EARTH_RADIUS} sun={SUN_DIRECTION} latitude={OVERFLIGHT.latitude} longitude={OVERFLIGHT.longitude} up={UNDER_SHIPS} />
      </group>
      {/* La Lune, loin derrière les vaisseaux (taille apparente exagérée). */}
      <mesh material={moon} position={[260, 70, -760]}>
        <sphereGeometry args={[16, 48, 24]} />
      </mesh>
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

