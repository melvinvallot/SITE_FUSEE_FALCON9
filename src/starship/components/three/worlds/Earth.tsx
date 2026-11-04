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
  varying vec3 vCenter;
  void main() {
    vUv = uv;
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vCenter = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

/**
 * Bruit fractal « à la bonne échelle » : chaque octave s'efface dès qu'elle devient
 * plus fine qu'un pixel (`footprint` = taille d'un pixel sur la sphère unité).
 * De près, on garde des détails de quelques centaines de mètres ; vers l'horizon,
 * les octaves trop serrées disparaissent au lieu de scintiller.
 */
const DETAIL_GLSL = /* glsl */ `
  float detail(vec3 p, float freq, int octaves, float footprint) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 7; i++) {
      if (i >= octaves) break;
      float fade = 1.0 - smoothstep(0.18, 0.5, freq * footprint);
      if (fade <= 0.0) break;
      sum += amp * fade * snoise(p * freq);
      freq *= 2.07;
      amp *= 0.52;
    }
    return sum;
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
  varying vec3 vCenter;
  ${NOISE_GLSL}
  ${DETAIL_GLSL}

  void main() {
    vec3 n = normalize(vNormal);
    vec3 v = normalize(cameraPosition - vWorld);
    vec3 sun = normalize(uSun);
    float footprint = max(length(fwidth(vLocal)), 1e-6);
    float sunH = dot(n, sun);

    // Relief : la carte d'altitude incline la normale (montagnes visibles près du terminateur).
    vec2 texel = vec2(1.0 / 4096.0, 1.0 / 2048.0);
    // Coordonnées de texture légèrement déformées par du bruit : côtes, villes et
    // nuages perdent leurs marches d'escalier de pixels et deviennent organiques.
    vec2 jitter = vec2(detail(vLocal + 2.0, 500.0, 3, footprint), detail(vLocal - 6.0, 500.0, 3, footprint));
    vec2 uv = vUv + jitter * texel * 3.0;
    vec4 data = texture2D(uDetail, uv);
    float hx = texture2D(uDetail, uv + vec2(texel.x, 0.0)).r - data.r;
    float hy = texture2D(uDetail, uv + vec2(0.0, texel.y)).r - data.r;
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), n) + vec3(1e-4, 0.0, 0.0));
    vec3 north = normalize(cross(n, east));

    // Variations procédurales du sol, bien plus fines que la carte.
    float ground = detail(vLocal + 17.0, 60.0, 6, footprint);
    float land = smoothstep(0.25, 0.6, data.g);
    float ocean = 1.0 - land;
    vec3 bumped = normalize(n - (east * hx + north * hy) * 6.0);

    // Sol de jour : carte photographique enrichie de nuances locales (forêts, roches, sable).
    vec3 day = texture2D(uDay, uv).rgb;
    float lum = dot(day, vec3(0.3, 0.55, 0.15));
    vec3 tint = mix(vec3(0.85, 0.95, 0.8), vec3(1.1, 1.04, 0.95), smoothstep(-0.25, 0.35, ground));
    day = mix(day, day * tint * (0.88 + 0.26 * (ground * 0.5 + 0.5)), land * smoothstep(0.02, 0.12, lum));
    // Mer : hauts-fonds turquoise près des côtes, abysses plus sombres au large.
    float shelf = smoothstep(0.32, 0.55, data.g) * ocean;
    day = mix(day, day * (0.86 + 0.22 * ground), ocean);
    day = mix(day, vec3(0.05, 0.32, 0.38), shelf * 0.2);

    // Nuages : la carte donne la couverture (fronts, cyclones), le bruit sculpte
    // des bords nets, des trouées et des filaments. Ils glissent un peu plus vite que le sol.
    vec3 cq = vLocal + vec3(uCloudShift, 0.0, uCloudShift * 0.6);
    float cover = texture2D(uDetail, uv + vec2(uCloudShift * 0.16, 0.0)).b;
    float warp = detail(cq + 4.0, 30.0, 3, footprint);
    float body = detail(cq + warp * 0.006, 90.0, 7, footprint);
    float c = cover + body * 0.42 - 0.3;
    float clouds = smoothstep(0.0, 0.32, c) * (0.75 + 0.25 * smoothstep(0.1, 0.5, c));
    // Ombre portée des nuages, décalée à l'opposé du Soleil (plus longue au soleil rasant).
    vec3 shadowP = cq - (sun - n * sunH) * (0.003 / max(sunH, 0.15));
    float sc = cover + detail(shadowP + warp * 0.006, 90.0, 4, footprint) * 0.42 - 0.3;
    float shadow = smoothstep(0.0, 0.32, sc);

    float lit = smoothstep(-0.02, 0.5, dot(bumped, sun));
    float dayMix = smoothstep(-0.1, 0.12, sunH);

    vec3 color = day * (0.02 + 1.5 * lit) * (1.0 - 0.6 * shadow * (1.0 - clouds));
    // Reflet du Soleil sur la mer, troublé par la houle.
    vec3 halfV = normalize(sun + v);
    vec3 waveN = normalize(n + (east * jitter.x + north * jitter.y) * 0.03);
    float nh = max(dot(waveN, halfV), 0.0);
    float spec = pow(nh, 220.0) * 3.0 + pow(nh, 24.0) * 0.22;
    color += vec3(1.0, 0.86, 0.66) * spec * ocean * smoothstep(0.0, 0.08, sunH) * (1.0 - clouds);

    // Sommets des nuages : bosselés, plus clairs côté Soleil, ombrés côté nuit, rosés au couchant.
    float relief = 0.7 + 0.4 * body;
    vec3 sunColor = mix(vec3(1.0, 0.62, 0.42), vec3(1.0, 0.98, 0.95), smoothstep(-0.03, 0.06, sunH));
    vec3 cloudColor = sunColor * relief * (0.02 + 1.1 * smoothstep(-0.05, 0.25, sunH));
    color = mix(color, cloudColor, clouds);

    // Côté nuit : lumières des villes. La carte situe les agglomérations, le bruit
    // les éclate en milliers de points et de traînées, comme vues de l'ISS.
    vec3 night = texture2D(uNight, uv).rgb;
    float urban = smoothstep(0.09, 0.5, dot(night, vec3(0.33)));
    // Lumières ponctuelles : une par cellule (bourgs) puis par grandes cellules (villes),
    // gardées seulement là où la carte de nuit indique des agglomérations.
    float sparks = 0.0;
    for (int k = 0; k < 3; k++) {
      float f = k == 0 ? 1800.0 : (k == 1 ? 800.0 : 320.0);
      float fade = 1.0 - smoothstep(0.12, 0.4, f * footprint);
      vec3 g = vLocal * f + float(k) * 7.31;
      vec3 cell = floor(g);
      vec3 rnd = fract(sin(vec3(dot(cell, vec3(127.1, 311.7, 74.7)), dot(cell, vec3(269.5, 183.3, 246.1)), dot(cell, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
      float dist = length(g - cell - (0.25 + 0.5 * rnd));
      float on = smoothstep(rnd.x, rnd.x + 0.15, urban * 1.25);
      float size = 0.18 + 0.14 * rnd.y;
      sparks += on * exp(-pow(dist / size, 2.0)) * (0.4 + rnd.z) * fade * (k == 2 ? 2.0 : 1.0);
    }
    float glowArea = urban * urban;
    vec3 cityColor = vec3(1.0, 0.72, 0.38);
    vec3 lights = cityColor * (glowArea * 0.035 + urban * 0.01 + sparks * 2.2) * (1.0 - clouds * 0.85);
    // Clair de Lune sur les nuages et la mer.
    vec3 moonlit = vec3(0.012, 0.018, 0.032) + vec3(0.05, 0.06, 0.08) * clouds;
    color = mix(lights + moonlit, color, dayMix);
    // Liseré du crépuscule.
    float twilight = exp(-pow((sunH - 0.02) / 0.07, 2.0));
    color += vec3(1.0, 0.42, 0.14) * twilight * 0.08 * clouds;

    // Voile atmosphérique : mince, il ne bleuit que les terres proches du limbe.
    float view = clamp(dot(n, v), 0.0, 1.0);
    float haze = pow(1.0 - view, 4.0);
    vec3 scatter = mix(vec3(0.3, 0.55, 1.0), vec3(1.0, 0.45, 0.18), twilight * 0.8);
    color = mix(color, scatter * (0.12 + 0.9 * max(sunH, 0.0)), haze * 0.7 * smoothstep(-0.15, 0.15, sunH));

    // Tant que les cartes chargent, on montre un globe bleu sobre.
    vec3 fallback = vec3(0.03, 0.09, 0.2) * (0.1 + lit);
    gl_FragColor = vec4(max(mix(fallback, color, uReady), vec3(0.0)), 1.0);
  }
`;

/**
 * Limbe atmosphérique vu de profil, calculé d'après l'altitude du rayon de vue
 * au-dessus du sol : liseré blanc-bleu de la troposphère, dégradé bleu de la
 * stratosphère, orangé au terminateur, puis la fine lueur verte de la haute
 * atmosphère (« airglow », vers 100 km), visible aussi côté nuit.
 */
const atmosphereFragment = /* glsl */ `
  uniform vec3 uSun;
  uniform float uRadius;
  uniform float uKm;
  varying vec3 vWorld;
  varying vec3 vCenter;
  void main() {
    vec3 dir = normalize(vWorld - cameraPosition);
    vec3 oc = vCenter - cameraPosition;
    float t = max(dot(oc, dir), 0.0);
    vec3 closest = cameraPosition + dir * t;
    vec3 up = normalize(closest - vCenter);
    float h = (length(closest - vCenter) - uRadius) * uKm; // altitude du rayon, en km
    if (h < -2.0) discard;
    h = max(h, 0.0);
    float s = dot(up, normalize(uSun));
    float day = smoothstep(-0.18, 0.12, s);
    float twilight = exp(-pow((s - 0.02) / 0.1, 2.0));
    vec3 color = vec3(0.0);
    color += mix(vec3(0.75, 0.88, 1.0), vec3(1.0, 0.55, 0.25), twilight) * exp(-h / 6.0) * 1.6 * day;
    color += mix(vec3(0.2, 0.45, 1.0), vec3(1.0, 0.35, 0.12), twilight * 0.7) * exp(-h / 22.0) * 0.9 * (day + twilight * 0.6);
    color += vec3(0.02, 0.06, 0.2) * exp(-h / 60.0) * (0.3 + day);
    color += vec3(0.3, 1.0, 0.5) * exp(-pow((h - 98.0) / 3.0, 2.0)) * mix(0.22, 0.1, day);
    gl_FragColor = vec4(color, 1.0);
  }
`;

/** Rayon terrestre réel (km) : sert à placer les couches de l'atmosphère à la bonne altitude. */
const KM_PER_UNIT_RATIO = 6371;

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
        uniforms: { uSun: { value: sun }, uRadius: { value: radius }, uKm: { value: KM_PER_UNIT_RATIO / radius } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: BackSide,
        toneMapped: false,
      }),
    ];
  }, [sun, radius]);

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
      <mesh material={atmosphere} scale={1.03}>
        <sphereGeometry args={[radius, 128, 64]} />
      </mesh>
    </group>
  );
}
