import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import { EARTH } from '../../data/planets';
import { planetAngle } from '../../lib/orbits';
import { scenePosition } from '../../lib/scale';
import { arrivalCameraAngle, parkRadius, useSim } from './sim';

const Y = new Vector3(0, 1, 0);
const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};
const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/**
 * Caméra « réalisateur » : vue d'ensemble au repos, puis caméra de poursuite au
 * départ, plan large pendant la croisière et approche de la planète à l'arrivée.
 * On peut tourner autour (glisser) et zoomer (molette) à tout moment.
 */
export function CameraDirector({ reducedMotion }: { reducedMotion: boolean }) {
  const sim = useSim();
  const camera = useThree((s) => s.camera);
  const dom = useThree((s) => s.gl.domElement);
  const size = useThree((s) => s.size);
  const shift = useRef(0);
  const user = useRef({ yaw: 0, pitch: 0, zoom: 1, tYaw: 0, tPitch: 0, tZoom: 1, drag: false, x: 0, y: 0 });
  const v = useMemo(
    () => ({
      pos: new Vector3(),
      look: new Vector3(),
      p: new Vector3(),
      l: new Vector3(),
      a: new Vector3(),
      b: new Vector3(),
      side: new Vector3(),
      off: new Vector3(),
      axis: new Vector3(),
      snapPos: new Vector3(),
      snapLook: new Vector3(),
      lastLook: new Vector3(),
      tmp: [0, 0, 0] as [number, number, number],
    }),
    [],
  );
  const idle = useRef(0);
  const lastChange = useRef(-1);

  // Glisser pour tourner, molette pour zoomer.
  useEffect(() => {
    const u = user.current;
    const down = (e: PointerEvent) => {
      u.drag = true;
      u.x = e.clientX;
      u.y = e.clientY;
    };
    const move = (e: PointerEvent) => {
      if (!u.drag) return;
      u.tYaw -= (e.clientX - u.x) * 0.005;
      u.tPitch = Math.min(1.1, Math.max(-0.9, u.tPitch + (e.clientY - u.y) * 0.004));
      u.x = e.clientX;
      u.y = e.clientY;
    };
    const up = () => {
      u.drag = false;
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      u.tZoom = Math.min(2.4, Math.max(0.3, u.tZoom * Math.exp(e.deltaY * 0.001)));
    };
    dom.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    dom.addEventListener('wheel', wheel, { passive: false });
    return () => {
      dom.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      dom.removeEventListener('wheel', wheel);
    };
  }, [dom]);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.1);
    const u = user.current;
    const m = sim.mission;
    const f = sim.frame;
    const ship = sim.ship;
    idle.current += reducedMotion ? 0 : dt;

    // Nouvelle mission : on repart de la vue actuelle et on remet le regard droit.
    if (sim.sinceChange === 0 && lastChange.current !== 0) {
      v.snapPos.copy(camera.position);
      v.snapLook.copy(v.lastLook);
      u.tYaw = 0;
      u.tPitch = 0;
      u.tZoom = 1;
    }
    lastChange.current = sim.sinceChange;

    // Mélange des plans : le point visé se mélange directement, la distance en échelle
    // logarithmique (on s'éloigne du vaisseau progressivement, sans à-coup).
    v.look.set(0, 0, 0);
    v.axis.set(0, 0, 0);
    let logDist = 0;
    const add = (w: number, p: Vector3, l: Vector3) => {
      if (w <= 0) return;
      v.off.subVectors(p, l);
      const d = Math.max(v.off.length(), 1e-3);
      v.axis.addScaledVector(v.off, w / d);
      logDist += w * Math.log(d);
      v.look.addScaledVector(l, w);
    };

    if (!m || !f) {
      sim.wide = 1;
      // Vue d'ensemble qui tourne lentement.
      const yaw = 0.6 + idle.current * 0.018;
      v.p.set(Math.cos(yaw) * Math.cos(0.6), Math.sin(0.6), -Math.sin(yaw) * Math.cos(0.6)).multiplyScalar(230);
      add(1, v.p, v.l.set(0, -6, 0));
    } else {
      const s = f.phase === 'window' ? 0 : f.s;
      const arriving = f.phase === 'arrived' ? 1 : smooth((s - 0.72) / 0.16);
      const chase = f.phase === 'window' || f.phase === 'arrived' ? 0 : 1 - smooth((s - 0.06) / 0.14);
      const wide = Math.max(0, 1 - chase - arriving);
      sim.wide = f.phase === 'window' ? 1 : wide;

      // Plan large : tout le trajet, de la Terre au départ à la planète à l'arrivée.
      if (wide > 0) {
        const [ax, , az] = scenePosition(EARTH.a, m.launchAngle, v.tmp);
        v.a.set(ax, 0, az);
        const [bx, , bz] = scenePosition(m.target.a, planetAngle(m.target, m.arrivalDay), v.tmp);
        v.b.set(bx, 0, bz);
        const span = v.a.distanceTo(v.b);
        v.l.addVectors(v.a, v.b).multiplyScalar(0.5);
        v.side.subVectors(v.b, v.a).cross(Y).normalize();
        // Le trajet doit tenir entre le panneau de gauche et la fiche de droite.
        const dist = span * 1.85 + 24;
        v.p.copy(v.l).addScaledVector(v.side, Math.cos(0.95) * dist).addScaledVector(Y, Math.sin(0.95) * dist);
        if (ship.visible && f.phase !== 'window') v.l.lerp(ship.pos, 0.2);
        add(wide, v.p, v.l);
      }

      // Poursuite : la caméra devance le vaisseau et le regarde, la Terre en arrière-plan.
      if (chase > 0) {
        v.side.crossVectors(ship.dir, Y).normalize();
        v.a.subVectors(ship.pos, sim.positions.terre).normalize();
        v.p.copy(ship.pos).addScaledVector(v.a, 2.3).addScaledVector(ship.dir, -0.4).addScaledVector(v.side, 1.1).addScaledVector(Y, 0.75);
        v.l.copy(ship.pos).lerp(sim.positions.terre, 0.1);
        add(chase, v.p, v.l);
      }

      // Arrivée : la planète en grand, le vaisseau au premier plan.
      if (arriving > 0) {
        const c = sim.positions[m.target.id];
        const R = m.target.radius;
        const since = f.phase === 'arrived' && sim.timing ? sim.elapsed - sim.timing.window - sim.timing.cruise : 0;
        const phi = arrivalCameraAngle(c, since);
        const dist = Math.max(R * 4.6, parkRadius(m.target) * 2.1);
        v.p.set(Math.cos(phi), 0.32, -Math.sin(phi)).normalize().multiplyScalar(dist).add(c);
        v.l.copy(c).lerp(ship.pos, 0.22);
        add(arriving, v.p, v.l);
      }
    }

    v.pos.copy(v.look).addScaledVector(v.axis.normalize(), Math.exp(logDist));

    // Transition douce depuis l'ancienne vue.
    const k = smooth(sim.sinceChange / 2.2);
    if (k < 1 && !reducedMotion) {
      v.pos.lerpVectors(v.snapPos, v.pos, k);
      v.look.lerpVectors(v.snapLook, v.look, k);
    }

    // Réglages de l'utilisateur : rotation autour du point visé et zoom.
    u.yaw = damp(u.yaw, u.tYaw, 6, dt);
    u.pitch = damp(u.pitch, u.tPitch, 6, dt);
    u.zoom = damp(u.zoom, u.tZoom, 6, dt);
    v.off.subVectors(v.pos, v.look).applyAxisAngle(Y, u.yaw);
    v.axis.crossVectors(v.off, Y);
    if (v.axis.lengthSq() > 1e-8) {
      const elev = Math.asin(Math.min(1, Math.max(-1, v.off.y / v.off.length())));
      const pitch = Math.min(1.45 - elev, Math.max(-1.45 - elev, u.pitch));
      v.off.applyAxisAngle(v.axis.normalize(), -pitch);
    }
    v.off.multiplyScalar(u.zoom);
    camera.position.copy(v.look).add(v.off);
    camera.lookAt(v.look);
    v.lastLook.copy(v.look);

    // Sur grand écran, le centre de la vue se décale à droite du panneau des destinations.
    const want = size.width > 900 && !m ? Math.min(200, size.width * 0.13) : 0;
    const next = damp(shift.current, want, 3, dt);
    if (camera instanceof PerspectiveCamera && (Math.abs(next - shift.current) > 0.2 || camera.view?.fullWidth !== size.width || camera.view?.fullHeight !== size.height)) {
      shift.current = next;
      camera.setViewOffset(size.width, size.height, -next, 0, size.width, size.height);
    }
  }, -1);

  return null;
}
