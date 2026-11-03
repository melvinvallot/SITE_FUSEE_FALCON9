import { scrollStore } from '../../lib/scrollStore';
import { useStoreValue } from '../../hooks/useStoreValue';

/** Fine barre de progression en haut de l'écran (affichée sur mobile). */
export function ProgressBar() {
  const progress = useStoreValue(scrollStore);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label="Progression dans la page"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <div className="progress__fill" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}
