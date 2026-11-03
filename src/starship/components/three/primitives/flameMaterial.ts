import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';

/** Bruit de valeur 3D et turbulence (fbm). */
const noise = /* glsl */ `
  float hash3(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise3(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash3(i), hash3(i + vec3(1, 0, 0)), f.x), mix(hash3(i + vec3(0, 1, 0)), hash3(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash3(i + vec3(0, 0, 1)), hash3(i + vec3(1, 0, 1)), f.x), mix(hash3(i + vec3(0, 1, 1)), hash3(i + vec3(1, 1, 1)), f.x), f.y),
      f.z
    );
  }
  float fbm(vec3 p) {
    float v = 0.0;
    float a = 0.55;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise3(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= 0.5;
    }
    return v;
  }
`;

/**
 * Le panache est dessiné sur un plan qui contient l'axe du moteur et pivote
 * autour de lui pour toujours faire face à la caméra. Le fragment calcule
 * l'épaisseur de gaz traversée par le regard dans un cône de révolution :
 * bords naturellement fondus, sans silhouette de cylindre.
 */
const vertexShader = /* glsl */ `
  uniform float uR1;
  uniform float uLen;
  varying float vS;
  varying float vT;
  void main() {
    vec3 origin = vec3(0.0);
    #ifdef USE_INSTANCING
      origin = (instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    #endif
    vec3 camLocal = (inverse(modelMatrix) * vec4(cameraPosition, 1.0)).xyz;
    vec2 d = camLocal.xz - origin.xz;
    float len = length(d);
    vec2 side = len > 1e-4 ? vec2(-d.y, d.x) / len : vec2(1.0, 0.0);
    float w = uR1 * 1.2;
    float across = (uv.x * 2.0 - 1.0) * w;
    float along = 1.0 - uv.y;
    vec3 p = origin + vec3(side.x * across, -along * uLen, side.y * across);
    vS = across;
    vT = along;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uHot;
  uniform vec3 uMid;
  uniform vec3 uCool;
  uniform float uOpacity;
  uniform float uFalloff;
  uniform float uDiamonds;
  uniform float uTime;
  uniform float uGain;
  uniform float uTurbulence;
  uniform float uSpeed;
  uniform float uSeed;
  uniform float uR0;
  uniform float uR1;
  uniform float uPow;
  varying float vS;
  varying float vT;
  ${noise}
  void main() {
    // 0 à la tuyère, 1 en bout de panache. Les bases de pow() sont toutes bornées :
    // un NaN serait étalé par le flou lumineux (bloom) en grandes zones noires.
    float t = clamp(vT, 0.0, 1.0);
    float radius = uR0 + (uR1 - uR0) * pow(t, uPow);
    // Le panache ondule et se tord légèrement en s'éloignant de la tuyère.
    float wob = vnoise3(vec3(t * 3.0 - uTime * uSpeed * 0.35, uSeed, 0.5)) - 0.5;
    radius *= 1.0 + wob * 0.35 * t;
    float x = vS / max(radius, 1e-3) + (vnoise3(vec3(t * 2.0 - uTime * uSpeed * 0.2, uSeed + 4.0, 1.5)) - 0.5) * 0.3 * t;
    float inside = clamp(1.0 - x * x, 0.0, 1.0);
    // Épaisseur de gaz traversée par le regard (profil d'une sphère, puis d'un cône).
    float thick = sqrt(inside);

    vec3 q = vec3(x * 1.6, t * (7.0 - 3.0 * t) - uTime * uSpeed, uSeed);
    float n = fbm(q);
    float turb = mix(1.0, 0.35 + 1.3 * n, uTurbulence);
    // L'extrémité s'éteint par lambeaux, pas d'un trait net.
    float erosion = clamp((n + 0.6 - t * 1.05) * 2.6, 0.0, 1.0);
    float start = smoothstep(0.0, 0.07, t);
    // Disques de Mach : surintensités régulières dans le cœur, près de la tuyère.
    float diamonds = 1.0 + uDiamonds * pow(clamp(sin(t * 36.0 - 0.6), 0.0, 1.0), 10.0) * (1.0 - smoothstep(0.0, 0.55, t)) * smoothstep(0.5, 0.95, thick);

    float alpha = uOpacity * pow(thick, 1.4) * pow(clamp(1.0 - t, 0.0, 1.0), uFalloff) * turb * erosion * diamonds * start;
    alpha = clamp(alpha, 0.0, 1.0);

    // Température : blanc rosé au cœur (méthane-oxygène), jaune orangé, puis rouge sombre.
    float heat = clamp(thick * 0.9 - t * 1.15 + (n - 0.5) * 0.5 + 0.3, 0.0, 1.0);
    vec3 color = mix(uCool, uMid, smoothstep(0.1, 0.5, heat));
    color = mix(color, uHot, smoothstep(0.55, 0.95, heat));
    gl_FragColor = vec4(max(color * uGain * (0.8 + 0.4 * n), vec3(0.0)), alpha);
  }
`;

export interface FlameOptions {
  hot: string;
  mid: string;
  cool: string;
  falloff?: number;
  diamonds?: number;
  gain?: number;
  /** Part de turbulence (0 = lisse, 1 = très agitée). */
  turbulence?: number;
  /** Vitesse de défilement de la turbulence. */
  speed?: number;
  seed?: number;
  /** Rayon à la tuyère, rayon en bout de panache, longueur. */
  r0?: number;
  r1?: number;
  length?: number;
  /** Forme de l'évasement : < 1 s'ouvre vite, > 1 reste en colonne puis s'ouvre. */
  shape?: number;
}

/** Matériau additif d'un panache moteur volumétrique, compatible avec l'instanciation. */
export function flameMaterial({
  hot,
  mid,
  cool,
  falloff = 1.5,
  diamonds = 0,
  gain = 2.2,
  turbulence = 0.8,
  speed = 6,
  seed = 0,
  r0 = 0.5,
  r1 = 1,
  length = 5,
  shape = 1,
}: FlameOptions): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHot: { value: new Color(hot) },
      uMid: { value: new Color(mid) },
      uCool: { value: new Color(cool) },
      uOpacity: { value: 0 },
      uFalloff: { value: falloff },
      uDiamonds: { value: diamonds },
      uTime: { value: 0 },
      uGain: { value: gain },
      uTurbulence: { value: turbulence },
      uSpeed: { value: speed },
      uSeed: { value: seed },
      uR0: { value: r0 },
      uR1: { value: r1 },
      uLen: { value: length },
      uPow: { value: shape },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}
