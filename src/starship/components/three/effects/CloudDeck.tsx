import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide, ShaderMaterial, type Mesh } from 'three';
import { clamp, smoothstep } from '../../../../lib/math';
import { ignition, launchLift } from '../../../lib/flight';
import { useSceneState } from '../SceneStateContext';

/** Altitude de la couche nuageuse, en unités de scène. */
const DECK_Y = 44;

const vertexShader = /* glsl */ `
  varying vec2 vXZ;
  void main() {
    vXZ = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  uniform float uGlow;
  uniform float uRocketY;
  varying vec2 vXZ;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * vnoise(p);
      p = p * 2.1 + 3.7;
      a *= 0.5;
    }
    return v;
  }
  void main() {
    vec2 p = vXZ * 0.018 + vec2(uTime * 0.004, 0.0);
    float n = fbm(p);
    float cover = smoothstep(0.42, 0.75, n);
    float dist = length(vXZ);
    float fade = 1.0 - smoothstep(140.0, 330.0, dist);
    // Trou percé par la fusée et ses gaz, qui s'élargit une fois la couche franchie.
    float hole = smoothstep(1.5, 4.0 + max(0.0, uRocketY) * 0.25, dist);
    vec3 moon = vec3(0.16, 0.19, 0.25) * (0.7 + 0.6 * fbm(p * 3.0));
    // Lueur orangée des moteurs sur le dessous des nuages, autour de la fusée.
    vec3 glow = vec3(1.0, 0.5, 0.2) * uGlow * exp(-dist / 18.0) * 2.5;
    gl_FragColor = vec4(moon + glow, clamp(cover * fade * hole * uOpacity, 0.0, 1.0));
  }
`;

/** Couche de nuages que la fusée traverse pendant l'ascension. */
export function CloudDeck() {
  const state = useSceneState();
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 }, uGlow: { value: 0 }, uRocketY: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const s = state.current;
    const m = mesh.current;
    if (!m) return;
    const o = clamp((s.launch - 0.3) / 0.15) * (1 - smoothstep((s.alt - 0.45) / 0.3)) * (1 - clamp(s.capture * 4)) * (s.env < 0.5 ? 1 : 0);
    m.visible = o > 0.01;
    if (!m.visible) return;
    const top = launchLift(s.launch) + 31;
    const u = material.uniforms;
    u.uOpacity!.value = o * 0.85;
    u.uTime!.value = clock.elapsedTime;
    u.uRocketY!.value = top - DECK_Y;
    const near = Math.exp(-Math.abs(launchLift(s.launch) - DECK_Y) / 25);
    u.uGlow!.value = ignition(s.launch) * (1 - smoothstep(s.sep * 3)) * near;
  });

  return (
    <mesh ref={mesh} material={material} position={[0, DECK_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} frustumCulled={false} renderOrder={1}>
      <planeGeometry args={[700, 700, 1, 1]} />
    </mesh>
  );
}
