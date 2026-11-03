import { KEYFRAMES } from './keyframes';
import { PART_ORDER, PARTS } from './parts';
import { SECTIONS } from './sections';

describe('cohérence des données', () => {
  it('associe une image clé à chaque section, dans le même ordre', () => {
    expect(KEYFRAMES.map((k) => k.sectionId)).toEqual(SECTIONS.map((s) => s.id));
  });

  it('présente chaque pièce dans une section qui la met en valeur', () => {
    for (const id of PART_ORDER) {
      const index = SECTIONS.findIndex((s) => s.partId === id);
      expect(index).toBeGreaterThan(-1);
      expect(KEYFRAMES[index]?.focus).toBe(id);
    }
  });

  it('décrit des pièces aux hauteurs valides', () => {
    for (const part of Object.values(PARTS)) {
      expect(part.altitude.from).toBeGreaterThanOrEqual(0);
      expect(part.altitude.to).toBeGreaterThan(part.altitude.from);
      expect(part.altitude.to).toBeLessThanOrEqual(70);
      expect(part.specs.length).toBeGreaterThan(0);
    }
  });

  it('utilise des identifiants de section uniques', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
