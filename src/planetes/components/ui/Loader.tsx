/** Écran de chargement, le temps de préparer la scène 3D. */
export function Loader({ done }: { done: boolean }) {
  return (
    <div className="loader" data-done={done} role="status" aria-live="polite">
      <span className="loader__title">Cap sur les planètes</span>
      <span className="loader__bar" aria-hidden="true" />
      <span className="loader__text">{done ? 'Scène prête' : 'Préparation du système solaire…'}</span>
    </div>
  );
}
