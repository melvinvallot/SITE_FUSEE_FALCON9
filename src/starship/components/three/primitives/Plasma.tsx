import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, type Group } from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uInner;
  uniform vec3 uOuter;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    float rim = 1.0 - clamp(abs(dot(normalize(vNormal), normalize(vView))), 0.0, 1.0);
    float waves = 0.75 + 0.25 * sin(vPos.y * 6.0 - uTime * 9.0) * sin(vPos.x * 9.0 + uTime * 4.0);
    // Plus intense au centre du ventre (z élevé), nul sur les flancs.
    float belly = smoothstep(0.0, 1.0, vPos.z);
    vec3 color = mix(uInner, uOuter, rim);
    float alpha = uIntensity * belly * (0.12 + rim * 1.1) * waves;
    gl_FragColor = vec4(max(color * 1.5, vec3(0.0)), clamp(alpha * 0.42, 0.0, 1.0));
  }
`;

interface PlasmaProps {
  radius: number;
  length: number;
  /** Intensité (0..1), lue à chaque image. */
  intensity: () => number;
}

/**
 * Gaine de plasma de la rentrée : une coque lumineuse sur la face au vent
 * (+z) du vaisseau, animée de vagues.
 */
export function Plasma({ radius, length, intensity }: PlasmaProps) {
  const group = useRef<Group>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uIntensity: { value: 0 },
          uInner: { value: new Color('#ffd2a6') },
          uOuter: { value: new Color('#ff4f8b') },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        toneMapped: false,
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const k = intensity();
    if (group.current) group.current.visible = k > 0.01;
    material.uniforms.uTime!.value = clock.elapsedTime;
    material.uniforms.uIntensity!.value = k;
  });

  return (
    <group ref={group}>
      <mesh material={material} position={[0, length / 2, 0]}>
        <cylinderGeometry args={[radius * 1.18, radius * 1.18, length, 48, 12, true, -Math.PI / 2, Math.PI]} />
      </mesh>
    </group>
  );
}
