import { GAUGE_ITEMS, GAUGE_TOTAL } from './gauge';
import { KEYFRAMES } from './keyframes';
import { CHAPTERS, SECTIONS } from './sections';
import { TELEMETRY } from './telemetry';

describe('cohérence des données Starship', () => {
  it('associe une image clé à chaque section, dans le même ordre', () => {
    expect(KEYFRAMES.map((k) => k.sectionId)).toEqual(SECTIONS.map((s) => s.id));
  });

  it('utilise des identifiants uniques et des chapitres connus', () => {
    const ids = SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const chapters = new Set(CHAPTERS.map((c) => c.id));
    for (const s of SECTIONS) expect(chapters.has(s.chapter)).toBe(true);
    for (const c of CHAPTERS) expect(SECTIONS.some((s) => s.chapter === c.id)).toBe(true);
  });

  it('garde les chapitres d’un seul tenant', () => {
    const order = SECTIONS.map((s) => s.chapter).filter((c, i, a) => a[i - 1] !== c);
    expect(order).toEqual(CHAPTERS.map((c) => c.id));
  });

  it('reste dans les bornes de chaque paramètre', () => {
    for (const k of KEYFRAMES) {
      expect(k.env).toBeGreaterThanOrEqual(0);
      expect(k.env).toBeLessThanOrEqual(3);
      expect(Number.isInteger(k.env)).toBe(true);
      for (const v of [k.explode, k.cutaway, k.site, k.launch, k.sep, k.capture, k.tli, k.land]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
      expect(k.fov).toBeGreaterThan(10);
    }
  });

  it('relie la jauge à des sections existantes, sur 124 m', () => {
    for (const item of GAUGE_ITEMS) {
      expect(SECTIONS.some((s) => s.id === item.sectionId)).toBe(true);
      expect(item.from).toBeGreaterThanOrEqual(0);
      expect(item.to).toBeLessThanOrEqual(GAUGE_TOTAL);
      expect(item.to).toBeGreaterThan(item.from);
    }
  });

  it('place la télémétrie sur les sections de vol, dans l’ordre', () => {
    const flight = SECTIONS.map((s, i) => ({ s, at: i / (SECTIONS.length - 1) })).filter(({ s }) => s.telemetry);
    expect(TELEMETRY.map((p) => p.at)).toEqual(flight.map((f) => f.at));
    for (let i = 1; i < TELEMETRY.length; i++) expect(TELEMETRY[i]!.time).toBeGreaterThan(TELEMETRY[i - 1]!.time);
  });

  it('donne un contenu à chaque section', () => {
    for (const s of SECTIONS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.lead.length).toBeGreaterThan(40);
    }
  });
});
