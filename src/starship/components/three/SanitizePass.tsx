import { useEffect, useMemo } from 'react';
import { ShaderPass } from 'postprocessing';
import { ShaderMaterial, Uniform } from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D inputBuffer;
  varying vec2 vUv;
  void main() {
    vec4 c = texture2D(inputBuffer, vUv);
    // Un pixel invalide (NaN ou infini) est remplacé par du noir, et les valeurs extrêmes sont bornées.
    bool invalid = any(isnan(c)) || any(isinf(c)) || any(notEqual(c, c)) || any(greaterThan(abs(c), vec4(1e4)));
    gl_FragColor = invalid ? vec4(0.0, 0.0, 0.0, 1.0) : min(c, vec4(64.0));
  }
`;

/**
 * Passe de nettoyage placée juste après le rendu de la scène. Sur certaines
 * cartes graphiques, un seul pixel invalide suffit : le flou lumineux (bloom)
 * l'étale ensuite sur une grande partie de l'écran, qui devient noire.
 */
export function SanitizePass() {
  const pass = useMemo(
    () =>
      new ShaderPass(
        new ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: { inputBuffer: new Uniform(null) },
          depthWrite: false,
          depthTest: false,
          toneMapped: false,
        }),
        'inputBuffer',
      ),
    [],
  );
  useEffect(() => () => pass.dispose(), [pass]);
  return <primitive object={pass} dispose={null} />;
}
