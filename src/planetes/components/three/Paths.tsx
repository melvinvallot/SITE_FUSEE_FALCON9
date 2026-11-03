import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import type { Line2, LineSegments2 } from 'three-stdlib';

type AnyLine = Line2 | LineSegments2;
import { PLANETS, type PlanetId } from '../../data/planets';
import { shipState, type Mission } from '../../lib/orbits';
import { sceneRadius, scenePosition } from '../../lib/scale';
import { useSim, type Sim } from './sim';

const circle = (r: number, n = 256) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, 0, -Math.sin(a) * r] as [number, number, number];
  });

/** Orbites des planètes ; celle de la destination est mise en valeur. */
export function Orbits({ target }: { target: PlanetId | null }) {
  const sim = useSim();
  const rings = useMemo(() => PLANETS.map((p) => ({ p, points: circle(sceneRadius(p.a)) })), []);
  const lines = useRef<(AnyLine | null)[]>([]);
  useFadeLines(lines, sim);
  return (
    <group>
      {rings.map(({ p, points }, i) => {
        const on = p.id === target || p.id === 'terre';
        return (
          <Line
            ref={(l) => (lines.current[i] = l)}
            key={p.id}
            points={points}
            color={on ? p.color : '#9fb3c8'}
            lineWidth={on ? 1.6 : 1}
            transparent
            opacity={on ? 0.55 : 0.16}
            depthWrite={false}
          />
        );
      })}
    </group>
  );
}

/** Les traits s'effacent en gros plan, pour ne pas barrer l'image. */
function useFadeLines(lines: { current: (AnyLine | null)[] }, sim: Sim) {
  const base = useRef<number[]>([]);
  useFrame(() => {
    lines.current.forEach((l, i) => {
      if (!l) return;
      const m = l.material as { opacity: number };
      if (base.current[i] === undefined) base.current[i] = m.opacity;
      m.opacity = base.current[i]! * (0.12 + 0.88 * sim.wide);
    });
  });
}

const SEGMENTS = 360;

/** Trajectoire de transfert : en pointillés devant le vaisseau, en trait plein derrière lui. */
export function TransferPath({ mission }: { mission: Mission }) {
  const sim = useSim();
  const done = useRef<AnyLine | null>(null);
  const lines = useRef<(AnyLine | null)[]>([]);
  useFadeLines(lines, sim);
  const points = useMemo(
    () =>
      Array.from({ length: SEGMENTS + 1 }, (_, i) => {
        const s = shipState(mission, mission.launchDay + (mission.transfer.days * i) / SEGMENTS);
        return scenePosition(s.r, s.angle, [0, 0, 0]);
      }),
    [mission],
  );

  useFrame(() => {
    const f = sim.frame;
    const u = !f || f.phase === 'window' ? 0 : f.u;
    const g = done.current?.geometry as { instanceCount?: number } | undefined;
    if (g) g.instanceCount = Math.max(0, Math.floor(u * SEGMENTS));
  });

  return (
    <group>
      <Line ref={(l) => {
          lines.current[0] = l;
        }}
        points={points} color="#dbe6f2" lineWidth={1.2} dashed dashSize={1.2} gapSize={1} transparent opacity={0.5} depthWrite={false} />
      <Line ref={(l) => {
          done.current = l;
          lines.current[1] = l;
        }}
        points={points} color="#ff8a3d" lineWidth={2.6} transparent opacity={0.95} depthWrite={false} />
    </group>
  );
}
