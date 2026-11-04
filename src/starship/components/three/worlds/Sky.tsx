import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, Color, ShaderMaterial, Vector3, type Mesh } from 'three';
import { clamp } from '../../../../lib/math';
import { useSceneState } from '../SceneStateContext';
import { SUN_DIRECTION } from './OrbitWorld';
import { MOON_SUN } from './MoonWorld';

const SKY_SUN = new Vector3(0.6, 0.25, -0.75);

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  /** Halo diffus autour du Soleil (nul dans le vide spatial). */
  uniform float uHaze;
  /** Altitude apparente (0 = sol, 1 = haute atmosphère), seulement près de la Terre. */
  uniform float uAlt;
  varying vec3 vDir;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 color = h > 0.0 ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, h), 0.7)) : mix(uHorizon, uBottom, smoothstep(0.0, 0.25, -h));
    float sun = max(0.0, dot(dir, normalize(uSunDir)));
    color += uSunColor * (pow(sun, 8.0) * 0.35 * uHaze + pow(sun, 400.0) * 2.0);

    if (uAlt > 0.001) {
      // Horizon abaissé par l'altitude : la Terre devient une sphère vue d'en haut.
      float dip = 0.16 * uAlt;
      float d = h + dip; // hauteur angulaire au-dessus du limbe
      float toward = pow(max(0.0, dot(normalize(dir.xz + 1e-4), normalize(uSunDir.xz))), 3.0);
      // Couches du limbe, vues de profil : troposphère orangée, stratosphère bleue,
      // mésosphère sombre puis lueur verte de la thermosphère (« airglow »).
      float k = uAlt;
      vec3 limb = vec3(0.0);
      limb += vec3(1.0, 0.45, 0.16) * exp(-pow(d / 0.006, 2.0)) * (0.35 + 0.9 * toward);
      limb += vec3(0.18, 0.42, 1.0) * exp(-pow((d - 0.012) / 0.012, 2.0)) * 0.75;
      limb += vec3(0.05, 0.12, 0.35) * exp(-pow((d - 0.03) / 0.02, 2.0)) * 0.6;
      limb += vec3(0.25, 0.95, 0.45) * exp(-pow((d - 0.05) / 0.0035, 2.0)) * 0.35;
      // Le ciel s'assombrit jusqu'au noir de l'espace.
      vec3 above = color * (1.0 - 0.9 * k) + limb * smoothstep(0.15, 0.7, k);
      // Sol : Terre de nuit, villes et nuages éclairés par la Lune.
      float t = -d;
      vec2 ground = dir.xz / max(0.035, -h) * 2.0;
      // Détails estompés près du limbe, où ils seraient trop serrés (scintillement).
      float detail = smoothstep(0.004, 0.05, t);
      float clouds = smoothstep(0.5, 0.85, vnoise(ground * 1.3 + 4.0) * 0.55 + vnoise(ground * 3.1) * 0.3 + vnoise(ground * 7.0) * 0.15);
      float region = smoothstep(0.5, 0.8, vnoise(ground * 0.7 + 11.0));
      float cities = smoothstep(0.86, 0.98, vnoise(ground * 22.0)) * region * detail;
      vec3 earth = vec3(0.01, 0.017, 0.03) + vec3(1.0, 0.68, 0.32) * cities * 0.55 * (1.0 - clouds) + vec3(0.07, 0.085, 0.11) * clouds * (0.4 + 0.6 * detail);
      earth = mix(earth, vec3(0.06, 0.12, 0.28), exp(-t / 0.02) * 0.8); // brume près du limbe
      earth += vec3(1.0, 0.45, 0.16) * exp(-t / 0.004) * (0.25 + 0.6 * toward);
      vec3 high = d > 0.0 ? above : earth;
      color = mix(color, high, smoothstep(0.2, 0.75, k));
      // Assombrissement progressif dès les premières dizaines de kilomètres.
      color *= 1.0 - 0.6 * smoothstep(0.0, 0.4, k) * step(0.0, d) * (1.0 - smoothstep(0.2, 0.75, k));
    }
    gl_FragColor = vec4(max(color, vec3(0.0)), 1.0);
  }
`;

/** Palettes du ciel : nuit au pas de tir, espace noir, crépuscule martien. */
const SKIES = [
  { top: '#03060d', horizon: '#18304f', bottom: '#070b12', sun: '#000000' },
  { top: '#000000', horizon: '#02040a', bottom: '#000000', sun: '#fff3dc' },
  { top: '#000000', horizon: '#02040a', bottom: '#000000', sun: '#fff3dc' },
  // Lune : pas d'atmosphère, ciel noir en plein jour.
  { top: '#000000', horizon: '#010102', bottom: '#000000', sun: '#fff8ee' },
] as const;

/** Halo autour du Soleil, par décor : seulement dans l'air du pas de tir. */
const HAZE = [1, 0, 0, 0] as const;

/** Dôme de ciel centré sur la caméra, qui s'assombrit avec l'altitude. */
export function Sky() {
  const state = useSceneState();
  const mesh = useRef<Mesh>(null);
  const palette = useMemo(() => SKIES.map((s) => ({ top: new Color(s.top), horizon: new Color(s.horizon), bottom: new Color(s.bottom), sun: new Color(s.sun) })), []);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTop: { value: new Color() },
          uHorizon: { value: new Color() },
          uBottom: { value: new Color() },
          uSunDir: { value: new Vector3(0.6, 0.25, -0.75) },
          uHaze: { value: 1 },
          uSunColor: { value: new Color() },
          uAlt: { value: 0 },
        },
        side: BackSide,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    mesh.current?.position.copy(camera.position);
    const env = clamp(state.current.env, 0, SKIES.length - 1);
    const i = Math.min(SKIES.length - 2, Math.floor(env));
    const t = env - i;
    const a = palette[i]!;
    const b = palette[i + 1]!;
    const u = material.uniforms;
    (u.uTop!.value as Color).copy(a.top).lerp(b.top, t);
    (u.uHorizon!.value as Color).copy(a.horizon).lerp(b.horizon, t);
    (u.uBottom!.value as Color).copy(a.bottom).lerp(b.bottom, t);
    (u.uSunColor!.value as Color).copy(a.sun).lerp(b.sun, t);
    // En montant, le ciel nocturne cède la place au noir de l'espace et au limbe terrestre.
    // En orbite, pas d'air pour diffuser la lumière : seul le disque solaire reste, dans l'axe de l'éclairage.
    u.uHaze!.value = HAZE[i]! + (HAZE[i + 1]! - HAZE[i]!) * clamp(t * 2);
    (u.uSunDir!.value as Vector3).copy(env < 0.5 ? SKY_SUN : env < 2.5 ? SUN_DIRECTION : MOON_SUN);
    u.uAlt!.value = clamp(state.current.alt) * clamp(1 - env);
  });

  return (
    <mesh ref={mesh} material={material} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[600, 48, 24]} />
    </mesh>
  );
}
