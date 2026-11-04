import { ShaderMaterial, type Vector3 } from 'three';
import { NOISE_GLSL } from './noise.glsl';

const vertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vLocal;
  void main() {
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
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

/** La Lune vue de loin : mers sombres et cratères générés par du bruit, éclairée par `sun`. */
export const createMoonMaterial = (sun: Vector3): ShaderMaterial =>
  new ShaderMaterial({ vertexShader, fragmentShader, uniforms: { uSun: { value: sun } } });
