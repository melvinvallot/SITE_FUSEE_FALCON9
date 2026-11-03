import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { launchLift } from '../../lib/launch';
import { useSceneState } from './SceneStateContext';
import { framingFor, lateralScale } from '../../lib/device';

interface CameraRigProps {
  /** Amplitude de la parallaxe liée au pointeur. */
  parallax?: number;
}

/**
 * Place la caméra selon l'état de la scène. Sur écran étroit, la fusée est
 * recentrée derrière le texte et la caméra recule.
 */
export function CameraRig({ parallax = 0.4 }: CameraRigProps) {
  const state = useSceneState();
  const size = useThree((s) => s.size);
  const v = useMemo(() => ({ pos: new Vector3(), target: new Vector3(), look: new Vector3() }), []);

  useFrame(({ camera, pointer }) => {
    const s = state.current;
    const aspect = size.width / size.height;
    const narrow = framingFor(aspect) === 'portrait';
    const lift = launchLift(s.launch) * 0.82;

    v.target.set(s.cameraTarget[0] * (narrow ? 0.12 : lateralScale(aspect)), s.cameraTarget[1] + lift, s.cameraTarget[2]);
    v.pos.set(s.cameraPosition[0], s.cameraPosition[1] + lift, s.cameraPosition[2]);
    if (narrow) {
      // Recul, puis léger panoramique vers le bas : la pièce reste entière sous le menu, au-dessus du texte.
      v.pos.sub(v.target).multiplyScalar(1.55).add(v.target);
      const pan = v.pos.distanceTo(v.target) * 0.08;
      v.pos.y -= pan;
      v.target.y -= pan;
    }

    camera.position.set(v.pos.x + pointer.x * parallax, v.pos.y + pointer.y * parallax * 0.6, v.pos.z);
    v.look.copy(v.target);
    camera.lookAt(v.look);
  });

  return null;
}
