import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3, type Group, type Mesh } from 'three';
import { DEPLOYMENTS } from '../../../data/deployments';
import { LAYOUT, RADIUS } from '../../../data/layout';
import { deployStore, doorOpening, satellitePose, settledTime } from '../../../lib/deploy';
import { departure } from '../../../lib/moon';
import { smoothstep } from '../../../../lib/math';
import { useMaterials } from '../materials';
import { PAYLOAD_DOOR_Y } from '../parts/ShipBody';
import { ShipModel } from '../ShipModel';
import { useSceneState } from '../SceneStateContext';
import { Earth } from './Earth';
import { createMoonMaterial } from './moonMaterial';
import { SUN_DIRECTION } from './OrbitWorld';

const EARTH_RADIUS = 600;
const EARTH_CENTER = new Vector3(0, -640, -120);
const ORBIT_Y = 14;
/** Point survolé pendant les largages : l'océan Indien, où retombent les vaisseaux d'essai. */
const OVERFLIGHT = { latitude: -18, longitude: 72 };
const UNDER_SHIP = new Vector3(0, ORBIT_Y, 0).sub(EARTH_CENTER).normalize();
const MOON_POSITION: [number, number, number] = [-860, 150, -420];
const MAX_SATELLITES = Math.max(...DEPLOYMENTS.map((d) => d.satellites.length));
/** Trappe dans le repère du vaisseau de décor (base à l'origine). */
const DOOR_LOCAL = PAYLOAD_DOOR_Y - LAYOUT.ship.base;
/**
 * Roulis du vaisseau autour de son axe : la trappe regarde vers la Terre, les
 * satellites descendent en chapelet entre le vaisseau et l'horizon.
 */
const ROLL = -Math.PI / 2;

/**
 * Orbite basse, deuxième décor : le vaisseau largue les satellites du vol choisi
 * (animation minutée), puis, au défilement, rallume ses moteurs et quitte
 * l'orbite terrestre vers la Lune.
 */
export function DepartureWorld({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const state = useSceneState();
  const m = useMaterials();
  const root = useRef<Group>(null);
  const ship = useRef<Group>(null);
  const earth = useRef<Group>(null);
  const moonMesh = useRef<Mesh>(null);
  const sats = useRef<(Group | null)[]>([]);
  const bodies = useRef<{ sim: Mesh | null; v3: Group | null; wings: (Mesh | null)[] }[]>(
    Array.from({ length: MAX_SATELLITES }, () => ({ sim: null, v3: null, wings: [null, null] })),
  );
  const clock = useRef({ run: -1, start: 0, now: 0 });
  const moon = useMemo(() => createMoonMaterial(SUN_DIRECTION), []);
  useEffect(() => () => moon.dispose(), [moon]);

  // Valeurs lues à chaque image par le vaisseau (trappe, poussée).
  const live = useRef({ door: 0, thrust: 0 });
  const door = useMemo(() => () => live.current.door, []);
  const thrust = useMemo(() => () => live.current.thrust, []);

  useFrame(({ clock: c }) => {
    const s = state.current;
    const visible = s.env >= 1.5 && s.env < 2.5;
    if (root.current) root.current.visible = visible;
    if (!visible) return;

    const { index, run } = deployStore.get();
    const mission = DEPLOYMENTS[index]!;
    const count = mission.satellites.length;
    if (run !== clock.current.run) clock.current = { run, start: c.elapsedTime, now: 0 };
    // Sans animation : la pile est déjà larguée.
    const t = reducedMotion ? settledTime(count) : c.elapsedTime - clock.current.start;

    const pose = departure(s.tli);
    live.current.door = doorOpening(t, count) * (1 - smoothstep(s.tli * 6));
    live.current.thrust = pose.thrust;

    ship.current?.position.set(-pose.advance, ORBIT_Y, 0);

    // La Terre s'éloigne et rapetisse ; la Lune grossit droit devant.
    const g = earth.current;
    if (g) {
      // Vue vers l'arrière : la Terre devient un globe entier qui s'éloigne derrière le vaisseau.
      g.position.set(EARTH_CENTER.x + 1000 * pose.recede, EARTH_CENTER.y + 300 * pose.recede, EARTH_CENTER.z - 260 * pose.recede);
      g.scale.setScalar(1 - 0.72 * pose.recede);
    }
    moonMesh.current?.scale.setScalar(1 + 1.6 * pose.approach);

    for (let i = 0; i < MAX_SATELLITES; i++) {
      const group = sats.current[i];
      if (!group) continue;
      const kind = mission.satellites[i];
      const p = kind ? satellitePose(i, count, t, RADIUS, DOOR_LOCAL) : null;
      group.visible = !!p && t > 0.2 && !p.gone;
      if (!p) continue;
      group.position.set(p.x, p.y, p.z);
      group.rotation.set(p.spin * 0.6, p.spin, p.spin * 0.3);
      const b = bodies.current[i]!;
      if (b.sim) b.sim.visible = kind === 'simulator';
      if (b.v3) b.v3.visible = kind === 'v3';
      b.wings.forEach((w, side) => {
        if (!w) return;
        const k = Math.max(0.04, p.unfold);
        w.scale.set(k, 1, 1);
        w.position.set((side ? -1 : 1) * (0.5 + 0.75 * k), 0.03, 0);
      });
    }
  });

  return (
    <group ref={root} visible={false}>
      <group ref={earth} position={EARTH_CENTER}>
        <Earth radius={EARTH_RADIUS} sun={SUN_DIRECTION} latitude={OVERFLIGHT.latitude} longitude={OVERFLIGHT.longitude} up={UNDER_SHIP} />
      </group>
      <mesh ref={moonMesh} material={moon} position={MOON_POSITION}>
        <sphereGeometry args={[22, 48, 24]} />
      </mesh>
      {/* Vaisseau couché, nez vers -x (vers la Lune), trappe tournée vers la Terre. */}
      <group ref={ship}>
        <group rotation={[ROLL, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <ShipModel door={door} thrust={thrust} />
          </group>
        </group>
      </group>
      {/* Satellites, dans le repère du vaisseau au moment du largage : ils restent en orbite quand il s'en va. */}
      <group position={[0, ORBIT_Y, 0]}>
        <group rotation={[ROLL, 0, 0]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            {Array.from({ length: MAX_SATELLITES }, (_, i) => (
              <group key={i} ref={(g) => (sats.current[i] = g)} visible={false}>
                {/* Simulateur de masse : un bloc d'acier, sans panneaux. */}
                <mesh ref={(x) => (bodies.current[i]!.sim = x)} material={m.sooty}>
                  <boxGeometry args={[0.98, 0.06, 0.6]} />
                </mesh>
                {/* Starlink V3 : châssis plat et deux grands panneaux solaires qui se déplient. */}
                <group ref={(x) => (bodies.current[i]!.v3 = x)}>
                  <mesh material={m.fitting}>
                    <boxGeometry args={[1.0, 0.07, 0.62]} />
                  </mesh>
                  <mesh material={m.foil} position={[0, 0.045, 0]}>
                    <boxGeometry args={[0.7, 0.02, 0.42]} />
                  </mesh>
                  {[0, 1].map((side) => (
                    <mesh key={side} ref={(x) => (bodies.current[i]!.wings[side] = x)} material={m.panel}>
                      <boxGeometry args={[1.5, 0.012, 0.5]} />
                    </mesh>
                  ))}
                </group>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}
