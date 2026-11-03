import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, type Group, type PointLight } from 'three';
import { ignition, launchLift } from '../../../lib/launch';
import { useSceneState } from '../SceneStateContext';

interface FlameProps {
  /** Altitude de la sortie des tuyères, dans le repère du groupe parent. */
  y: number;
  radius: number;
  flicker?: boolean;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uHot;
  uniform vec3 uCool;
  uniform float uOpacity;
  uniform float uFalloff;
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    float t = 1.0 - vUv.y;                       // 0 à la tuyère, 1 en bout de panache
    float edge = pow(abs(dot(vNormal, vView)), 1.6);
    float alpha = uOpacity * pow(1.0 - t, uFalloff) * edge;
    gl_FragColor = vec4(mix(uHot, uCool, smoothstep(0.0, 0.6, t)), alpha);
  }
`;

function plumeMaterial(hot: string, cool: string, falloff: number): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uHot: { value: new Color(hot) },
      uCool: { value: new Color(cool) },
      uOpacity: { value: 0 },
      uFalloff: { value: falloff },
    },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
  });
}

/**
 * Panache des moteurs : un cœur lumineux et une enveloppe qui s'élargit
 * avec l'altitude, comme dans l'air raréfié.
 */
export function Flame({ y, radius, flicker = true }: FlameProps) {
  const group = useRef<Group>(null);
  const plume = useRef<Group>(null);
  const light = useRef<PointLight>(null);
  const state = useSceneState();

  const [core, envelope] = useMemo(
    () => [plumeMaterial('#fff6e0', '#ffb347', 1.4), plumeMaterial('#ffc46b', '#ff6a2a', 1.8)],
    [],
  );

  useEffect(
    () => () => {
      core.dispose();
      envelope.dispose();
    },
    [core, envelope],
  );

  useFrame(({ clock }) => {
    const { launch } = state.current;
    const ig = ignition(launch);
    const g = group.current;
    if (!g) return;
    g.visible = ig > 0.001;
    if (light.current) light.current.intensity = 0;
    if (!g.visible) return;

    const t = clock.elapsedTime;
    const jitter = flicker ? 1 + Math.sin(t * 47) * 0.05 + Math.sin(t * 23.3) * 0.04 : 1;
    const thin = Math.min(1, launchLift(launch) / 20); // l'enveloppe s'évase en altitude
    g.scale.set(jitter, ig * jitter, jitter);
    if (plume.current) plume.current.scale.set(1 + thin * 0.9, 1 + thin * 0.5, 1 + thin * 0.9);
    core.uniforms.uOpacity!.value = 1.1 * ig;
    envelope.uniforms.uOpacity!.value = 0.75 * ig;
    if (light.current) light.current.intensity = 60 * ig * jitter;
  });

  return (
    <group position={[0, y, 0]}>
      <group ref={group}>
        <mesh position={[0, -1.1, 0]} material={core}>
          <cylinderGeometry args={[radius * 0.85, radius * 0.25, 2.2, 32, 1, true]} />
        </mesh>
        <group ref={plume}>
          <mesh position={[0, -2.3, 0]} material={envelope}>
            <cylinderGeometry args={[radius * 1.05, radius * 1.9, 4.6, 32, 1, true]} />
          </mesh>
        </group>
      </group>
      <pointLight ref={light} position={[0, -0.6, 0]} color="#ffad5a" intensity={0} distance={14} decay={2} />
    </group>
  );
}
