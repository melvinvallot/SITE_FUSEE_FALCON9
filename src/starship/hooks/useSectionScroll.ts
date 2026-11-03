import { useEffect } from 'react';
import type { Store } from '../../lib/store';
import { sectionProgress } from '../lib/sectionProgress';

/**
 * Écrit dans le magasin la progression du défilement, calée sur le haut de
 * chaque section : l'animation 3D reste synchronisée avec le texte.
 */
export function useSectionScroll(store: Store<number>, ids: readonly string[]): void {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const tops = ids.map((id) => {
        const el = document.getElementById(id);
        return el ? el.getBoundingClientRect().top + window.scrollY : 0;
      });
      const max = document.documentElement.scrollHeight - window.innerHeight;
      store.set(sectionProgress(window.scrollY, tops, max));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [store, ids]);
}
