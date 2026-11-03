import { createStore } from './store';

describe('createStore', () => {
  it('notifie les abonnés à chaque changement', () => {
    const store = createStore(1);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.set(2);
    store.set((v) => v * 10);
    expect(store.get()).toBe(20);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.set(3);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignore une valeur identique", () => {
    const store = createStore('a');
    const listener = vi.fn();
    store.subscribe(listener);
    store.set('a');
    expect(listener).not.toHaveBeenCalled();
  });
});
