import { createStore } from '../../lib/store';
import { beep, setMuted, setRumble, speak, stopAudio, unlockAudio } from './launchAudio';
import { cancelScroll, nearestSection, scrollToSection } from './scrollDriver';

export type DirectorMode = 'idle' | 'tour' | 'launch';

export interface DirectorState {
  mode: DirectorMode;
  /** Secondes avant le décollage pendant le décompte (10 à 0), sinon `null`. */
  countdown: number | null;
  /** Annonce en cours, affichée en sous-titre. */
  caption: string | null;
  sound: boolean;
}

export const directorStore = createStore<DirectorState>({ mode: 'idle', countdown: null, caption: null, sound: false });

const patch = (p: Partial<DirectorState>) => directorStore.set((s) => ({ ...s, ...p }));

class Cancelled extends Error {}

let token = { cancelled: false };
let sectionIds: readonly string[] = [];
let reduced = false;

/** Sections de la page et préférence de mouvement réduit, fournies par l'application. */
export function configureDirector(ids: readonly string[], reducedMotion: boolean): void {
  sectionIds = ids;
  reduced = reducedMotion;
}

const wait = (ms: number, t = token) =>
  new Promise<void>((resolve, reject) => {
    if (t.cancelled) return reject(new Cancelled());
    setTimeout(() => (t.cancelled ? reject(new Cancelled()) : resolve()), ms);
  });

async function go(id: string, ms: number, t = token): Promise<void> {
  if (t.cancelled) throw new Cancelled();
  const done = await scrollToSection(id, reduced ? 0 : ms);
  if (t.cancelled || !done) throw new Cancelled();
}

/** Sous-titre et voix ensemble. */
function say(text: string, options?: Parameters<typeof speak>[1]) {
  patch({ caption: text });
  if (directorStore.get().sound) speak(text, options);
}

const NUMBERS = ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix'];

/** Séquence de lancement : annonces, décompte de 10 s, décollage puis retour du propulseur. */
async function launchTimeline(t: typeof token): Promise<void> {
  await go('pas-de-tir', 1800, t);
  say('Ici le contrôle de Starbase. Tous les systèmes sont prêts pour le lancement.');
  await wait(4200, t);
  say('Directeur de lancement : go pour le lancement.');
  await wait(3200, t);

  for (let k = 10; k >= 1; k--) {
    patch({ countdown: k });
    beep(k <= 3 ? 1175 : 880, 0.14);
    if (k === 3) {
      say('Allumage des moteurs', { interrupt: true, rate: 1.15 });
      setRumble(0.55, 3);
      void scrollToSection('decollage', reduced ? 0 : 3000);
    } else if (k > 3) {
      patch({ caption: `T moins ${k}` });
      if (directorStore.get().sound) speak(NUMBERS[k]!, { interrupt: true, rate: 1.1 });
    }
    await wait(1000, t);
  }

  patch({ countdown: 0 });
  beep(1568, 0.6, 0.25);
  setRumble(1, 0.6);
  say('Décollage ! Starship a quitté la tour.', { interrupt: true });
  const climb = go('ascension', 9500, t);
  await wait(2600, t);
  patch({ countdown: null });
  await climb;
  say('Max Q. Pression aérodynamique maximale.');
  await wait(1800, t);

  setRumble(0.75, 3);
  await go('separation', 6500, t);
  setRumble(0.3, 1);
  beep(660, 0.1, 0.15);
  say('Séparation à chaud confirmée. Les moteurs du vaisseau sont allumés.');
  await wait(4200, t);

  await go('retour', 5200, t);
  setRumble(0.5, 1.2);
  say('Allumage de retour. Super Heavy fait demi-tour vers Starbase.');
  await wait(3800, t);

  setRumble(0.08, 2);
  await go('descente', 5200, t);
  say('Descente guidée par les ailerons en grille.');
  await wait(3200, t);

  const landing = go('atterrissage', 5200, t);
  await wait(2600, t);
  setRumble(0.9, 1.5);
  await landing;
  say('Allumage d’atterrissage.');
  await wait(2800, t);

  await go('capture', 4800, t);
  setRumble(0, 1.5);
  beep(988, 0.12, 0.15);
  await wait(150, t);
  beep(1318, 0.3, 0.15);
  say('Capture ! Les bras de la tour ont rattrapé le propulseur.');
  await wait(5200, t);
  patch({ caption: null });
}

/** Mode vidéo : la page défile seule, section après section, et joue le lancement en passant. */
async function tourTimeline(t: typeof token): Promise<void> {
  const launchIndex = sectionIds.indexOf('pas-de-tir');
  let i = nearestSection(sectionIds);
  while (i < sectionIds.length - 1) {
    if (i + 1 === launchIndex || i === launchIndex) {
      patch({ mode: 'launch' });
      await launchTimeline(t);
      patch({ mode: 'tour' });
      i = sectionIds.indexOf('capture');
      continue;
    }
    await go(sectionIds[i + 1]!, 3200, t);
    i += 1;
    await wait(4800, t);
  }
}

function run(mode: DirectorMode, timeline: (t: typeof token) => Promise<void>): void {
  stop();
  const t = { cancelled: false };
  token = t;
  patch({ mode, countdown: null, caption: null });
  timeline(t)
    .catch((e: unknown) => {
      if (!(e instanceof Cancelled)) throw e;
    })
    .finally(() => {
      if (token === t) {
        stopAudio();
        patch({ mode: 'idle', countdown: null, caption: null });
      }
    });
}

/** Lance la séquence de lancement. `withSound` doit venir d'un clic (déblocage du son). */
export function startLaunch(withSound: boolean): void {
  if (withSound) enableSound(true);
  run('launch', launchTimeline);
}

export function startTour(): void {
  run('tour', tourTimeline);
}

/** Arrête toute séquence automatique (l'utilisateur reprend la main). */
export function stop(): void {
  token.cancelled = true;
  cancelScroll();
  stopAudio();
  if (directorStore.get().mode !== 'idle' || directorStore.get().countdown !== null) {
    patch({ mode: 'idle', countdown: null, caption: null });
  }
}

/** Active ou coupe le son (à appeler depuis un clic pour débloquer l'audio). */
export function enableSound(on: boolean): void {
  if (on) unlockAudio();
  setMuted(!on);
  patch({ sound: on });
}
