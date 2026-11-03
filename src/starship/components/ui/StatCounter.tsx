import { useCountUp } from '../../hooks/useCountUp';
import { formatNumber } from '../../lib/format';
import type { Stat } from '../../types';

interface StatCounterProps {
  stat: Stat;
  active: boolean;
  reducedMotion: boolean;
}

/** Chiffre clé qui défile jusqu'à sa valeur quand la section apparaît. */
export function StatCounter({ stat, active, reducedMotion }: StatCounterProps) {
  const value = useCountUp(stat.value, active, reducedMotion);
  const final = `${stat.prefix ? `${stat.prefix} ` : ''}${formatNumber(stat.value, stat.decimals)}${stat.unit ? ` ${stat.unit}` : ''}`;
  return (
    <div className="stat">
      <dt className="stat__label">{stat.label}</dt>
      <dd className="stat__value" aria-label={final}>
        <span aria-hidden="true">
          {stat.prefix && <span className="stat__prefix">{stat.prefix} </span>}
          {formatNumber(value, stat.decimals)}
          {stat.unit && <span className="stat__unit"> {stat.unit}</span>}
        </span>
      </dd>
    </div>
  );
}

export function StatGrid({ stats, active, reducedMotion }: { stats: readonly Stat[]; active: boolean; reducedMotion: boolean }) {
  return (
    <dl className="stats">
      {stats.map((s) => (
        <StatCounter key={s.label} stat={s} active={active} reducedMotion={reducedMotion} />
      ))}
    </dl>
  );
}
