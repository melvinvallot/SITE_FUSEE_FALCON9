import type { Planet, PlanetId } from '../../data/planets';
import { hohmann } from '../../lib/orbits';
import { durationText } from '../../lib/format';

interface PlanetListProps {
  planets: readonly Planet[];
  selected: PlanetId | null;
  onSelect: (id: PlanetId) => void;
}

const MIN = Math.log(60);
const MAX = Math.log(12_000);

/** Liste des destinations, avec la durée du trajet sur une échelle logarithmique. */
export function PlanetList({ planets, selected, onSelect }: PlanetListProps) {
  return (
    <ol className="dest-list" aria-label="Destinations">
      {planets.map((p) => {
        const days = hohmann(p).days;
        const width = Math.min(1, Math.max(0.06, (Math.log(days) - MIN) / (MAX - MIN)));
        return (
          <li key={p.id}>
            <button
              type="button"
              className="dest"
              aria-pressed={selected === p.id}
              onClick={() => onSelect(p.id)}
              style={{ ['--accent' as string]: p.color, ['--w' as string]: width }}
            >
              <span className="dest__dot" aria-hidden="true" />
              <span className="dest__name">{p.name}</span>
              <span className="dest__time">{durationText(days)}</span>
              <span className="dest__bar" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
