import { useSyncExternalStore } from 'react';
import type { Store } from '../lib/store';

/** Abonne un composant à une valeur dérivée d'un magasin. */
export function useStoreValue<T, S = T>(store: Store<T>, selector: (s: T) => S = (s) => s as unknown as S): S {
  return useSyncExternalStore(
    store.subscribe,
    () => selector(store.get()),
    () => selector(store.get()),
  );
}
