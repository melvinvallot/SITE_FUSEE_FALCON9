import type { ReactNode } from 'react';
import { SpecList } from '../../../components/ui/SpecList';
import type { PageSection } from '../../types';
import { CompareBars } from './CompareBars';
import { StatGrid } from './StatCounter';

interface SectionContentProps {
  section: PageSection;
  headingId: string;
  active: boolean;
  reducedMotion: boolean;
  /** Numéro affiché dans le chapitre, par exemple « 03 / 22 ». */
  index: string;
  children?: ReactNode;
}

/**
 * Contenu d'un écran : surtitre, titre, texte, puis selon les données des
 * chiffres clés animés, une fiche technique, une liste ou une comparaison.
 * Chaque bloc apparaît à son tour quand la section devient active.
 */
export function SectionContent({ section, headingId, active, reducedMotion, index, children }: SectionContentProps) {
  let i = 0;
  const order = () => ({ ['--i' as string]: i++ });
  const isEngine = section.compare?.length === 1;
  return (
    <article className="panel">
      <p className="panel__eyebrow reveal" style={order()}>
        <span className="panel__index">{index}</span>
        {section.eyebrow && <span>{section.eyebrow}</span>}
      </p>
      <h2 id={headingId} className="panel__title reveal" style={order()}>
        {section.title}
      </h2>
      <p className="panel__lead reveal" style={order()}>
        {section.lead}
      </p>
      {section.stats && (
        <div className="reveal" style={order()}>
          <StatGrid stats={section.stats} active={active} reducedMotion={reducedMotion} />
        </div>
      )}
      {section.specs && (
        <div className="reveal" style={order()}>
          <SpecList specs={section.specs} />
        </div>
      )}
      {section.points && (
        <ul className="panel__points reveal" style={order()}>
          {section.points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      {section.compare && (
        <div className="reveal" style={order()}>
          <CompareBars rows={section.compare} primaryLabel={isEngine ? 'Raptor' : 'Starship'} againstLabel={isEngine ? 'Merlin (Falcon 9)' : 'Falcon 9'} />
        </div>
      )}
      {children && (
        <div className="reveal" style={order()}>
          {children}
        </div>
      )}
    </article>
  );
}
