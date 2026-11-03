import { useStoreValue } from '../../../hooks/useStoreValue';
import { directorStore, enableSound, startLaunch, startTour, stop } from '../../lib/director';
import { stepSection } from '../../hooks/useDirectorControls';
import { isTouchDevice } from '../../../lib/device';

/** Écran tactile : pas de flèches du clavier, on affiche des boutons d'étape à la place. */
const TOUCH = isTouchDevice();

/** Comme une flèche du clavier : reprend la main sur le mode vidéo, puis change d'étape. */
function step(dir: 1 | -1): void {
  if (directorStore.get().mode !== 'idle') stop();
  stepSection(dir);
}

/**
 * Commandes du mode vidéo et de la séquence de lancement : grand décompte,
 * sous-titres des annonces, bouton du son et bouton d'arrêt.
 */
export function DirectorOverlay() {
  const { mode, countdown, caption, sound } = useStoreValue(directorStore);
  const running = mode !== 'idle';

  return (
    <>
      {countdown !== null && (
        <div className="countdown" role="timer" aria-live="off">
          <p className="countdown__label">{countdown > 0 ? 'Compte à rebours' : 'Décollage'}</p>
          <p className="countdown__value" key={countdown}>
            {countdown > 0 ? `T−${String(countdown).padStart(2, '0')}` : 'T−00'}
          </p>
        </div>
      )}

      {running && caption && (
        <p className="caption" aria-live="polite">
          {caption}
        </p>
      )}

      <div className="director" data-director="" data-mode={mode}>
        {mode === 'tour' && (
          <p className="director__status">
            <span className="director__dot" aria-hidden="true" />
            Mode vidéo · faites défiler pour reprendre la main
          </p>
        )}
        {mode === 'launch' && (
          <p className="director__status">
            <span className="director__dot director__dot--hot" aria-hidden="true" />
            Séquence de lancement
          </p>
        )}
        <div className="director__buttons">
          <button
            type="button"
            className="director__button"
            aria-pressed={sound}
            onClick={() => enableSound(!sound)}
            title={sound ? 'Couper le son' : 'Activer le son et les voix'}
          >
            <span aria-hidden="true">{sound ? '🔊' : '🔈'}</span>
            <span className="director__text">{sound ? 'Son activé' : 'Son coupé'}</span>
          </button>
          {running ? (
            <button type="button" className="director__button" onClick={stop}>
              <span aria-hidden="true">■</span>
              <span className="director__text">Arrêter</span>
            </button>
          ) : (
            <>
              <button type="button" className="director__button" onClick={startTour} title="Défilement automatique de toute la page">
                <span aria-hidden="true">▶</span>
                <span className="director__text">Mode vidéo</span>
              </button>
              <button type="button" className="director__button director__button--hot" onClick={() => startLaunch(true)}>
                <span aria-hidden="true">🚀</span>
                <span className="director__text">Lancement</span>
              </button>
            </>
          )}
        </div>
        {TOUCH ? (
          <div className="director__steps" data-step="">
            <button type="button" className="director__button director__step" onClick={() => step(-1)} aria-label="Étape précédente">
              <span aria-hidden="true">↑</span>
            </button>
            <button type="button" className="director__button director__step" onClick={() => step(1)} aria-label="Étape suivante">
              <span aria-hidden="true">↓</span>
            </button>
          </div>
        ) : (
          <p className="director__hint">Flèches du clavier : étape suivante ou précédente</p>
        )}
      </div>
    </>
  );
}
