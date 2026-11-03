import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, Color, SpriteMaterial, type Group, type Sprite } from 'three';
import { KEYFRAMES } from '../../../starship/data/keyframes';
import { TimelineDriver } from '../../../starship/components/three/SceneStateContext';
import { ShipModel } from '../../../starship/components/three/ShipModel';
import { Plume } from '../../../starship/components/three/primitives/Plume';
import { ring } from '../../../starship/components/three/primitives/Raptor';
import { glowTexture } from '../../../starship/components/three/textures';
import { createStore } from '../../../lib/store';
import { useSim } from './sim';

/** Le vaisseau Starship mesure 13 unités dans son modèle : ici environ 0,55 unité. */
export const SHIP_SCALE = 0.042;
const SHIP_HEIGHT = 13;

/** Pose fixe du modèle Starship : volets au repos, soute fermée. */
const STILL = [{ ...KEYFRAMES[0]!, flaps: 0, door: 0, pitch: 0, explode: 0, cutaway: 0, plasma: 0 }];
const STILL_PROGRESS = createStore(0);

const NOZZLES = [...ring(3, 0.32, Math.PI / 2), ...ring(3, 0.74, Math.PI / 2 + Math.PI / 3)];

/** Starship en vol interplanétaire, avec ses moteurs et un repère lumineux visible de loin. */
export function Ship() {
  const sim = useSim();
  const root = useRef<Group>(null);
  const marker = useRef<Sprite>(null);
  const markerMat = useMemo(
    () =>
      new SpriteMaterial({
        map: glowTexture('rgba(255,240,220,1)', 'rgba(255,120,40,0.45)'),
        color: new Color(1.6, 1.1, 0.8),
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: false,
      }),
    [],
  );
  const burn = () => sim.ship.burn;

  useFrame(({ camera, clock }) => {
    const g = root.current;
    if (!g) return;
    g.visible = sim.ship.visible;
    g.position.copy(sim.ship.pos);
    g.quaternion.copy(sim.ship.quat);
    if (marker.current) {
      const d = camera.position.distanceTo(sim.ship.pos);
      // Le repère s'efface quand on est assez près pour voir le vaisseau lui-même.
      const k = Math.min(1, Math.max(0, (d - 6) / 20));
      markerMat.opacity = k * (0.85 + 0.15 * Math.sin(clock.elapsedTime * 4));
      marker.current.scale.setScalar(0.028 + 0.02 * sim.ship.burn);
    }
  });

  return (
    <group ref={root} visible={false}>
      <group scale={SHIP_SCALE}>
        <group position={[0, -SHIP_HEIGHT / 2, 0]}>
          <TimelineDriver keyframes={STILL} progress={STILL_PROGRESS} reducedMotion>
            <ShipModel />
          </TimelineDriver>
          <group position={[0, -0.02, 0]}>
            <Plume nozzles={NOZZLES} nozzleRadius={0.2} radius={1.1} length={9} intensity={burn} spread={() => 1} light={0} />
          </group>
        </group>
      </group>
      <sprite ref={marker} material={markerMat} renderOrder={5} />
    </group>
  );
}
