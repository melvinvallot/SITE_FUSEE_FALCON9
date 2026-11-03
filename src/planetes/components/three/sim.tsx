import { createContext, useContext, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3 } from 'three';
import { EARTH, PLANETS, type Planet, type PlanetId } from '../../data/planets';
import { BRAKE_START, DEPART_END, FLIP_START, frameAt, timing, totalSeconds, type Frame, type Timing } from '../../lib/mission';
import { hudStore } from '../../lib/missionStore';
import { AU_KM, MU_SUN, distanceKm, planetAngle, shipState, type Mission } from '../../lib/orbits';
import { scenePosition } from '../../lib/scale';

/**
 * Angle (vu de dessus, autour de la planète) de la caméra d'arrivée : du côté
 * éclairé par le Soleil, un peu de biais, avec une lente rotation.
 */
export function arrivalCameraAngle(center: Vector3, since: number): number {
  return Math.atan2(center.z, -center.x) + 0.95 + 0.035 * Math.max(0, since);
}

/** Rayon de l'orbite d'attente autour d'une planète, dans la scène. */
export const parkRadius = (p: Planet) => p.radius * (p.look === 'saturn' ? 2.75 : p.look === 'jupiter' ? 1.9 : 2.3);

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

const UP = new Vector3(0, 1, 0);
/** `?t=8` dans l'adresse démarre la première mission à la 8e seconde (captures d'écran). */
let START_AT = typeof window === 'undefined' ? 0 : Number(new URLSearchParams(window.location.search).get('t')) || 0;
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

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
    () => ({ a: [0, 0, 0] as [number, number, number], v: new Vector3(), w: new Vector3(), q: new Quaternion(), flip: new Quaternion(), side: new Vector3() }),
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
      const f = sim.frame;
      const earth = sim.positions.terre;
      const target = sim.positions[m.target.id];
      const T = m.transfer.days;
      const at = (d: number, out: Vector3) => {
        const s = shipState(m, d);
        const [x, y, z] = scenePosition(s.r, s.angle, tmp.a);
        return out.set(x, y, z);
      };

      if (f.phase === 'arrived') {
        // En orbite autour de la planète d'arrivée.
        const R = parkRadius(m.target);
        at(m.arrivalDay - T * 0.004, tmp.v);
        scenePosition(m.target.a, planetAngle(m.target, m.arrivalDay - T * 0.004), tmp.a);
        const phi0 = Math.atan2(-(tmp.v.z - tmp.a[2]), tmp.v.x - tmp.a[0]);
        // Le vaisseau glisse sur son orbite jusqu'au premier plan, côté jour, face à la caméra.
        const since = sim.elapsed - totalSeconds(t);
        const goal = arrivalCameraAngle(target, since) - 0.2;
        const delta = Math.atan2(Math.sin(goal - phi0), Math.cos(goal - phi0));
        const phi = phi0 + delta * smooth(since / 3.5);
        ship.pos.set(target.x + Math.cos(phi) * R, target.y + R * 0.3 * smooth(since / 3.5), target.z - Math.sin(phi) * R);
        const dirSign = delta >= 0 ? 1 : -1;
        ship.dir.set(-Math.sin(phi) * dirSign, 0, -Math.cos(phi) * dirSign);
        ship.quat.setFromUnitVectors(UP, ship.dir);
      } else {
        const d = f.phase === 'window' ? m.launchDay : f.day;
        at(d, ship.pos);
        at(Math.min(d + T * 0.002, m.arrivalDay), tmp.w);
        if (d + T * 0.002 > m.arrivalDay) {
          at(d - T * 0.002, tmp.v);
          ship.dir.subVectors(ship.pos, tmp.v).normalize();
        } else {
          ship.dir.subVectors(tmp.w, ship.pos).normalize();
        }
        if (f.phase === 'window') ship.pos.copy(earth);
        // Le vaisseau ne traverse jamais la Terre ni la planète d'arrivée.
        const push = (center: Vector3, radius: number) => {
          tmp.v.subVectors(ship.pos, center);
          const len = tmp.v.length();
          if (len >= radius) return;
          if (len < 1e-4) tmp.v.copy(ship.dir);
          ship.pos.copy(center).addScaledVector(tmp.v.normalize(), radius);
        };
        push(earth, EARTH.radius * 2.6);
        push(target, parkRadius(m.target));

        // Retournement avant le freinage : les moteurs passent devant.
        const flip = smooth((f.s - FLIP_START) / (BRAKE_START - FLIP_START));
        ship.quat.setFromUnitVectors(UP, ship.dir);
        tmp.side.set(1, 0, 0);
        tmp.flip.setFromAxisAngle(tmp.side, Math.PI * flip);
        ship.quat.multiply(tmp.flip);

        if (f.phase === 'depart' || (f.phase === 'cruise' && f.s < DEPART_END + 0.03)) {
          ship.burn = 1 - smooth((f.s - DEPART_END) / 0.03);
        } else if (f.phase === 'brake') {
          ship.burn = smooth((f.s - BRAKE_START) / 0.02) * (1 - smooth((f.s - 0.985) / 0.015));
        }
      }
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
