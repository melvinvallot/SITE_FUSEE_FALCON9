import { AdditiveBlending, BackSide, Color, DoubleSide, ShaderMaterial, Vector3 } from 'three';
import { NOISE_GLSL } from '../../../../starship/components/three/worlds/noise.glsl';
import type { Look } from '../../../data/planets';

/**
 * Shaders des planètes : tout est calculé dans la carte graphique à partir de
 * bruits mathématiques (aucune image à télécharger). Le Soleil est à l'origine
 * de la scène ; chaque pixel calcule sa propre lumière.
 */

const vertex = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vObj = position;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const COMMON = /* glsl */ `
  ${NOISE_GLSL}
  #define SRGB(r, g, b) pow(vec3(r, g, b), vec3(2.2))
  vec3 hash3(vec3 p) {
    p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
    return fract(sin(p) * 43758.5453123);
  }
  // Champ de cratères : cuvette, remparts et petits pics centraux.
  float craters(vec3 p, float density) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    float h = 0.0;
    for (int x = -1; x <= 1; x++)
    for (int y = -1; y <= 1; y++)
    for (int z = -1; z <= 1; z++) {
      vec3 g = vec3(float(x), float(y), float(z));
      vec3 o = hash3(i + g);
      if (o.z > density) continue;
      float rad = 0.22 + 0.28 * o.x;
      float k = length(g + o - f) / rad;
      if (k < 1.6) {
        h += k < 1.0 ? (k * k - 1.0) * 0.55 : 0.0;
        h += exp(-pow((k - 1.0) * 4.5, 2.0)) * 0.3;
        h += k < 0.25 && o.y > 0.6 ? (0.25 - k) * 0.8 : 0.0;
      }
    }
    return h;
  }
  // Relief par dérivées à l'écran : petites bosses sans géométrie supplémentaire.
  vec3 bumpNormal(vec3 n, float h, float k) {
    vec3 dpdx = dFdx(vW);
    vec3 dpdy = dFdy(vW);
    float dhx = dFdx(h);
    float dhy = dFdy(h);
    vec3 r1 = cross(dpdy, n);
    vec3 r2 = cross(n, dpdx);
    float det = dot(dpdx, r1);
    vec3 grad = sign(det) * (dhx * r1 + dhy * r2);
    return normalize(abs(det) * n - k * grad);
  }
  vec3 rotY(vec3 p, float a) {
    float c = cos(a), s = sin(a);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }
`;

const planetFragment = /* glsl */ `
  uniform float uTime;
  uniform float uBump;
  uniform vec3 uTint;
  uniform float uMaria;
  uniform vec3 uAtmo;
  uniform float uAtmoStrength;
  // Anneaux (ombre portée sur la planète).
  uniform vec3 uRingNormal;
  uniform vec3 uCenter;
  uniform float uRingInner;
  uniform float uRingOuter;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  ${COMMON}

  float ringDensity(float x) {
    if (x < 0.0 || x > 1.0) return 0.0;
    float d = x < 0.28 ? 0.25 : x < 0.68 ? 0.95 : x < 0.73 ? 0.06 : 0.7;
    if (abs(x - 0.93) < 0.008) d = 0.1;
    return d;
  }

  void main() {
    vec3 p = normalize(vObj);
    vec3 N = normalize(vN);
    vec3 L = normalize(-vW);
    vec3 V = normalize(cameraPosition - vW);
    vec3 albedo = vec3(0.5);
    vec3 emissive = vec3(0.0);
    float h = 0.0;
    float spec = 0.0;
    float limb = 0.0;
    float lat = p.y;
    float lon = atan(p.z, p.x);

  #if LOOK == 0
    // Mercure (et la Lune) : poussière grise, cratères de toutes tailles, mers sombres.
    h = fbm(p * 3.0) * 0.3;
    h += craters(p * 5.0, 0.55) * 0.7 + craters(p * 12.0 + 7.0, 0.7) * 0.35 + craters(p * 30.0 + 3.0, 0.8) * 0.15;
    float maria = uMaria * smoothstep(0.02, 0.22, fbm(p * 1.5 + 11.0));
    float tone = 0.62 + 0.22 * fbm(p * 6.0 + 2.0) + h * 0.18;
    // Traînées claires autour de quelques jeunes cratères.
    float rays = smoothstep(0.55, 0.9, snoise(p * 26.0)) * smoothstep(0.3, 0.6, fbm(p * 2.0 + 30.0)) * 0.25;
    albedo = uTint * tone * (1.0 - maria * 0.5) + rays * uTint;
  #elif LOOK == 1
    // Vénus : couche de nuages épaisse, étirée par des vents très rapides.
    float t = uTime * 0.02;
    vec3 q = rotY(p, t * (1.0 - 0.6 * lat * lat));
    vec3 w = vec3(fbm(q * vec3(1.6, 4.5, 1.6) + 2.0), fbm(q * vec3(1.6, 4.5, 1.6) + 7.0), 0.0);
    float n = fbm(vec3(q.x * 2.0 + w.x * 1.6, q.y * 6.5 + w.y * 2.2 + abs(lat) * 3.0, q.z * 2.0 + w.x * 1.6));
    float chevron = sin(lat * 9.0 + abs(lon) * 0.0 + n * 3.0) * 0.5 + 0.5;
    albedo = mix(SRGB(0.72, 0.58, 0.36), SRGB(0.98, 0.9, 0.72), clamp(n * 0.7 + 0.5, 0.0, 1.0));
    albedo *= 0.88 + 0.12 * chevron;
    limb = 0.6;
  #elif LOOK == 2
    // Terre : continents, déserts, glaces, océans brillants et lumières des villes.
    vec3 q = p + 0.18 * vec3(fbm(p * 2.0 + 1.0), fbm(p * 2.0 + 5.0), fbm(p * 2.0 + 9.0));
    float c = fbm(q * 1.7) + 0.32 * fbm(q * 5.0 + 3.0) + 0.08 * snoise(q * 16.0);
    float land = smoothstep(0.08, 0.11, c);
    float alat = abs(lat);
    vec3 ocean = mix(SRGB(0.01, 0.05, 0.16), SRGB(0.03, 0.22, 0.36), smoothstep(-0.05, 0.1, c));
    float desert = smoothstep(0.05, 0.35, fbm(p * 3.0 + 20.0)) * (1.0 - smoothstep(0.2, 0.55, abs(alat - 0.32) * 2.0));
    vec3 green = mix(SRGB(0.13, 0.27, 0.09), SRGB(0.27, 0.36, 0.16), fbm(p * 9.0) * 0.5 + 0.5);
    vec3 ground = mix(green, SRGB(0.76, 0.62, 0.4), desert);
    ground = mix(ground, SRGB(0.42, 0.38, 0.33), smoothstep(0.55, 0.75, alat));
    ground = mix(ground, SRGB(0.55, 0.5, 0.45), smoothstep(0.3, 0.5, c) * 0.6);
    albedo = mix(ocean, ground, land);
    float ice = smoothstep(0.8, 0.84, alat + 0.06 * fbm(p * 7.0));
    albedo = mix(albedo, SRGB(0.92, 0.95, 1.0), ice);
    h = land * max(c - 0.1, 0.0) * 1.4 * (1.0 - ice);
    spec = (1.0 - land) * (1.0 - ice);
    float cities = land * (1.0 - ice) * smoothstep(0.45, 0.85, snoise(p * 70.0) * 0.5 + 0.5) * smoothstep(0.1, 0.4, fbm(p * 6.0 + 40.0));
    emissive = SRGB(1.0, 0.72, 0.38) * cities * 0.9;
    limb = 1.0;
  #elif LOOK == 3
    // Mars : sol rouille, grandes zones sombres, calottes polaires, Valles Marineris.
    float dark = smoothstep(-0.05, 0.3, fbm(p * 1.6 + vec3(5.0, 1.0, 2.0)) + 0.12 * sin(lat * 5.0));
    albedo = mix(SRGB(0.78, 0.44, 0.25), SRGB(0.4, 0.21, 0.13), dark * 0.85);
    albedo *= 0.82 + 0.32 * (fbm(p * 7.0 + 4.0) * 0.5 + 0.5);
    float canyon = exp(-pow((lat + 0.14 - 0.04 * sin(lon * 4.0)) / 0.016, 2.0)) * smoothstep(-1.4, -1.1, lon) * smoothstep(0.1, -0.2, lon);
    albedo *= 1.0 - canyon * 0.45;
    h = fbm(p * 4.0) * 0.45 + craters(p * 6.0 + 2.0, 0.3) * 0.3 + craters(p * 16.0, 0.4) * 0.1 - canyon * 1.2;
    float volcano = exp(-pow(length(p - normalize(vec3(-0.6, 0.3, 0.75))) / 0.09, 2.0));
    h += volcano * 1.2;
    float cap = smoothstep(0.87, 0.91, abs(lat) + 0.035 * fbm(p * 6.0));
    albedo = mix(albedo, SRGB(0.96, 0.94, 0.92), cap);
    h *= 1.0 - cap;
    limb = 0.35;
  #elif LOOK == 4 || LOOK == 5
    // Géantes gazeuses : bandes nuageuses qui tournent à des vitesses différentes selon la latitude.
    #if LOOK == 4
      float freq = 21.0;
      vec3 c1 = SRGB(0.9, 0.85, 0.76);
      vec3 c2 = SRGB(0.66, 0.47, 0.33);
      vec3 c3 = SRGB(0.8, 0.62, 0.45);
      float turbAmp = 0.065;
    #else
      float freq = 30.0;
      vec3 c1 = SRGB(0.92, 0.85, 0.67);
      vec3 c2 = SRGB(0.82, 0.71, 0.5);
      vec3 c3 = SRGB(0.88, 0.79, 0.6);
      float turbAmp = 0.018;
    #endif
    vec3 q = rotY(p, uTime * 0.012 * sin(lat * 17.0));
    float turb = fbm(q * vec3(3.0, 12.0, 3.0) + vec3(0.0, 0.0, uTime * 0.008));
    float fine = fbm(q * vec3(9.0, 34.0, 9.0) + 4.0);
    float y = lat + turbAmp * turb + turbAmp * 0.35 * fine;
    // Bandes de largeurs inégales : plusieurs fréquences sans rapport simple.
    float b1 = sin(y * freq) * 0.65 + sin(y * freq * 0.61 + 2.0) * 0.35;
    float b2 = sin(y * freq * 2.13 + 1.3);
    albedo = mix(c2, c1, smoothstep(-0.45, 0.45, b1));
    albedo = mix(albedo, c3, 0.35 * smoothstep(0.0, 1.0, b2));
    albedo *= 0.9 + 0.2 * fine;
    #if LOOK == 4
      albedo = mix(albedo, SRGB(0.88, 0.6, 0.38), 0.3 * exp(-pow(lat / 0.07, 2.0)));
      albedo = mix(albedo, SRGB(0.5, 0.52, 0.55), smoothstep(0.62, 0.92, abs(lat)) * 0.7);
      // Grande Tache rouge : un tourbillon ovale, avec son anneau plus clair.
      vec3 sq = rotY(p, uTime * 0.01);
      float slon = atan(sq.z, sq.x) - 0.9;
      slon = mod(slon + 3.14159265, 6.2831853) - 3.14159265;
      vec2 sp = vec2(slon * cos(asin(lat)) / 0.17, (lat + 0.37) / 0.075);
      float d = length(sp);
      float ang = atan(sp.y, sp.x) + 2.5 * exp(-d) + uTime * 0.05;
      float swirl = fbm(vec3(cos(ang) * d, sin(ang) * d, 3.0) * 1.5);
      float spot = 1.0 - smoothstep(0.55, 1.0, d);
      albedo = mix(albedo, mix(SRGB(0.72, 0.3, 0.18), SRGB(0.86, 0.48, 0.3), swirl * 0.5 + 0.5), spot * 0.92);
      albedo = mix(albedo, c1, exp(-pow((d - 1.12) / 0.16, 2.0)) * 0.6);
      // Ovales blancs.
      vec2 ov = vec2((mod(slon * 3.0 + 1.0, 6.2831853) - 3.14159265) * 0.25 / 0.06, (lat + 0.52) / 0.03);
      albedo = mix(albedo, c1, (1.0 - smoothstep(0.6, 1.0, length(ov))) * 0.8);
    #else
      // Hexagone du pôle Nord de Saturne.
      float colat = acos(clamp(lat, -1.0, 1.0));
      float hexA = mod(lon + uTime * 0.01, 1.0471976) - 0.5235988;
      float hexR = colat * cos(hexA) / 0.866;
      float hex = exp(-pow((hexR - 0.3) / 0.03, 2.0)) * step(0.0, lat);
      albedo = mix(albedo, SRGB(0.55, 0.62, 0.66), smoothstep(0.82, 0.97, lat) * 0.6);
      albedo = mix(albedo, SRGB(0.6, 0.6, 0.55), hex * 0.6);
    #endif
    limb = 0.55;
  #elif LOOK == 6
    // Uranus : brume bleu-vert presque uniforme, bandes très discrètes.
    vec3 q = rotY(p, uTime * 0.01);
    float n = fbm(q * vec3(2.0, 10.0, 2.0));
    albedo = SRGB(0.62, 0.86, 0.88) * (0.93 + 0.05 * sin(lat * 14.0 + n) + 0.04 * n);
    albedo = mix(albedo, SRGB(0.8, 0.93, 0.94), smoothstep(0.5, 0.95, lat) * 0.5);
    limb = 0.9;
  #elif LOOK == 7
    // Neptune : bleu profond, bandes, Grande Tache sombre et nuages blancs étirés.
    vec3 q = rotY(p, uTime * 0.018 * (1.0 - lat * lat));
    float n = fbm(q * vec3(2.5, 11.0, 2.5));
    albedo = mix(SRGB(0.16, 0.28, 0.78), SRGB(0.3, 0.48, 0.92), 0.5 + 0.5 * sin(lat * 16.0 + n * 2.0));
    float slon = atan(q.z, q.x) - 2.0;
    vec2 sp = vec2(slon / 0.25, (lat + 0.33) / 0.09);
    albedo = mix(albedo, SRGB(0.07, 0.12, 0.38), (1.0 - smoothstep(0.5, 1.0, length(sp))) * 0.8);
    float streak = smoothstep(0.35, 0.65, fbm(q * vec3(1.5, 28.0, 1.5) + 9.0)) * exp(-pow((lat + 0.42) / 0.06, 2.0) * 0.5 + 0.0) ;
    streak += smoothstep(0.45, 0.7, fbm(q * vec3(2.0, 30.0, 2.0) + 2.0)) * exp(-pow((lat - 0.3) / 0.05, 2.0));
    albedo = mix(albedo, vec3(0.95), clamp(streak, 0.0, 1.0) * 0.85);
    limb = 0.9;
  #endif

    if (uBump > 0.0) N = bumpNormal(N, h, uBump);
    float ndl = dot(N, L);
    float diffuse = max(ndl, 0.0);
    // Assombrissement du bord pour les planètes à atmosphère épaisse.
    float mu = max(dot(normalize(vN), V), 0.0);
    albedo *= mix(1.0, 0.45 + 0.55 * pow(mu, 0.45), limb);

    float shadow = 1.0;
  #if RINGS
    // Ombre des anneaux : le rayon vers le Soleil traverse-t-il le plan des anneaux ?
    float denom = dot(L, uRingNormal);
    if (abs(denom) > 1e-4) {
      float t = dot(uCenter - vW, uRingNormal) / denom;
      if (t > 0.0) {
        float r = length(vW + L * t - uCenter);
        shadow = 1.0 - 0.85 * ringDensity((r - uRingInner) / (uRingOuter - uRingInner));
      }
    }
  #endif

    vec3 color = albedo * (diffuse * 1.5 * shadow + 0.012);
    // Reflet du Soleil sur l'eau.
    vec3 H = normalize(L + V);
    color += spec * pow(max(dot(N, H), 0.0), 90.0) * 1.4 * SRGB(1.0, 0.92, 0.8) * shadow;
    color += spec * pow(max(dot(N, H), 0.0), 12.0) * 0.06 * SRGB(0.6, 0.8, 1.0) * shadow;
    // Lumières de la nuit.
    color += emissive * smoothstep(0.08, -0.15, dot(normalize(vN), L));
    // Diffusion de l'atmosphère au bord, côté jour.
    float day = smoothstep(-0.25, 0.35, dot(normalize(vN), L));
    color += uAtmo * pow(1.0 - mu, 3.5) * day * uAtmoStrength;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const LOOKS: Record<Look, number> = { rocky: 0, venus: 1, earth: 2, mars: 3, jupiter: 4, saturn: 5, uranus: 6, neptune: 7 };

export interface SurfaceOptions {
  look: Look;
  radius: number;
  tint?: string;
  maria?: number;
  atmo?: string;
  atmoStrength?: number;
  rings?: boolean;
}

/** Relief, en fonction du rayon (les planètes gazeuses n'en ont pas). */
const BUMP: Partial<Record<Look, number>> = { rocky: 0.016, earth: 0.008, mars: 0.01 };

export function surfaceMaterial({ look, radius, tint = '#a39d96', maria = 0, atmo = '#000000', atmoStrength = 0, rings = false }: SurfaceOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: planetFragment,
    defines: { LOOK: LOOKS[look], RINGS: rings ? 1 : 0 },
    uniforms: {
      uTime: { value: 0 },
      uBump: { value: (BUMP[look] ?? 0) * radius },
      uTint: { value: new Color(tint) },
      uMaria: { value: maria },
      uAtmo: { value: new Color(atmo) },
      uAtmoStrength: { value: atmoStrength },
      uRingNormal: { value: new Vector3(0, 1, 0) },
      uCenter: { value: new Vector3() },
      uRingInner: { value: 1 },
      uRingOuter: { value: 2 },
    },
  });
}

/* ---------- Nuages de la Terre ---------- */

const cloudFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  ${COMMON}
  void main() {
    vec3 p = normalize(vObj);
    vec3 q = rotY(p, uTime * 0.01);
    // Tourbillons : le bruit est déformé par un autre bruit.
    vec3 w = vec3(fbm(q * 2.5 + 3.0), fbm(q * 2.5 + 8.0), fbm(q * 2.5 + 13.0));
    float n = fbm(q * 3.2 + w * 1.2 + vec3(0.0, uTime * 0.003, 0.0));
    float bands = 0.65 + 0.35 * cos(p.y * 9.0);
    float a = smoothstep(0.05, 0.5, n * bands + 0.08 * snoise(q * 22.0));
    vec3 L = normalize(-vW);
    float d = dot(normalize(vN), L);
    float lit = max(d, 0.0) * 1.4 + 0.01;
    vec3 color = vec3(lit) * mix(vec3(1.0, 0.75, 0.55), vec3(1.0), smoothstep(0.0, 0.25, d));
    gl_FragColor = vec4(color, a * 0.92);
  }
`;

export function cloudMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: cloudFragment,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
  });
}

/* ---------- Halo d'atmosphère ---------- */

const haloFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEdge;
  uniform float uStrength;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    vec3 N = normalize(vN);
    // Face arrière de la coquille : la lueur est forte au ras de la planète et s'éteint vers l'extérieur.
    float x = clamp(-dot(N, V) / uEdge, 0.0, 1.0);
    float glow = pow(x, 2.6);
    float day = smoothstep(-0.35, 0.45, dot(N, normalize(-vW)));
    gl_FragColor = vec4(uColor * glow * day * uStrength, 1.0);
  }
`;

/** Halo additif, sur une coquille de rayon `scale` fois celui de la planète. */
export function haloMaterial(color: string, scale: number, strength: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: haloFragment,
    uniforms: {
      uColor: { value: new Color(color) },
      uEdge: { value: Math.sqrt(1 - 1 / (scale * scale)) },
      uStrength: { value: strength },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: BackSide,
  });
}

/* ---------- Anneaux ---------- */

const ringVertex = /* glsl */ `
  varying vec3 vLocal;
  varying vec3 vW;
  varying vec3 vNormalW;
  void main() {
    vLocal = position;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const ringFragment = /* glsl */ `
  uniform float uInner;
  uniform float uOuter;
  uniform vec3 uCenter;
  uniform float uPlanetRadius;
  uniform float uScale;
  uniform float uKind;
  varying vec3 vLocal;
  varying vec3 vW;
  varying vec3 vNormalW;
  ${COMMON}

  void main() {
    float r = length(vLocal.xy);
    float x = (r - uInner) / (uOuter - uInner);
    if (x < 0.0 || x > 1.0) discard;
    float d;
    vec3 col;
    if (uKind < 0.5) {
      // Saturne : anneaux C, B, division de Cassini, anneau A et division d'Encke.
      d = x < 0.28 ? 0.22 + 0.2 * x : x < 0.68 ? 0.92 : x < 0.73 ? 0.05 : 0.68;
      if (abs(x - 0.93) < 0.007) d = 0.08;
      d *= smoothstep(0.0, 0.02, x) * smoothstep(1.0, 0.985, x);
      d *= 0.8 + 0.12 * sin(x * 140.0) * sin(x * 53.0) + 0.1 * snoise(vec3(x * 60.0, 0.0, 0.0));
      col = mix(SRGB(0.62, 0.55, 0.45), SRGB(0.93, 0.86, 0.72), smoothstep(0.2, 0.7, x));
    } else {
      // Uranus : quelques anneaux fins et sombres.
      float k = fract(x * 6.0);
      d = (smoothstep(0.42, 0.5, k) - smoothstep(0.5, 0.58, k)) * 0.5 + exp(-pow((x - 0.95) / 0.015, 2.0)) * 0.7;
      col = SRGB(0.6, 0.66, 0.7);
    }
    vec3 L = normalize(-vW);
    vec3 V = normalize(cameraPosition - vW);
    vec3 N = normalize(vNormalW);
    // Ombre de la planète sur les anneaux.
    vec3 oc = vW - uCenter;
    float b = dot(oc, L);
    float c = dot(oc, oc) - uPlanetRadius * uPlanetRadius;
    float disc = b * b - c;
    float shadow = (disc > 0.0 && -b - sqrt(disc) > 0.0) ? 0.04 : 1.0;
    // Vu du côté non éclairé, la lumière traverse surtout les zones peu denses.
    bool backlit = sign(dot(N, L)) != sign(dot(N, V));
    float light = backlit ? 0.25 * (1.0 - d) + 0.06 : 0.25 + 1.15 * abs(dot(N, L));
    gl_FragColor = vec4(col * light * shadow * 1.2, clamp(d, 0.0, 1.0));
  }
`;

export function ringMaterial(inner: number, outer: number, planetRadius: number, kind: 'saturn' | 'uranus'): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    uniforms: {
      uInner: { value: inner },
      uOuter: { value: outer },
      uCenter: { value: new Vector3() },
      uPlanetRadius: { value: planetRadius },
      uScale: { value: 1 },
      uKind: { value: kind === 'saturn' ? 0 : 1 },
    },
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
  });
}

/* ---------- Soleil ---------- */

const sunFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  ${COMMON}
  void main() {
    vec3 p = normalize(vObj);
    float big = fbm(p * 3.5 + vec3(0.0, uTime * 0.03, 0.0));
    // Granulation : cellules de convection qui bouillonnent.
    float gran = snoise(p * 38.0 + vec3(uTime * 0.12)) * 0.5 + snoise(p * 80.0 - vec3(uTime * 0.2)) * 0.25;
    float spots = smoothstep(0.42, 0.55, fbm(p * 2.6 + vec3(19.0, uTime * 0.005, 0.0)));
    float g = clamp(0.58 + 0.28 * big + 0.16 * gran, 0.0, 1.0);
    vec3 color = mix(SRGB(1.0, 0.42, 0.08), SRGB(1.0, 0.86, 0.55), g);
    color *= 1.0 - spots * 0.75;
    float mu = max(dot(normalize(vN), normalize(cameraPosition - vW)), 0.0);
    color *= 0.45 + 0.55 * pow(mu, 0.5);
    gl_FragColor = vec4(color * 4.0, 1.0);
  }
`;

export function sunMaterial(): ShaderMaterial {
  return new ShaderMaterial({ vertexShader: vertex, fragmentShader: sunFragment, uniforms: { uTime: { value: 0 } } });
}

/** Couronne : lueur additive autour du disque solaire, qui ondule doucement. */
const coronaFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  ${COMMON}
  void main() {
    vec3 V = normalize(cameraPosition - vW);
    float x = clamp(-dot(normalize(vN), V) / 0.98, 0.0, 1.0);
    vec3 p = normalize(vObj);
    float n = fbm(p * 5.0 + vec3(uTime * 0.05));
    float glow = pow(x, 6.0) * (0.75 + 0.5 * n);
    gl_FragColor = vec4(SRGB(1.0, 0.6, 0.25) * glow * 2.2, 1.0);
  }
`;

export function coronaMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: vertex,
    fragmentShader: coronaFragment,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: BackSide,
  });
}

/* ---------- Voie lactée ---------- */

const skyFragment = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vN;
  varying vec3 vW;
  ${COMMON}
  void main() {
    vec3 d = normalize(vObj);
    vec3 n = normalize(vec3(0.32, 0.86, 0.4));
    float y = dot(d, n);
    float band = exp(-pow(y / 0.2, 2.0));
    float clouds = fbm(d * 3.0) * 0.5 + 0.5;
    float fine = fbm(d * 9.0 + 4.0) * 0.5 + 0.5;
    float dust = smoothstep(0.45, 0.75, fbm(d * 5.0 + 3.0) * 0.5 + 0.5) * exp(-pow((y - 0.02) / 0.06, 2.0));
    vec3 core = normalize(vec3(-0.75, 0.3, 0.55));
    float bulge = exp(-pow(distance(d, core) / 0.55, 2.0));
    vec3 color = mix(SRGB(0.32, 0.38, 0.6), SRGB(0.95, 0.78, 0.58), bulge);
    float lum = band * (0.35 + 0.65 * clouds) * (0.6 + 0.4 * fine) * (1.0 - dust * 0.8) * (0.55 + bulge * 0.9);
    // Quelques nébuleuses colorées, très discrètes.
    float neb = smoothstep(0.55, 0.8, fbm(d * 2.2 + 17.0) * 0.5 + 0.5) * band;
    vec3 sky = color * lum * 0.085 + SRGB(0.55, 0.2, 0.35) * neb * 0.02 + SRGB(0.02, 0.025, 0.04) * 0.15;
    gl_FragColor = vec4(sky, 1.0);
  }
`;

export function skyMaterial(): ShaderMaterial {
  return new ShaderMaterial({ vertexShader: vertex, fragmentShader: skyFragment, side: BackSide, depthWrite: false });
}
