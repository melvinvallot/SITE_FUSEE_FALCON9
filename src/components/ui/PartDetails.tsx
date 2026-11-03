import type { RocketPart } from '../../types';
import { SpecList } from './SpecList';

interface PartDetailsProps {
  part: RocketPart;
  headingId: string;
}

export const formatAltitude = ({ from, to }: RocketPart['altitude']): string =>
  from === 0 ? `Du sol à ${to} m` : `De ${from} à ${to} m`;

/** Fiche d'une pièce : position sur le lanceur, rôle et caractéristiques. */
export function PartDetails({ part, headingId }: PartDetailsProps) {
  return (
    <article className="part">
      <p className="part__altitude">{formatAltitude(part.altitude)}</p>
      <h2 id={headingId} className="part__name">
        {part.name}
      </h2>
      <p className="part__summary">{part.summary}</p>
      <SpecList specs={part.specs} />
    </article>
  );
}
