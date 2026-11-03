import { useCallback } from 'react';
import { useReducedMotion } from './useReducedMotion';

/** Renvoie une fonction qui fait défiler la page jusqu'à une section. */
export function useScrollToSection(): (id: string) => void {
  const reduced = useReducedMotion();
  return useCallback(
    (id: string) => {
      document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    },
    [reduced],
  );
}
