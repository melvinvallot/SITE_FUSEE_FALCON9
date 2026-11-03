import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, NormalBlending, PerspectiveCamera, ShaderMaterial, type Points } from 'three';
import { clamp, smoothstep } from '../../../../lib/math';
import { GROUND_Y, LAUNCH_ALTITUDE } from '../../../data/layout';
import { ignition, launchLift } from '../../../lib/flight';
import { useSceneState } from '../SceneStateContext';

const COUNT = 1100;
/** Sortie des tuyères du propulseur, sous la base du lanceur. */
const NOZZLE_OFFSET = -0.4;

const vertexShader = /* glsl */ `
  attribute vec3 aSeed;
  uniform float uTop;
  uniform float uGround;
  uniform float uOpacity;
  uniform float uScale;
  uniform float uTime;
  uniform float uFlame;
  varying float vAlpha;
  varying float vHot;
  varying float vSeed;
  void main() {
    float h = position.y;
    float age = uTop - h;
    float alive = step(0.0, age);
    // La colonne s'élargit avec le temps, s'étale au sol et dérive avec le vent.
    float low = max(0.0, 4.0 - (h - uGround));
    float r = 0.35 + age * 0.085 + low * low * 0.9;
    vec3 p = vec3(aSeed.x * r + age * 0.045, h + sin(uTime * 0.4 + aSeed.z * 6.28) * 0.15 * min(age, 6.0), aSeed.y * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float size = (1.1 + age * 0.17 + low * 1.4) * (0.55 + aSeed.z * 0.9);
    gl_PointSize = alive * clamp(size * uScale / max(0.5, -mv.z), 0.0, 900.0);
    gl_Position = projectionMatrix * mv;
    vAlpha = alive * uOpacity * smoothstep(0.0, 0.8, age) * exp(-age / 70.0) * 0.5;
    vHot = uFlame * exp(-age / 2.6);
    vSeed = aSeed.z;
  }
`;

const fragmentShader = /* glsl */ `
  varying float vAlpha;
  varying float vHot;
  varying float vSeed;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    // Bouffée cotonneuse : bord doux, léger relief sur le dessus.
    float puff = pow(1.0 - d, 1.6) * (0.75 + 0.25 * sin(c.x * 9.0 + vSeed * 20.0) * sin(c.y * 7.0 - vSeed * 13.0));
    float shade = 0.75 + 0.35 * (0.5 - c.y);
    vec3 smoke = vec3(0.34, 0.37, 0.42) * shade;
    vec3 lit = vec3(1.0, 0.62, 0.3) * 2.2;
    vec3 color = mix(smoke, lit, clamp(vHot, 0.0, 1.0));
    gl_FragColor = vec4(color, clamp(vAlpha * puff, 0.0, 1.0));
  }
`;

/** Petit générateur déterministe : la colonne a toujours la même forme. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Traînée de fumée et de vapeur laissée par le propulseur : une colonne de
 * bouffées entre le sol et la tuyère, calculée à partir de l'altitude, donc
 * cohérente quand on fait défiler la page dans un sens ou dans l'autre.
 */
export function ExhaustTrail() {
  const state = useSceneState();
  const points = useRef<Points>(null);

  const geometry = useMemo(() => {
    const rnd = random(42);
    const pos = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT * 3);
    const top = LAUNCH_ALTITUDE + 2;
    for (let i = 0; i < COUNT; i++) {
      // Plus de bouffées près du sol, où le nuage est le plus dense.
      const u = rnd();
      pos[i * 3 + 1] = GROUND_Y + Math.pow(u, 1.35) * (top - GROUND_Y);
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd());
      seed[i * 3] = Math.cos(a) * r;
      seed[i * 3 + 1] = Math.sin(a) * r;
      seed[i * 3 + 2] = rnd();
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new BufferAttribute(seed, 3));
    return g;
  }, []);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTop: { value: GROUND_Y },
          uGround: { value: GROUND_Y },
          uOpacity: { value: 0 },
          uScale: { value: 600 },
          uTime: { value: 0 },
          uFlame: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: NormalBlending,
      }),
    [],
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ camera, size, gl, clock }) => {
    const s = state.current;
    const p = points.current;
    if (!p) return;
    const started = clamp((s.launch - 0.13) / 0.06);
    const opacity = started * (1 - smoothstep((s.capture - 0.2) / 0.35)) * (s.env < 0.5 ? 1 : 0) * (1 - smoothstep((s.alt - 0.6) / 0.3) * 0.7);
    p.visible = opacity > 0.01;
    if (!p.visible) return;
    const u = material.uniforms;
    u.uTop!.value = launchLift(s.launch) + NOZZLE_OFFSET;
    u.uOpacity!.value = opacity;
    u.uTime!.value = clock.elapsedTime;
    u.uFlame!.value = ignition(s.launch) * (1 - smoothstep(s.sep * 3));
    if (camera instanceof PerspectiveCamera) {
      u.uScale!.value = (size.height * gl.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    }
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={2} />;
}
