import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, Stars } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { ACESFilmicToneMapping, NoToneMapping } from 'three';
import { SanitizePass } from '../../../starship/components/three/SanitizePass';
import { PLANETS, type PlanetId } from '../../data/planets';
import type { Mission } from '../../lib/orbits';
import { AsteroidBelt, MilkyWay, PlanetBody, Sun } from './Bodies';
import { CameraDirector } from './CameraDirector';
import { Orbits, TransferPath } from './Paths';
import { Ship } from './Ship';
import { SimDriver } from './sim';

interface SceneProps {
  mission: Mission | null;
  runId: number;
  skipId: number;
  nowDay: number;
  reducedMotion: boolean;
  onSelect: (id: PlanetId) => void;
  onReady?: () => void;
}

/** Effets lumineux (halo, vignettage) : désactivables avec `?fx=0` dans l'adresse. */
const EFFECTS = typeof window === 'undefined' || new URLSearchParams(window.location.search).get('fx') !== '0';

/** Système solaire en 3D, en plein écran derrière l'interface. */
export function Scene({ mission, runId, skipId, nowDay, reducedMotion, onSelect, onReady }: SceneProps) {
  return (
    <div className="scene">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ fov: 40, near: 0.05, far: 8000, position: [0, 900, 1500] }}
        gl={{ antialias: !EFFECTS, toneMapping: EFFECTS ? NoToneMapping : ACESFilmicToneMapping, powerPreference: 'high-performance' }}
        onCreated={() => requestAnimationFrame(() => onReady?.())}
      >
        <color attach="background" args={['#020306']} />
        <SimDriver mission={mission} runId={runId} skipId={skipId} nowDay={nowDay} reducedMotion={reducedMotion}>
          <MilkyWay />
          <Stars radius={900} depth={600} count={9000} factor={7} saturation={0.15} fade speed={reducedMotion ? 0 : 0.4} />
          <ambientLight intensity={0.22} />
          {/* Reflets de l'acier du vaisseau, générés localement. */}
          <Environment resolution={128} frames={1}>
            <Lightformer form="rect" intensity={4} color="#fff1dc" position={[10, 6, 8]} scale={[12, 8, 1]} />
            <Lightformer form="ring" intensity={2} color="#ffffff" position={[0, 10, -6]} scale={6} />
            <Lightformer form="rect" intensity={0.5} color="#7f9fd0" position={[-10, -2, -6]} scale={[10, 10, 1]} />
          </Environment>
          <Sun />
          {PLANETS.map((p) => (
            <PlanetBody key={p.id} planet={p} selected={mission?.target.id === p.id} onSelect={p.id === 'terre' ? undefined : onSelect} />
          ))}
          <AsteroidBelt />
          <Orbits target={mission?.target.id ?? null} />
          {mission && <TransferPath key={`${mission.target.id}-${runId}`} mission={mission} />}
          <Ship />
          <CameraDirector reducedMotion={reducedMotion} />
        </SimDriver>
        {EFFECTS && (
          <EffectComposer multisampling={4}>
            <SanitizePass />
            <Bloom mipmapBlur intensity={1.1} luminanceThreshold={1} luminanceSmoothing={0.25} radius={0.8} />
            <Vignette offset={0.3} darkness={0.6} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
