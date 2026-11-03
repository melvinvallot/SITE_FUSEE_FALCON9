import { altitudeToPercent, LAYERS, SCALE_TOP } from '../components/ui/AtmosphereScale';
import { directorStore, enableSound, startTour, stop } from './director';
import { easeInOut } from './scrollDriver';

describe('couches de l’atmosphère', () => {
  it('s’enchaînent sans trou de 0 au sommet de l’échelle', () => {
    expect(LAYERS[0]!.from).toBe(0);
    for (let i = 1; i < LAYERS.length; i++) expect(LAYERS[i]!.from).toBe(LAYERS[i - 1]!.to);
    expect(LAYERS[LAYERS.length - 1]!.to).toBe(SCALE_TOP);
  });

  it('place la séparation (70 km) dans la mésosphère', () => {
    const meso = LAYERS.find((l) => l.id === 'mesosphere')!;
    expect(70).toBeGreaterThan(meso.from);
    expect(70).toBeLessThan(meso.to);
  });

  it('convertit une altitude en position monotone et bornée', () => {
    expect(altitudeToPercent(0)).toBe(0);
    expect(altitudeToPercent(SCALE_TOP)).toBe(100);
    expect(altitudeToPercent(500)).toBe(100);
    expect(altitudeToPercent(12)).toBeLessThan(altitudeToPercent(50));
  });
});

describe('défilement programmé', () => {
  it('suit une courbe douce de 0 à 1', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });
});

describe('mode vidéo', () => {
  it('démarre puis s’arrête quand l’utilisateur reprend la main', () => {
    startTour();
    expect(directorStore.get().mode).toBe('tour');
    stop();
    expect(directorStore.get().mode).toBe('idle');
    expect(directorStore.get().countdown).toBeNull();
  });

  it('garde la préférence de son', () => {
    enableSound(false);
    expect(directorStore.get().sound).toBe(false);
  });
});
