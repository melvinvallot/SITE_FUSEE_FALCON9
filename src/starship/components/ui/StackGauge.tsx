import type { GaugeItem } from '../../types';

interface StackGaugeProps {
  items: readonly GaugeItem[];
  total: number;
  activeSection: string | undefined;
  onSelect: (sectionId: string) => void;
  /** Masquée pendant le vol, au profit de l'échelle de l'atmosphère. */
  hidden?: boolean;
}

const TICKS = [0, 20, 40, 60, 80, 100, 124];

/**
 * Jauge verticale de 0 à 124 m : chaque élément occupe sa hauteur réelle
 * sur le lanceur. Un clic amène à sa fiche.
 */
export function StackGauge({ items, total, activeSection, onSelect, hidden = false }: StackGaugeProps) {
  const pct = (m: number) => `${(m / total) * 100}%`;
  return (
    <nav className="gauge" data-hidden={hidden} aria-hidden={hidden || undefined} aria-label="Éléments du lanceur, par hauteur">
      <div className="gauge__scale" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} className="gauge__tick" style={{ bottom: pct(t) }}>
            {t} m
          </span>
        ))}
        <span className="gauge__stage gauge__stage--ship" style={{ bottom: pct(72), height: pct(52) }}>
          Starship
        </span>
        <span className="gauge__stage" style={{ bottom: pct(0), height: pct(72) }}>
          Super Heavy
        </span>
      </div>
      <ol className="gauge__track">
        {items.map((item) => (
          <li
            key={item.id}
            className="gauge__item"
            data-lane={item.lane}
            style={{ bottom: pct(item.from), height: pct(item.to - item.from) }}
          >
            <button
              type="button"
              className="gauge__band"
              aria-current={activeSection === item.sectionId ? 'true' : undefined}
              onClick={() => onSelect(item.sectionId)}
            >
              <span className="gauge__label">{item.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
