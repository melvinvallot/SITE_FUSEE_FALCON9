import { LAUNCH_ALTITUDE } from '../data/layout';
import { IGNITION_SHARE, ignition, launchLift } from './launch';

describe('séquence de lancement', () => {
  it("allume les moteurs avant de quitter le sol", () => {
    expect(ignition(0)).toBe(0);
    expect(ignition(IGNITION_SHARE)).toBe(1);
    expect(launchLift(IGNITION_SHARE)).toBe(0);
  });

  it('accélère jusqu’à l’altitude finale', () => {
    const quarter = launchLift(IGNITION_SHARE + (1 - IGNITION_SHARE) / 2);
    expect(quarter).toBeCloseTo(LAUNCH_ALTITUDE / 4);
    expect(launchLift(1)).toBe(LAUNCH_ALTITUDE);
  });
});
