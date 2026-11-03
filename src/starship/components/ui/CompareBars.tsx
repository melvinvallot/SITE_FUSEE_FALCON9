import { formatNumber } from '../../lib/format';
import type { CompareRow } from '../../types';

interface CompareBarsProps {
  rows: readonly CompareRow[];
  /** Libellé de la valeur de droite (Falcon 9 ou Merlin). */
  againstLabel?: string;
  primaryLabel?: string;
}

const fmt = (v: number, unit: string) => `${formatNumber(v, Number.isInteger(v) ? 0 : 1)}${unit ? ` ${unit}` : ''}`;

/** Comparaison chiffrée sous forme de barres proportionnelles, qui se remplissent à l'apparition. */
export function CompareBars({ rows, primaryLabel = 'Starship', againstLabel = 'Falcon 9' }: CompareBarsProps) {
  return (
    <div className="compare">
      <p className="compare__legend" aria-hidden="true">
        <span className="compare__key compare__key--hot">{primaryLabel}</span>
        <span className="compare__key">{againstLabel}</span>
      </p>
      <dl className="compare__rows">
        {rows.map((r) => {
          const max = Math.max(r.starship, r.falcon);
          return (
            <div className="compare__row" key={r.label}>
              <dt>{r.label}</dt>
              <dd>
                <span className="compare__bar compare__bar--hot" style={{ ['--w' as string]: r.starship / max }}>
                  <span className="sr-only">{primaryLabel} : </span>
                  {fmt(r.starship, r.unit)}
                </span>
                <span className="compare__bar" style={{ ['--w' as string]: r.falcon / max }}>
                  <span className="sr-only">{againstLabel} : </span>
                  {fmt(r.falcon, r.unit)}
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
