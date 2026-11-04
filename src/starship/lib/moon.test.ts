import { DEPLOYMENTS } from '../data/deployments';
import { deployDuration, deployStore, doorOpening, releaseInterval, satellitePose, selectDeployment, settledTime, DOOR_SECONDS } from './deploy';
import { departure, IGNITION_AT, landing, LANDING_START_Y, shipFollow } from './moon';

describe('largages', () => {
  it('liste des vols réels, chacun avec ses satellites', () => {
    expect(DEPLOYMENTS.map((d) => d.flight)).toEqual(['Vol 10', 'Vol 11', 'Vol 12', 'Vol 13', 'Vol 14']);
    for (const d of DEPLOYMENTS) {
      expect(d.satellites.length).toBeGreaterThan(0);
      expect(d.payload.length).toBeGreaterThan(10);
    }
    expect(DEPLOYMENTS.find((d) => d.id === 'vol-12')!.satellites.filter((k) => k === 'v3')).toHaveLength(2);
  });

  it('choisir un vol relance le largage, même s’il est déjà choisi', () => {
    const before = deployStore.get().run;
    selectDeployment(1);
    selectDeployment(1);
    expect(deployStore.get()).toEqual({ index: 1, run: before + 2 });
    selectDeployment(99);
    expect(deployStore.get().index).toBe(DEPLOYMENTS.length - 1);
  });

  it('ouvre la trappe avant la sortie du premier satellite, puis la referme', () => {
    expect(doorOpening(0, 8)).toBe(0);
    expect(doorOpening(DOOR_SECONDS, 8)).toBeCloseTo(1);
    expect(doorOpening(deployDuration(8) + 1, 8)).toBeCloseTo(0);
    expect(satellitePose(0, 8, DOOR_SECONDS, 1.125, 8).out).toBe(0);
  });

  it('fait sortir les satellites un à un, dans l’ordre, sans dépasser une dizaine de secondes', () => {
    for (const n of [8, 22, 26]) {
      expect(deployDuration(n)).toBeLessThan(15);
      const t = DOOR_SECONDS + releaseInterval(n) * (n / 2);
      const outs = Array.from({ length: n }, (_, i) => satellitePose(i, n, t, 1.125, 8).out);
      for (let i = 1; i < n; i++) expect(outs[i]!).toBeLessThanOrEqual(outs[i - 1]!);
      // À la fin, toute la pile est dehors, en chapelet : chaque satellite plus loin que le suivant.
      const end = Array.from({ length: n }, (_, i) => satellitePose(i, n, settledTime(n), 1.125, 8));
      for (const p of end) expect(p.out).toBeCloseTo(1);
      for (let i = 1; i < n; i++) expect(end[i]!.z - end[i - 1]!.z).toBeGreaterThan(0.6);
    }
  });
});

describe('voyage vers la Lune', () => {
  it('départ : allumage après la mise en attitude, puis la Terre s’éloigne', () => {
    expect(departure(0)).toEqual({ advance: 0, thrust: 0, recede: 0, approach: 0 });
    expect(departure(IGNITION_AT).thrust).toBe(0);
    const end = departure(1);
    expect(end.thrust).toBe(1);
    expect(end.recede).toBe(1);
    expect(end.advance).toBeGreaterThan(10);
  });

  it('alunissage : freinage couché, redressement, puis posé moteurs coupés', () => {
    const start = landing(0);
    expect(start.y).toBe(LANDING_START_Y);
    expect(start.tilt).toBeCloseTo(Math.PI / 2);
    expect(landing(0.3).main).toBeGreaterThan(0.5);
    expect(landing(0.8).thrusters).toBeGreaterThan(0.5);
    expect(landing(0.8).main).toBe(0);
    const end = landing(1);
    expect(end).toMatchObject({ x: 0, y: 0, tilt: 0, main: 0, thrusters: 0, dust: 0 });
  });

  it('la descente est continue et ne remonte jamais', () => {
    let prev = landing(0);
    for (let i = 1; i <= 200; i++) {
      const p = landing(i / 200);
      expect(p.y).toBeLessThanOrEqual(prev.y + 1e-9);
      expect(Math.abs(p.y - prev.y)).toBeLessThan(2);
      expect(Math.abs(p.x - prev.x)).toBeLessThan(2);
      prev = p;
    }
  });

  it('la caméra suit le vaisseau seulement dans les décors du voyage', () => {
    expect(shipFollow(0, 1, 1)).toEqual([0, 0]);
    expect(shipFollow(1, 1, 1)).toEqual([0, 0]);
    expect(shipFollow(2, 0, 0)).toEqual([-0, 0]);
    expect(shipFollow(2, 1, 0)[0]).toBeLessThan(0);
    expect(shipFollow(3, 0, 0)).toEqual([landing(0).x, landing(0).y]);
    expect(shipFollow(3, 0, 1)).toEqual([0, 0]);
  });
});
