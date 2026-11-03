import type { Chapter, PageSection } from '../../types';

interface ChapterNavProps {
  chapters: readonly Chapter[];
  sections: readonly PageSection[];
  active: number;
  onSelect: (sectionId: string) => void;
}

/**
 * Sommaire fixe à droite : un chapitre par groupe de sections, avec un
 * repère par section et la position courante.
 */
export function ChapterNav({ chapters, sections, active, onSelect }: ChapterNavProps) {
  const current = sections[active]?.chapter;
  return (
    <nav className="chapters" aria-label="Chapitres">
      <ol className="chapters__list">
        {chapters.map((c, ci) => {
          const own = sections.map((s, i) => ({ s, i })).filter(({ s }) => s.chapter === c.id);
          const first = own[0];
          if (!first) return null;
          const isCurrent = c.id === current;
          return (
            <li key={c.id} className="chapters__item" data-current={isCurrent}>
              <button
                type="button"
                className="chapters__title"
                aria-current={isCurrent ? 'step' : undefined}
                onClick={() => onSelect(first.s.id)}
              >
                <span className="chapters__index" aria-hidden="true">
                  {String(ci + 1).padStart(2, '0')}
                </span>
                {c.title}
              </button>
              <span className="chapters__ticks" aria-hidden="true">
                {own.map(({ s, i }) => (
                  <span key={s.id} className="chapters__tick" data-state={i < active ? 'past' : i === active ? 'now' : 'next'} />
                ))}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
