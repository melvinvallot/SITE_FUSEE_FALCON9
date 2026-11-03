import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { BOOSTER_PIVOT, EXPLODE_OFFSETS, RADIUS, SHIP_PIVOT, STACK_YAW } from '../../data/layout';
import { boosterPose, shipLift } from '../../lib/flight';
import { PartGroup } from './PartGroup';
import { Booster } from './parts/Booster';
import { BoosterEngines } from './parts/BoosterEngines';
import { GridFins } from './parts/GridFins';
import { HotStageRing } from './parts/HotStageRing';
import { ShipBody } from './parts/ShipBody';
import { ShipEngines } from './parts/ShipEngines';
import { ShipNose } from './parts/ShipNose';
import { Plasma } from './primitives/Plasma';
import { useSceneState } from './SceneStateContext';

/**
 * Système complet : le propulseur et le vaisseau ont chacun leur pivot,
 * pour la séparation, la bascule du propulseur et la rentrée du vaisseau.
 */
export function Starship({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const state = useSceneState();
  const root = useRef<Group>(null);
  const booster = useRef<Group>(null);
  const ship = useRef<Group>(null);
  const shipInner = useRef<Group>(null);

  useFrame(() => {
    const s = state.current;
    if (root.current) root.current.visible = s.env < 0.5;
    const b = booster.current;
    if (b) {
      const pose = boosterPose(s.launch, s.sep, s.capture);
      // Repère local tourné de STACK_YAW : z local = x écran, la bascule se fait dans le plan de l'écran.
      b.position.set(0, pose.y, pose.x);
      b.rotation.set(pose.angle, 0, 0);
    }
    const sh = ship.current;
    if (sh && shipInner.current) {
      // Le pivot suit le fût du vaisseau quand il est écarté en vue éclatée.
      const pivot = SHIP_PIVOT + EXPLODE_OFFSETS.shipBody[1] * s.explode;
      sh.visible = s.capture < 0.45;
      sh.position.set(0, shipLift(s.launch, s.sep, s.capture) + pivot, 0);
      sh.rotation.set((s.pitch * Math.PI) / 2, 0, 0);
      shipInner.current.position.set(0, -pivot, 0);
    }
  });

  return (
    <group ref={root} rotation={[0, STACK_YAW, 0]}>
      <group ref={booster}>
        <group position={[0, -BOOSTER_PIVOT, 0]}>
          <PartGroup id="booster">
            <Booster />
          </PartGroup>
          <PartGroup id="gridFins">
            <GridFins />
          </PartGroup>
          <PartGroup id="hotStage">
            <HotStageRing />
          </PartGroup>
          <PartGroup id="boosterEngines">
            <BoosterEngines reducedMotion={reducedMotion} />
          </PartGroup>
        </group>
      </group>
      <group ref={ship}>
        <group ref={shipInner}>
          <PartGroup id="nose">
            <ShipNose />
          </PartGroup>
          <PartGroup id="shipBody">
            <ShipBody />
            <group position={[0, 18, 0]}>
              <Plasma radius={RADIUS} length={13} intensity={() => state.current.plasma} />
            </group>
          </PartGroup>
          <PartGroup id="shipEngines">
            <ShipEngines />
          </PartGroup>
        </group>
      </group>
    </group>
  );
}
