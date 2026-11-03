interface LoaderProps {
  done: boolean;
}

/** Écran de chargement, le temps de compiler la scène 3D. */
export function Loader({ done }: LoaderProps) {
  return (
    <div className="loader" data-done={done} role="status" aria-live="polite">
      <span className="loader__title">Starship</span>
      <span className="loader__bar" aria-hidden="true" />
      <span className="loader__text">{done ? 'Scène prête' : 'Préparation de la scène 3D…'}</span>
    </div>
  );
}
