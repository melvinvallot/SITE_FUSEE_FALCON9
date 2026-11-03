import { Quaternion, Vector3 } from 'three';
import { EARTH, type Planet } from '../data/planets';
import { BRAKE_START, DEPART_END, FLIP_START, frameAt, totalSeconds, type Frame, type Timing } from './mission';
import { planetAngle, shipState, type Mission } from './orbits';
import { scenePosition } from './scale';

/**
 * Angle (vu de dessus, autour de la planète) de la caméra d'arrivée : du côté
 * éclairé par le Soleil, un peu de biais, avec une lente rotation.
 */
export function arrivalCameraAngle(center: Vector3, since: number): number {
  return Math.atan2(center.z, -center.x) + 0.95 + 0.035 * Math.max(0, since);
}

/** Rayon de l'orbite d'attente autour d'une planète, dans la scène. */
export const parkRadius = (p: Planet) => p.radius * (p.look === 'saturn' ? 2.75 : p.look === 'jupiter' ? 1.9 : 2.3);

/**
 * Durée (s) de la mise en orbite : le vaisseau arrive moteurs en avant (il freine),
 * puis pivote en douceur pour suivre son orbite. Avant, il pivotait d'un coup.
 */
export const SETTLE_SECONDS = 4;

export interface ShipPose {
  pos: Vector3;
  /** Direction du déplacement. */
  dir: Vector3;
  quat: Quaternion;
  /** Poussée des moteurs, de 0 à 1. */
  burn: number;
}

export const newPose = (): ShipPose => ({ pos: new Vector3(), dir: new Vector3(1, 0, 0), quat: new Quaternion(), burn: 0 });

const UP = new Vector3(0, 1, 0);
const SIDE = new Vector3(1, 0, 0);
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

const tmpA: [number, number, number] = [0, 0, 0];
const tmpV = new Vector3();
const tmpW = new Vector3();
const tmpQ = new Quaternion();
const center = new Vector3();
const earthAt = new Vector3();
const endFrame = newPose();
const startOrbit = newPose();
const IDENTITY = new Quaternion();

function shipAt(m: Mission, d: number, out: Vector3) {
  const s = shipState(m, d);
  const [x, y, z] = scenePosition(s.r, s.angle, tmpA);
  return out.set(x, y, z);
}

function planetAt(p: Planet, day: number, out: Vector3) {
  const [x, y, z] = scenePosition(p.a, planetAngle(p, day), tmpA);
  return out.set(x, y, z);
}

/** Pose pendant le trajet (fenêtre de tir, départ, croisière, freinage). */
function flightPose(m: Mission, f: Frame, out: ShipPose) {
  const T = m.transfer.days;
  const d = f.phase === 'window' ? m.launchDay : f.day;
  planetAt(EARTH, f.day, earthAt);
  planetAt(m.target, f.day, center);
  shipAt(m, d, out.pos);
  shipAt(m, Math.min(d + T * 0.002, m.arrivalDay), tmpW);
  if (d + T * 0.002 > m.arrivalDay) {
    shipAt(m, d - T * 0.002, tmpV);
    out.dir.subVectors(out.pos, tmpV).normalize();
  } else {
    out.dir.subVectors(tmpW, out.pos).normalize();
  }
  if (f.phase === 'window') out.pos.copy(earthAt);
  // Le vaisseau ne traverse jamais la Terre ni la planète d'arrivée.
  const push = (c: Vector3, radius: number, fallback: () => Vector3) => {
    tmpV.subVectors(out.pos, c);
    const len = tmpV.length();
    if (len >= radius) return;
    if (len < 1e-3 * radius) tmpV.copy(fallback());
    out.pos.copy(c).addScaledVector(tmpV.normalize(), radius);
  };
  push(earthAt, EARTH.radius * 2.6, () => out.dir);
  // Tout près de l'arrivée, le vaisseau est presque au centre de la planète : on garde
  // le côté d'où il arrive (sinon il sautait de l'autre côté à la dernière image).
  push(center, parkRadius(m.target), () => {
    const a = approachAngle(m);
    return tmpW.set(Math.cos(a), 0, -Math.sin(a));
  });

  // Retournement avant le freinage : les moteurs passent devant.
  const flip = smooth((f.s - FLIP_START) / (BRAKE_START - FLIP_START));
  out.quat.setFromUnitVectors(UP, out.dir);
  tmpQ.setFromAxisAngle(SIDE, Math.PI * flip);
  out.quat.multiply(tmpQ);

  out.burn = 0;
  if (f.phase === 'depart' || (f.phase === 'cruise' && f.s < DEPART_END + 0.03)) {
    out.burn = 1 - smooth((f.s - DEPART_END) / 0.03);
  } else if (f.phase === 'brake') {
    out.burn = smooth((f.s - BRAKE_START) / 0.02) * (1 - smooth((f.s - 0.985) / 0.015));
  }
}

/**
 * Direction (depuis le centre de la planète) d'où arrive le vaisseau, juste avant
 * la mise en orbite : c'est là que commence l'orbite d'attente.
 */
function approachAngle(m: Mission) {
  const d = m.arrivalDay - m.transfer.days * 0.004;
  shipAt(m, d, tmpV);
  planetAt(m.target, d, tmpW);
  return Math.atan2(-(tmpV.z - tmpW.z), tmpV.x - tmpW.x);
}

/** Pose sur l'orbite d'attente, `since` secondes après l'arrivée. */
function orbitPose(m: Mission, since: number, out: ShipPose) {
  const R = parkRadius(m.target);
  const phi0 = approachAngle(m);
  planetAt(m.target, m.arrivalDay, center);
  // Le vaisseau glisse sur son orbite jusqu'au premier plan, côté jour, face à la caméra,
  // puis suit la lente rotation de la caméra. Le sens du glissement est choisi une fois
  // pour toutes (avant, il pouvait s'inverser et le vaisseau se retournait d'un coup).
  const goal = arrivalCameraAngle(center, 0) - 0.2;
  const delta = Math.atan2(Math.sin(goal - phi0), Math.cos(goal - phi0));
  const k = smooth(since / 3.5);
  const phi = phi0 + delta * k + (arrivalCameraAngle(center, since) - arrivalCameraAngle(center, 0));
  out.pos.set(center.x + Math.cos(phi) * R, center.y + R * 0.3 * k, center.z - Math.sin(phi) * R);
  const dirSign = delta >= 0 ? 1 : -1;
  out.dir.set(-Math.sin(phi) * dirSign, 0, -Math.cos(phi) * dirSign);
  out.quat.setFromUnitVectors(UP, out.dir);
  out.burn = 0;
}

/**
 * Position, direction et orientation du vaisseau pour une image donnée.
 * À l'arrivée, on part de la pose de fin de trajet et on rejoint l'orbite
 * d'attente en douceur (position et orientation), sans saut.
 */
export function shipPose(m: Mission, t: Timing, f: Frame, elapsed: number, out: ShipPose): ShipPose {
  if (f.phase !== 'arrived') {
    flightPose(m, f, out);
    return out;
  }
  const since = elapsed - totalSeconds(t);
  orbitPose(m, since, out);
  const w = smooth(since / SETTLE_SECONDS);
  if (w >= 1) return out;

  flightPose(m, frameAt(m, t, totalSeconds(t) - 1e-6), endFrame);
  const R = parkRadius(m.target);
  planetAt(m.target, m.arrivalDay, center);
  // Position : interpolation autour de la planète (angle et hauteur), pour ne pas la traverser.
  tmpV.subVectors(endFrame.pos, center);
  tmpW.subVectors(out.pos, center);
  const a0 = Math.atan2(-tmpV.z, tmpV.x);
  const a1 = Math.atan2(-tmpW.z, tmpW.x);
  const a = a0 + Math.atan2(Math.sin(a1 - a0), Math.cos(a1 - a0)) * w;
  const r0 = Math.hypot(tmpV.x, tmpV.z);
  const r1 = Math.hypot(tmpW.x, tmpW.z);
  const r = Math.max(r0 + (r1 - r0) * w, R * 0.9);
  const y = tmpV.y + (tmpW.y - tmpV.y) * w;
  out.pos.set(center.x + Math.cos(a) * r, center.y + y, center.z - Math.sin(a) * r);
  // Orientation : le vaisseau pivote lentement des moteurs en avant à la tangente de l'orbite.
  // L'écart de départ est mesuré dans le repère de l'orbite puis s'efface : la rotation
  // reste continue même quand l'orbite tourne (un simple slerp vers une cible mobile
  // pouvait basculer d'un coup de l'autre côté).
  orbitPose(m, 0, startOrbit);
  tmpQ.copy(startOrbit.quat).invert().multiply(endFrame.quat);
  tmpQ.slerp(IDENTITY, w);
  out.quat.multiply(tmpQ);
  tmpV.copy(out.dir);
  out.dir.lerpVectors(endFrame.dir, tmpV, w);
  if (out.dir.lengthSq() < 1e-8) out.dir.copy(UP).applyQuaternion(out.quat);
  out.dir.normalize();
  return out;
}
