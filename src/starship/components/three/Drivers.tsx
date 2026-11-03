import { useFrame } from '@react-three/fiber';
import { lerp, smoothstep } from '../../../lib/math';
import { RADIUS } from '../../data/layout';
import { CUT_PLANE } from './materials';
import { useSceneState } from './SceneStateContext';

/**
 * Oriente le plan de coupe face à la caméra et le fait glisser jusqu'à
 * l'axe du lanceur quand la vue en coupe s'active.
 */
export function CutawayDriver() {
  const state = useSceneState();
  useFrame(({ camera }) => {
    const k = smoothstep(state.current.cutaway);
    const len = Math.hypot(camera.position.x, camera.position.z) || 1;
    CUT_PLANE.normal.set(-camera.position.x / len, 0, -camera.position.z / len);
    CUT_PLANE.constant = k < 0.001 ? 1000 : lerp(RADIUS + 0.6, 0, k);
  });
  return null;
}

/**
 * Fondu au noir entre deux décors : la toile s'efface quand le paramètre
 * `env` passe d'un décor au suivant.
 */
export function EnvFader() {
  const state = useSceneState();
  useFrame(({ gl }) => {
    const env = state.current.env;
    const frac = Math.abs(env - Math.round(env));
    const opacity = 1 - smoothstep(frac * 2.2);
    const value = opacity.toFixed(3);
    if (gl.domElement.style.opacity !== value) gl.domElement.style.opacity = value;
  });
  return null;
}
