import { useEffect } from 'react';
import { configureDirector, directorStore, startTour, stop } from '../lib/director';
import { isDriving, scrollToSection, sectionTop } from '../lib/scrollDriver';

/** Délai sans action avant le départ du mode vidéo. */
export const IDLE_DELAY = 10_000;

const NEXT = new Set(['ArrowDown', 'ArrowRight', 'PageDown']);
const PREV = new Set(['ArrowUp', 'ArrowLeft', 'PageUp']);

/** Ignore les touches tapées dans un champ ou avec un modificateur. */
function isTyping(e: KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  if (e.altKey || e.ctrlKey || e.metaKey) return true;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

/**
 * Section suivante ou précédente par rapport à la position actuelle. Pendant
 * un défilement au clavier, on part de la section visée : plusieurs appuis s'enchaînent.
 */
function stepFrom(ids: readonly string[], dir: 1 | -1, pending: number | null): number {
  if (pending !== null) return Math.max(0, Math.min(ids.length - 1, pending + dir));
  const y = window.scrollY;
  const tops = ids.map((id) => sectionTop(id) ?? 0);
  if (dir > 0) {
    const i = tops.findIndex((t) => t > y + 4);
    return i < 0 ? ids.length - 1 : i;
  }
  let i = 0;
  tops.forEach((t, k) => {
    if (t < y - 4) i = k;
  });
  return i;
}

/**
 * Flèches du clavier pour passer d'une étape à l'autre, et mode vidéo
 * automatique après 10 secondes sans défilement ni action.
 */
export function useDirectorControls(ids: readonly string[], reducedMotion: boolean, autoTour = true): void {
  useEffect(() => {
    configureDirector(ids, reducedMotion);
  }, [ids, reducedMotion]);

  useEffect(() => {
    let idle = 0;
    let pending: number | null = null;

    const arm = () => {
      window.clearTimeout(idle);
      if (!autoTour) return;
      idle = window.setTimeout(() => {
        if (directorStore.get().mode === 'idle') startTour();
      }, IDLE_DELAY);
    };

    /** L'utilisateur reprend la main : on coupe le mode vidéo ou la séquence. */
    const activity = (e: Event) => {
      const target = e.target as Element | null;
      if (target && typeof target.closest === 'function' && target.closest('[data-director]')) {
        arm();
        return;
      }
      if (directorStore.get().mode !== 'idle') stop();
      arm();
    };

    const onScroll = () => {
      if (!isDriving()) arm();
    };

    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const dir = NEXT.has(e.key) ? 1 : PREV.has(e.key) ? -1 : 0;
      if (e.key === 'Escape' || dir !== 0) activity(e);
      else arm();
      if (dir === 0) return;
      e.preventDefault();
      const index = stepFrom(ids, dir, pending);
      pending = index;
      void scrollToSection(ids[index]!, reducedMotion ? 0 : 1100).then((done) => {
        if (done) pending = null;
      });
    };

    const pointer = (e: Event) => {
      pending = null;
      activity(e);
    };

    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', pointer, { passive: true });
    window.addEventListener('touchstart', pointer, { passive: true });
    window.addEventListener('pointerdown', pointer);
    window.addEventListener('scroll', onScroll, { passive: true });
    arm();
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', pointer);
      window.removeEventListener('touchstart', pointer);
      window.removeEventListener('pointerdown', pointer);
      window.removeEventListener('scroll', onScroll);
    };
  }, [ids, reducedMotion, autoTour]);
}
