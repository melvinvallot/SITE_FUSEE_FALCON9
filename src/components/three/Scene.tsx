import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { ACESFilmicToneMapping } from 'three';
import type { Keyframe } from '../../types';
import type { Store } from '../../lib/store';
import { TimelineDriver } from './SceneStateContext';
import { CameraRig } from './CameraRig';
import { Rocket } from './Rocket';
import { LaunchSite } from './LaunchSite';
import { AdaptiveResolution } from './AdaptiveResolution';
import { isLowPower, maxPixelRatio } from '../../lib/device';

/** Téléphones et tablettes : résolution plafonnée et moins d'étoiles. */
const LOW_POWER = isLowPower();
const MAX_DPR = maxPixelRatio(2, LOW_POWER);

interface SceneProps {
  keyframes: readonly Keyframe[];
  progress: Store<number>;
  reducedMotion?: boolean;
}

/** Toile 3D fixe en arrière-plan de la page. */
export function Scene({ keyframes, progress, reducedMotion = false }: SceneProps) {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, MAX_DPR]}
        camera={{ fov: 35, near: 0.1, far: 500, position: [10, 6, 24] }}
        gl={{ antialias: true, alpha: true, toneMapping: ACESFilmicToneMapping }}
      >
        <TimelineDriver keyframes={keyframes} progress={progress} reducedMotion={reducedMotion}>
          <hemisphereLight args={['#bcd3ef', '#1a2433', 0.9]} />
          <directionalLight position={[12, 18, 10]} intensity={2.6} color="#fff6ea" />
          <directionalLight position={[-14, 6, -12]} intensity={1.4} color="#7fa6d9" />
          {/* Reflets générés localement : aucune image HDR à télécharger. */}
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" intensity={2.2} color="#fff4e2" position={[6, 8, 6]} scale={[10, 6, 1]} />
            <Lightformer form="rect" intensity={1.2} color="#8fb3e0" position={[-8, 2, -4]} scale={[8, 10, 1]} />
            <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 12, -8]} scale={6} />
          </Environment>
          <Stars radius={140} depth={70} count={LOW_POWER ? 2500 : 5000} factor={4} saturation={0} fade speed={reducedMotion ? 0 : 0.4} />
          <AdaptiveResolution max={MAX_DPR} />
          <CameraRig parallax={reducedMotion ? 0 : 0.4} />
          <Rocket reducedMotion={reducedMotion} />
          <LaunchSite />
        </TimelineDriver>
      </Canvas>
    </div>
  );
}
