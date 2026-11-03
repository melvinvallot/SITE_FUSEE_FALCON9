import { act, renderHook } from '@testing-library/react';
import { createStore } from '../lib/store';
import { scrollStore } from '../lib/scrollStore';
import { useActiveSection } from './useActiveSection';
import { useScrollSync } from './useScrollSync';
import { useStoreValue } from './useStoreValue';

describe('useStoreValue', () => {
  it('se met à jour avec le magasin et applique le sélecteur', () => {
    const store = createStore({ n: 1 });
    const { result } = renderHook(() => useStoreValue(store, (s) => s.n * 2));
    expect(result.current).toBe(2);
    act(() => store.set({ n: 5 }));
    expect(result.current).toBe(10);
  });
});

describe('useScrollSync', () => {
  it('écrit la progression du défilement dans le magasin', () => {
    const store = createStore(0);
    Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: 3000 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 1000 });
    Object.defineProperty(window, 'scrollY', { configurable: true, writable: true, value: 1000 });

    renderHook(() => useScrollSync(store));
    expect(store.get()).toBe(0.5);
  });
});

describe('useActiveSection', () => {
  it('suit la section la plus proche', () => {
    const { result } = renderHook(() => useActiveSection(5));
    act(() => scrollStore.set(0.74));
    expect(result.current).toBe(3);
    act(() => scrollStore.set(0));
    expect(result.current).toBe(0);
  });
});
