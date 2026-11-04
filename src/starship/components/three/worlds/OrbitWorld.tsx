import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ShaderMaterial, Vector3, type Group } from 'three';
import { lerp, smoothstep } from '../../../../lib/math';
import { ShipModel } from '../ShipModel';
import { useMaterials } from '../materials';
import { RADIUS } from '../../../data/layout';
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

/**
 * Soleil pour la Terre : juste sous l'horizon, côté droit. Les vaisseaux, en
 * altitude, sont encore au soleil, mais le sol sous eux est déjà dans la nuit,
 * avec les lumières des villes ; l'aube se lève sur le limbe à droite.
 */
export const EARTH_SUN = new Vector3(0.6, -0.1, 0.8).normalize();

const EARTH_RADIUS = 600;
const EARTH_CENTER: [number, number, number] = [0, -640, -120];
const ORBIT_Y = 14;
/** Point de la Terre survolé par les vaisseaux : le golfe du Mexique, près de Starbase. */
const OVERFLIGHT = { latitude: 23, longitude: -91 };
const UNDER_SHIPS = new Vector3(-EARTH_CENTER[0], ORBIT_Y - EARTH_CENTER[1], -EARTH_CENTER[2]).normalize();

/**
 * Disposition du ravitaillement, d'après les illustrations SpaceX / NASA (HLS, 2024) :
 * les deux vaisseaux sont parallèles, côte à côte, nez dans le même sens, et
 * s'arriment flanc contre flanc près de l'arrière, là où passent les ergols.
 * L'axe qui relie les deux vaisseaux est presque vertical, légèrement incliné
 * vers le fond, pour que la caméra (au-dessus, devant) voie les deux coques.
 */
const SIDE = new Vector3(0, 0.98, -0.21).normalize();
/** Distance entre les axes : deux rayons plus le jeu de l'arrimage. */
const GAP = 2 * RADIUS + 0.16;
/** Roulis qui tourne le bouclier thermique (+z du modèle) vers `dir`. */
const rollToward = (dir: Vector3) => Math.atan2(-dir.y, dir.z);
const RECEIVER_ROLL = rollToward(SIDE);
const TANKER_ROLL = rollToward(SIDE.clone().negate());
/** Position de l'arrimage le long des vaisseaux, au-dessus des moteurs (nez vers -x). */
const DOCK_X = -2.1;
/** Décalage le long de x pour centrer le couple de vaisseaux (13 unités de long) dans le cadre. */
const SHIPS_X = 6.5;

/**
 * Orbite basse : la Terre en contrebas et deux vaisseaux côte à côte, arrimés
 * flanc contre flanc pour transférer les ergols.
 */
export function OrbitWorld() {
  const state = useSceneState();
  const m = useMaterials();
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
    // Le ravitailleur arrive de l'avant et du côté, puis se colle au flanc du vaisseau.
    const away = lerp(3.5, 0, dock);
    tanker.current?.position.set(
      SHIPS_X + lerp(-9, 0, dock),
      ORBIT_Y + SIDE.y * (GAP + away),
      SIDE.z * (GAP + away),
    );
    receiver.current?.position.set(SHIPS_X, ORBIT_Y, 0);
  });

  return (
    <group ref={root}>
      <group position={EARTH_CENTER}>
        <Earth radius={EARTH_RADIUS} sun={EARTH_SUN} latitude={OVERFLIGHT.latitude} longitude={OVERFLIGHT.longitude} up={UNDER_SHIPS} />
      </group>
      {/* La Lune, loin derrière les vaisseaux (taille apparente exagérée). */}
      <mesh material={moon} position={[260, 70, -760]}>
        <sphereGeometry args={[16, 48, 24]} />
      </mesh>
      {/* Vaisseau à ravitailler et ravitailleur, parallèles, nez vers -x, boucliers thermiques face à face. */}
      <group ref={receiver}>
        <group rotation={[RECEIVER_ROLL, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <ShipModel />
          </group>
        </group>
        {/* Plaque d'arrimage et raccords des ergols, entre les deux flancs. */}
        <group position={[DOCK_X, SIDE.y * (GAP / 2), SIDE.z * (GAP / 2)]} rotation={[RECEIVER_ROLL, 0, 0]}>
          <mesh material={m.sooty}>
            <boxGeometry args={[1.3, 0.62, GAP - 2 * RADIUS + 0.12]} />
          </mesh>
          {[-0.4, 0.4].map((x) => (
            <mesh key={x} material={m.steel} position={[x, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.09, 0.09, GAP - 2 * RADIUS + 0.2, 16]} />
            </mesh>
          ))}
        </group>
      </group>
      <group ref={tanker}>
        <group rotation={[TANKER_ROLL, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <ShipModel />
          </group>
        </group>
      </group>
    </group>
  );
}
