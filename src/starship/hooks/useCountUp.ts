import { useEffect, useRef, useState } from 'react';
import { easeOutCubic } from '../lib/format';

/**
 * Valeur qui monte de 0 à `target` quand `active` devient vrai, une seule
 * fois. Sans animation si l'utilisateur préfère réduire les mouvements.
 */
export function useCountUp(target: number, active: boolean, reduced: boolean, duration = 1400): number {
  const [value, setValue] = useState(reduced ? target : 0);
  const done = useRef(reduced);

  useEffect(() => {
    if (reduced) {
      done.current = true;
      setValue(target);
      return;
    }
    if (!active || done.current) return;
    done.current = true;
    let frame = 0;
    let finished = false;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setValue(target * easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
      else finished = true;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      // Animation interrompue : elle pourra reprendre à la prochaine apparition.
      if (!finished) done.current = false;
    };
  }, [active, reduced, target, duration]);

  return value;
}
