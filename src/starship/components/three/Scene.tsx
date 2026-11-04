import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import type { Store } from '../../../lib/store';
import type { Keyframe } from '../../types';
import { CameraRig } from './CameraRig';
import { CutawayDriver, EnvFader } from './Drivers';
import { Lighting } from './Lighting';
import { TimelineDriver } from './SceneStateContext';
import { Starship } from './Starship';
import { LaunchSite } from './site/LaunchSite';
import { DepartureWorld } from './worlds/DepartureWorld';
import { MoonWorld } from './worlds/MoonWorld';
import { OrbitWorld } from './worlds/OrbitWorld';
import { Sky } from './worlds/Sky';
import { SanitizePass } from './SanitizePass';
import { CloudDeck } from './effects/CloudDeck';
import { ExhaustTrail } from './effects/ExhaustTrail';
import { AdaptiveResolution } from '../../../components/three/AdaptiveResolution';
import { isLowPower, maxPixelRatio } from '../../../lib/device';

interface SceneProps {
  keyframes: readonly Keyframe[];
  progress: Store<number>;
  reducedMotion?: boolean;
  /** Appelé une fois la toile créée (fin de l'écran de chargement). */
  onReady?: () => void;
}

/** Effets de post-traitement (halo lumineux, vignettage) : désactivables avec `?fx=0` dans l'adresse. */
const EFFECTS = typeof window === 'undefined' || new URLSearchParams(window.location.search).get('fx') !== '0';

/** Téléphones et tablettes : résolution plafonnée, reflets et étoiles allégés, pas de lissage multiple. */
const LOW_POWER = isLowPower();
const MAX_DPR = maxPixelRatio(1.75, LOW_POWER);

/** Toile 3D fixe en arrière-plan de la page. */
export function Scene({ keyframes, progress, reducedMotion = false, onReady }: SceneProps) {
  return (
    <div className="scene" aria-hidden="true">
      <Canvas
        dpr={[1, MAX_DPR]}
        camera={{ fov: 32, near: 0.5, far: 1600, position: [26, 6, 64] }}
        gl={{ antialias: !EFFECTS, toneMapping: EFFECTS ? NoToneMapping : ACESFilmicToneMapping, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          requestAnimationFrame(() => onReady?.());
        }}
      >
        <TimelineDriver keyframes={keyframes} progress={progress} reducedMotion={reducedMotion}>
          <Sky />
          <Lighting />
          {/* Reflets générés localement : aucune image HDR à télécharger. */}
          <Environment resolution={LOW_POWER ? 128 : 256} frames={1}>
            <Lightformer form="rect" intensity={2.4} color="#fff4e2" position={[8, 10, 8]} scale={[14, 8, 1]} />
            <Lightformer form="rect" intensity={1.3} color="#8fb3e0" position={[-10, 3, -6]} scale={[10, 14, 1]} />
            <Lightformer form="rect" intensity={0.7} color="#ffd2a1" position={[0, -6, 10]} scale={[20, 3, 1]} />
            <Lightformer form="ring" intensity={0.9} color="#ffffff" position={[0, 14, -10]} scale={8} />
          </Environment>
          <Stars radius={260} depth={90} count={LOW_POWER ? 3000 : 6000} factor={5} saturation={0} fade speed={reducedMotion ? 0 : 0.3} />
          <AdaptiveResolution max={MAX_DPR} />
          <CameraRig parallax={reducedMotion ? 0 : 0.5} reducedMotion={reducedMotion} />
          <CutawayDriver />
          <EnvFader />
          <Starship reducedMotion={reducedMotion} />
          <LaunchSite />
          <ExhaustTrail />
          <CloudDeck />
          <OrbitWorld />
          <DepartureWorld reducedMotion={reducedMotion} />
          <MoonWorld reducedMotion={reducedMotion} />
        </TimelineDriver>
        {EFFECTS && (
          <EffectComposer multisampling={LOW_POWER ? 0 : 4}>
            <SanitizePass />
            <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1} luminanceSmoothing={0.2} radius={0.75} />
            <Vignette offset={0.28} darkness={0.55} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
