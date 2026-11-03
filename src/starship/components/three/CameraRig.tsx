import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { launchLift } from '../../lib/flight';
import { useSceneState } from './SceneStateContext';

interface CameraRigProps {
  /** Amplitude de la parallaxe liée au pointeur (0 pour la couper). */
  parallax?: number;
  reducedMotion?: boolean;
}

/**
 * Place la caméra selon l'état de la scène. Pendant l'ascension, elle suit
 * l'altitude atteinte ; sur écran étroit, la fusée est recentrée et la caméra recule.
 */
export function CameraRig({ parallax = 0.5, reducedMotion = false }: CameraRigProps) {
  const state = useSceneState();
  const size = useThree((s) => s.size);
  const v = useMemo(() => ({ pos: new Vector3(), target: new Vector3(), offset: new Vector3() }), []);

  useFrame(({ camera, pointer, clock }) => {
    const s = state.current;
    const narrow = size.width / size.height < 0.9;
    const anchor = launchLift(s.launch) * (1 - s.capture);

    v.target.set(s.cameraTarget[0] * (narrow ? 0.1 : 1), s.cameraTarget[1] + anchor, s.cameraTarget[2]);
    v.pos.set(s.cameraPosition[0], s.cameraPosition[1] + anchor, s.cameraPosition[2]);

    // Balancement lent autour de la cible.
    if (!reducedMotion && s.sway > 0) {
      v.offset.copy(v.pos).sub(v.target);
      v.offset.applyAxisAngle(new Vector3(0, 1, 0), Math.sin(clock.elapsedTime * 0.16) * 0.1 * s.sway);
      v.pos.copy(v.target).add(v.offset);
    }

    if (narrow) {
      // Recul, puis panoramique vers le bas : le sujet remonte dans la moitié haute de l'écran.
      v.pos.sub(v.target).multiplyScalar(1.5).add(v.target);
      const pan = v.pos.distanceTo(v.target) * 0.16;
      v.pos.y -= pan;
      v.target.y -= pan;
    }

    camera.position.set(v.pos.x + pointer.x * parallax, v.pos.y + pointer.y * parallax * 0.6, v.pos.z);
    camera.lookAt(v.target);
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - s.fov) > 0.01) {
      camera.fov = s.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
