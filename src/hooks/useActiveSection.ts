import { activeIndex } from '../lib/timeline';
import { scrollStore } from '../lib/scrollStore';
import { useStoreValue } from './useStoreValue';

/** Index de la section actuellement à l'écran. */
export function useActiveSection(count: number): number {
  return useStoreValue(scrollStore, (p) => activeIndex(count, p));
}
