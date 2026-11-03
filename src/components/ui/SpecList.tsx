import type { Spec } from '../../types';

interface SpecListProps {
  specs: readonly Spec[];
  className?: string;
}

export function SpecList({ specs, className }: SpecListProps) {
  return (
    <dl className={['specs', className].filter(Boolean).join(' ')}>
      {specs.map((s) => (
        <div className="specs__row" key={s.label}>
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
