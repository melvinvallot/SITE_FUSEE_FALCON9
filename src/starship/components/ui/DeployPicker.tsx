import { useEffect, useRef, type KeyboardEvent } from 'react';
import { useStoreValue } from '../../../hooks/useStoreValue';
import type { Deployment } from '../../data/deployments';
import { deployStore, selectDeployment } from '../../lib/deploy';

interface DeployPickerProps {
  deployments: readonly Deployment[];
  /** La section est à l'écran : le largage du vol choisi démarre. */
  active: boolean;
}

/**
 * Sélecteur des largages réels de Starship : chaque vol relance l'animation 3D
 * avec ses satellites (simulateurs ou Starlink V3), dans l'ordre de sortie.
 */
export function DeployPicker({ deployments, active }: DeployPickerProps) {
  const index = useStoreValue(deployStore, (s) => s.index);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = deployments[index] ?? deployments[0]!;

  // En arrivant sur la section, le vol choisi est largué (une fois par visite).
  useEffect(() => {
    if (active) selectDeployment(deployStore.get().index);
  }, [active]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    // Les flèches servent aussi à changer d'étape : on les garde pour le sélecteur.
    e.preventDefault();
    e.stopPropagation();
    const next = (index + step + deployments.length) % deployments.length;
    selectDeployment(next);
    tabs.current[next]?.focus();
  };

  const sims = current.satellites.filter((k) => k === 'simulator').length;
  const real = current.satellites.length - sims;

  return (
    <div className="deploy">
      <div className="deploy__flights" role="radiogroup" aria-label="Choisir un vol à rejouer" onKeyDown={onKey}>
        {deployments.map((d, i) => (
          <button
            key={d.id}
            ref={(b) => (tabs.current[i] = b)}
            type="button"
            role="radio"
            aria-checked={i === index}
            tabIndex={i === index ? 0 : -1}
            className="deploy__flight"
            onClick={() => selectDeployment(i)}
          >
            <span className="deploy__flight-name">{d.flight}</span>
            <span className="deploy__flight-count">{d.satellites.length} sat.</span>
          </button>
        ))}
      </div>
      <div className="deploy__card" aria-live="polite">
        <p className="deploy__date">{current.date}</p>
        <p className="deploy__payload">{current.payload}</p>
        <p className="deploy__note">{current.note}</p>
        <p className="deploy__legend">
          {sims > 0 && (
            <span>
              <i className="deploy__swatch deploy__swatch--sim" aria-hidden="true" /> {sims} simulateur{sims > 1 ? 's' : ''}
            </span>
          )}
          {real > 0 && (
            <span>
              <i className="deploy__swatch deploy__swatch--v3" aria-hidden="true" /> {real} Starlink réel{real > 1 ? 's' : ''}
            </span>
          )}
        </p>
      </div>
      <button type="button" className="button button--quiet deploy__replay" onClick={() => selectDeployment(index)}>
        Rejouer le largage
      </button>
    </div>
  );
}
