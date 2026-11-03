import { createStore } from './store';

/** Progression globale du défilement, partagée entre le DOM et la scène 3D. */
export const scrollStore = createStore(0);
