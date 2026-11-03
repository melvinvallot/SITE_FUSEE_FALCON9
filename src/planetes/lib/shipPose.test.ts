import { DESTINATIONS } from '../data/planets';
import { frameAt, timing, totalSeconds } from './mission';
import { dayFromDate, planMission } from './orbits';
import { SETTLE_SECONDS, newPose, parkRadius, shipPose } from './shipPose';

const NOW = dayFromDate(new Date(Date.UTC(2026, 10, 3)));
const STEP = 1 / 60;

describe('arrivée du vaisseau', () => {
  it.each(DESTINATIONS.map((p) => [p.name, p] as const))('%s : ni saut ni pivot brusque à la mise en orbite', (_, planet) => {
    const m = planMission(planet, NOW);
    const t = timing(m);
    const end = totalSeconds(t);
    const R = parkRadius(planet);
    const prev = shipPose(m, t, frameAt(m, t, end - 0.5), end - 0.5, newPose());
    const cur = newPose();
    let maxTurn = 0;
    let maxMove = 0;
    // Image par image (60 par seconde), de la fin du freinage à la fin de la mise en orbite.
    for (let i = 1; i < (SETTLE_SECONDS + 1.5) * 60; i++) {
      const e = end - 0.5 + i * STEP;
      shipPose(m, t, frameAt(m, t, e), e, cur);
      maxTurn = Math.max(maxTurn, prev.quat.angleTo(cur.quat));
      maxMove = Math.max(maxMove, prev.pos.distanceTo(cur.pos));
      prev.pos.copy(cur.pos);
      prev.quat.copy(cur.quat);
    }
    // Avant : demi-tour instantané (≈ 180° en une image) et saut de l'autre côté de la planète.
    // Maintenant : au plus 2,5° par image et un petit pas sur l'orbite d'attente.
    expect(maxTurn).toBeLessThan(0.045);
    expect(maxMove).toBeLessThan(R * 0.08);
  });
});
