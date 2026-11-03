import { useEffect } from 'react';
import { scrollProgress } from '../lib/math';
import type { Store } from '../lib/store';

/** Recopie la progression du défilement de la fenêtre dans un magasin. */
export function useScrollSync(store: Store<number>): void {
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const doc = document.documentElement;
      store.set(scrollProgress(window.scrollY, doc.scrollHeight, window.innerHeight));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [store]);
}
