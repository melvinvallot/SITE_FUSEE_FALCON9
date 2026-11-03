import type { PartId, RocketPart } from '../../types';

export interface AltimeterEntry {
  part: RocketPart;
  sectionId: string;
}

interface AltimeterProps {
  entries: readonly AltimeterEntry[];
  activePart: PartId | null;
  /** Hauteur totale du lanceur, en mètres. */
  total?: number;
  onSelect: (sectionId: string) => void;
}

const TICKS = [0, 10, 20, 30, 40, 50, 60, 70];

/**
 * Échelle verticale du lanceur : chaque pièce occupe la hauteur qu'elle
 * a réellement sur la fusée. Un clic amène à sa fiche.
 */
export function Altimeter({ entries, activePart, total = 70, onSelect }: AltimeterProps) {
  const pct = (m: number) => `${(m / total) * 100}%`;
  // Les jambes recouvrent le bas du premier étage : elles ont leur propre colonne.
  const lanes = (id: PartId) => (id === 'legs' ? 1 : 0);

  return (
    <nav className="altimeter" aria-label="Pièces du lanceur, par hauteur">
      <div className="altimeter__scale" aria-hidden="true">
        {TICKS.map((t) => (
          <span key={t} className="altimeter__tick" style={{ bottom: pct(t) }}>
            {t} m
          </span>
        ))}
      </div>
      <ol className="altimeter__track">
        {entries.map(({ part, sectionId }) => (
          <li
            key={part.id}
            className="altimeter__item"
            data-lane={lanes(part.id)}
            style={{ bottom: pct(part.altitude.from), height: pct(part.altitude.to - part.altitude.from) }}
          >
            <button
              type="button"
              className="altimeter__band"
              aria-current={activePart === part.id ? 'true' : undefined}
              onClick={() => onSelect(sectionId)}
            >
              <span className="altimeter__label">{part.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
