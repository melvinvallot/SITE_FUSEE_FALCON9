import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3 } from 'three';
import { EARTH, PLANETS, type PlanetId } from '../../data/planets';
import { frameAt, timing, totalSeconds, type Frame, type Timing } from '../../lib/mission';
import { hudStore } from '../../lib/missionStore';
import { AU_KM, MU_SUN, distanceKm, planetAngle, shipState, type Mission } from '../../lib/orbits';
import { scenePosition } from '../../lib/scale';
import { shipPose } from '../../lib/shipPose';

export { arrivalCameraAngle, parkRadius } from '../../lib/shipPose';

export interface Sim {
  mission: Mission | null;
  timing: Timing | null;
  frame: Frame | null;
  /** Secondes d'animation depuis le début de la mission. */
  elapsed: number;
  /** Secondes écoulées depuis le dernier changement de mission (transition de caméra). */
  sinceChange: number;
  day: number;
  /** 1 en plan large, 0 en gros plan (les traits d'orbite s'effacent de près). */
  wide: number;
  positions: Record<PlanetId, Vector3>;
  ship: {
    visible: boolean;
    pos: Vector3;
    /** Direction du déplacement. */
    dir: Vector3;
    quat: Quaternion;
    /** Poussée des moteurs, de 0 à 1. */
    burn: number;
  };
}

const SimContext = createContext<Sim | null>(null);

export function useSim(): Sim {
  const sim = useContext(SimContext);
  if (!sim) throw new Error('useSim doit être utilisé dans <SimDriver>.');
  return sim;
}

/** `?t=8` dans l'adresse démarre la première mission à la 8e seconde (captures d'écran). */
let START_AT = typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('t')) || 0;

interface SimDriverProps {
  mission: Mission | null;
  /** Change à chaque « Rejouer ». */
  runId: number;
  /** Change à chaque « Passer à l'arrivée ». */
  skipId: number;
  nowDay: number;
  reducedMotion: boolean;
  children: ReactNode;
}

/**
 * Horloge de la simulation : calcule à chaque image la date simulée, la position
 * des planètes et celle du vaisseau, et les partage avec le reste de la scène.
 */
export function SimDriver({ mission, runId, skipId, nowDay, reducedMotion, children }: SimDriverProps) {
  const sim = useMemo<Sim>(
    () => ({
      mission: null,
      timing: null,
      frame: null,
      elapsed: 0,
      sinceChange: 99,
      day: nowDay,
      wide: 1,
      positions: Object.fromEntries(PLANETS.map((p) => [p.id, new Vector3()])) as Record<PlanetId, Vector3>,
      ship: { visible: false, pos: new Vector3(), dir: new Vector3(1, 0, 0), quat: new Quaternion(), burn: 0 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const keys = useRef({ mission: null as Mission | null, runId: -1, skipId: skipId });
  const tmp = useMemo(
    () => ({ a: [0, 0, 0] as [number, number, number] }),
    [],
  );
  const hudClock = useRef(0);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1);
    const k = keys.current;
    if (k.mission !== mission || k.runId !== runId) {
      k.mission = mission;
      k.runId = runId;
      sim.mission = mission;
      sim.timing = mission ? timing(mission) : null;
      // Sans animation (réglage « réduire les animations »), on arrive directement.
      sim.elapsed = reducedMotion && sim.timing ? totalSeconds(sim.timing) + 4 : START_AT;
      sim.sinceChange = START_AT > 0 ? 99 : 0;
      START_AT = 0;
    } else {
      sim.elapsed += delta;
      sim.sinceChange += delta;
    }
    if (k.skipId !== skipId) {
      k.skipId = skipId;
      if (sim.timing) sim.elapsed = Math.max(sim.elapsed, totalSeconds(sim.timing));
    }

    const m = sim.mission;
    const t = sim.timing;
    sim.frame = m && t ? frameAt(m, t, sim.elapsed) : null;
    const day = sim.frame?.day ?? nowDay;
    sim.day = day;
    for (const p of PLANETS) {
      const [x, y, z] = scenePosition(p.a, planetAngle(p, day), tmp.a);
      sim.positions[p.id].set(x, y, z);
    }

    // ---------- Vaisseau ----------
    const ship = sim.ship;
    ship.burn = 0;
    if (!m || !t || !sim.frame) {
      ship.visible = false;
    } else {
      ship.visible = true;
      shipPose(m, t, sim.frame, sim.elapsed, ship);
    }

    // ---------- Tableau de bord ----------
    hudClock.current -= delta;
    if (hudClock.current <= 0) {
      hudClock.current = 0.1;
      const f = sim.frame;
      if (!m || !f) {
        if (hudStore.get().phase !== 'idle') hudStore.set({ phase: 'idle', day: nowDay, progress: 0, speed: 0, fromEarth: 0 });
      } else {
        const inFlight = f.phase !== 'window';
        const s = shipState(m, inFlight ? f.day : m.launchDay);
        const ea = planetAngle(EARTH, f.day);
        const ex = EARTH.a * Math.cos(ea);
        const ey = EARTH.a * Math.sin(ea);
        const fromEarth = inFlight ? Math.hypot(s.r * Math.cos(s.angle) - ex, s.r * Math.sin(s.angle) - ey) * AU_KM : 0;
        hudStore.set({
          phase: f.phase,
          day: f.day,
          progress: f.phase === 'window' ? 0 : f.u,
          speed: f.phase === 'window' ? 29.8 : f.phase === 'arrived' ? Math.sqrt(MU_SUN / (m.target.a * AU_KM)) : s.speed,
          fromEarth: f.phase === 'arrived' ? distanceKm(EARTH, m.target, f.day) : fromEarth,
        });
      }
    }
  }, -2);

  return <SimContext.Provider value={sim}>{children}</SimContext.Provider>;
}
