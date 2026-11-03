import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  BackSide,
  LinearMipmapLinearFilter,
  NoColorSpace,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type Group,
  type Texture,
} from 'three';
import dayUrl from '../../../assets/earth/jour.jpg';
import nightUrl from '../../../assets/earth/nuit.jpg';
import detailUrl from '../../../assets/earth/relief_rugosite_nuages.jpg';
import { NOISE_GLSL } from './noise.glsl';

/**
 * Cartes de la Terre (jour, lumières des villes la nuit, relief + rugosité + nuages) :
 * Solar System Scope, licence CC BY 4.0, d'après les données de la NASA.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;
  void main() {
    vUv = uv;
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const surfaceFragment = /* glsl */ `
  uniform sampler2D uDay;
  uniform sampler2D uNight;
  uniform sampler2D uDetail;
  uniform vec3 uSun;
  uniform float uReady;
  uniform float uCloudShift;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorld;
  varying vec3 vLocal;
  ${NOISE_GLSL}

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 sun = normalize(uSun);

    // Relief : la carte d'altitude incline la normale (montagnes visibles près du terminateur).
    vec2 texel = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    float h = texture2D(uDetail, vUv).r;
    float hx = texture2D(uDetail, vUv + vec2(texel.x, 0.0)).r - h;
    float hy = texture2D(uDetail, vUv + vec2(0.0, texel.y)).r - h;
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), n) + vec3(1e-4, 0.0, 0.0));
    vec3 north = normalize(cross(n, east));
    vec3 bumped = normalize(n - (east * hx + north * hy) * 6.0);

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float rough = texture2D(uDetail, vUv).g;
    float ocean = 1.0 - smoothstep(0.25, 0.6, rough);

    // Détail procédural à petite échelle : la carte reste nette même de près.
    float fine = fbm(vLocal * 180.0) * 0.5 + fbm(vLocal * 520.0) * 0.25;
    day *= 1.0 + fine * mix(0.35, 0.08, ocean);

    // Nuages (décalés : ils tournent un peu plus vite que le sol) et leur ombre portée.
    vec2 cuv = vUv + vec2(uCloudShift, 0.0);
    float clouds = texture2D(uDetail, cuv).b;
    clouds = smoothstep(0.08, 0.9, clouds + fbm(vLocal * 260.0) * 0.12 * clouds);
    float shadow = texture2D(uDetail, cuv + sun.xz * 0.0015).b;

    float ndl = dot(bumped, sun);
    float lit = max(ndl, 0.0);
    float dayMix = smoothstep(-0.08, 0.18, dot(n, sun));

    // Sol éclairé, ombre des nuages, puis couche nuageuse.
    vec3 color = day * (0.04 + 1.25 * lit) * (1.0 - 0.45 * shadow * dayMix);
    // Reflet du Soleil sur les océans (rugosité de la carte).
    vec3 halfV = normalize(sun + v);
    float spec = pow(max(dot(n, halfV), 0.0), 140.0) * 2.4 + pow(max(dot(n, halfV), 0.0), 18.0) * 0.18;
    color += vec3(1.0, 0.92, 0.78) * spec * ocean * lit * (1.0 - clouds);
    vec3 cloudColor = vec3(1.0) * (0.06 + 1.15 * max(dot(n, sun), 0.0));
    color = mix(color, cloudColor, clouds * 0.92);

    // Villes la nuit, voilées par les nuages.
    vec3 lights = pow(night, vec3(1.4)) * vec3(1.0, 0.82, 0.55) * 2.2 * (1.0 - clouds * 0.85);
    color = mix(lights + color * 0.15, color, dayMix);

    // Diffusion atmosphérique : voile bleu vers le bord du disque, orangé au terminateur.
    float view = clamp(dot(n, v), 0.0, 1.0);
    float haze = pow(1.0 - view, 2.5);
    float twilight = exp(-pow(dot(n, sun) / 0.12, 2.0));
    vec3 scatter = mix(vec3(0.28, 0.5, 1.0), vec3(1.0, 0.45, 0.18), twilight * 0.7);
    color = mix(color, scatter * (0.15 + max(dot(n, sun), 0.0)), haze * 0.75 * smoothstep(-0.2, 0.2, dot(n, sun)));

    // Tant que les cartes chargent, on montre un globe bleu sobre.
    vec3 fallback = vec3(0.03, 0.09, 0.2) * (0.1 + lit);
    gl_FragColor = vec4(max(mix(fallback, color, uReady), vec3(0.0)), 1.0);
  }
`;

/** Halo atmosphérique au-delà du limbe : bleu côté jour, liseré orangé au terminateur. */
const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun;
  varying vec3 vNormal;
  varying vec3 vWorld;
  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    float rim = clamp(1.0 - abs(dot(n, v)), 0.0, 1.0);
    float glow = pow(rim, 5.0) * 1.4 + pow(rim, 14.0) * 2.0;
    float s = dot(n, normalize(uSun));
    float day = smoothstep(-0.35, 0.3, s);
    float twilight = exp(-pow((s + 0.05) / 0.18, 2.0));
    vec3 color = mix(vec3(0.25, 0.5, 1.0), vec3(1.0, 0.5, 0.2), twilight * 0.8);
    gl_FragColor = vec4(color * glow * day * 1.3, 1.0);
  }
`;

const loadTexture = (url: string, srgb: boolean, onLoad: () => void): Texture => {
  const tex = new TextureLoader().load(url, onLoad);
  tex.colorSpace = srgb ? SRGBColorSpace : NoColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = LinearMipmapLinearFilter;
  return tex;
};

interface EarthProps {
  radius: number;
  sun: Vector3;
  /** Point de la Terre (latitude, longitude en degrés) placé sous l'orbite, face à `up`. */
  latitude: number;
  longitude: number;
  up?: Vector3;
}

/** Direction d'un point (lat, lon) dans le repère d'une `SphereGeometry` de three.js. */
export function latLonToVector(latitude: number, longitude: number): Vector3 {
  const lat = (latitude * Math.PI) / 180;
  const phi = ((longitude + 180) / 360) * Math.PI * 2;
  return new Vector3(-Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat));
}

/**
 * Terre très détaillée : cartes photographiques en 4K, relief, reflet du Soleil
 * sur les océans, nuages et leur ombre, villes éclairées côté nuit, atmosphère.
 */
export function Earth({ radius, sun, latitude, longitude, up = new Vector3(0, 1, 0) }: EarthProps) {
  const spin = useRef<Group>(null);
  const ready = useRef(0);
  const loaded = useRef(0);

  const [surface, atmosphere] = useMemo(() => {
    const onLoad = () => {
      loaded.current += 1;
    };
    const uniforms = {
      uDay: { value: loadTexture(dayUrl, true, onLoad) },
      uNight: { value: loadTexture(nightUrl, true, onLoad) },
      uDetail: { value: loadTexture(detailUrl, false, onLoad) },
      uSun: { value: sun },
      uReady: { value: 0 },
      uCloudShift: { value: 0 },
    };
    return [
      new ShaderMaterial({ vertexShader, fragmentShader: surfaceFragment, uniforms }),
      new ShaderMaterial({
        vertexShader,
        fragmentShader: atmosphereFragment,
        uniforms: { uSun: { value: sun } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
        toneMapped: false,
      }),
    ];
  }, [sun]);

  useEffect(
    () => () => {
      for (const key of ['uDay', 'uNight', 'uDetail'] as const) (surface.uniforms[key]!.value as Texture).dispose();
      surface.dispose();
      atmosphere.dispose();
    },
    [surface, atmosphere],
  );

  // Oriente le globe : le point choisi se retrouve sous les vaisseaux.
  const orientation = useMemo(() => new Quaternion().setFromUnitVectors(latLonToVector(latitude, longitude), up.clone().normalize()), [latitude, longitude, up]);

  useFrame(({ clock }, delta) => {
    if (loaded.current >= 3 && ready.current < 1) ready.current = Math.min(1, ready.current + delta * 1.5);
    surface.uniforms.uReady!.value = ready.current;
    surface.uniforms.uCloudShift!.value = clock.elapsedTime * 0.00004;
  });

  return (
    <group quaternion={orientation}>
      <group ref={spin}>
        <mesh material={surface}>
          <sphereGeometry args={[radius, 256, 128]} />
        </mesh>
      </group>
      <mesh material={atmosphere} scale={1.025}>
        <sphereGeometry args={[radius, 128, 64]} />
      </mesh>
    </group>
  );
}
