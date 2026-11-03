import { lazy, Suspense, useMemo } from 'react';
import { KEYFRAMES } from './data/keyframes';
import { PART_ORDER, PARTS } from './data/parts';
import { SECTIONS } from './data/sections';
import { scrollStore } from './lib/scrollStore';
import { useScrollSync } from './hooks/useScrollSync';
import { useActiveSection } from './hooks/useActiveSection';
import { useReducedMotion } from './hooks/useReducedMotion';
import { useScrollToSection } from './hooks/useScrollToSection';
import { Section } from './components/ui/Section';
import { Hero } from './components/ui/Hero';
import { TextBlock } from './components/ui/TextBlock';
import { PartDetails } from './components/ui/PartDetails';
import { SpecList } from './components/ui/SpecList';
import { Altimeter, type AltimeterEntry } from './components/ui/Altimeter';
import { ProgressBar } from './components/ui/ProgressBar';
import { Button } from './components/ui/Button';
import { SiteNav } from './components/ui/SiteNav';

const Scene = lazy(() => import('./components/three/Scene').then((m) => ({ default: m.Scene })));

const KEY_FIGURES = [
  { label: 'Hauteur', value: '70 m' },
  { label: 'Diamètre', value: '3,7 m' },
  { label: 'Masse au décollage', value: '549 t' },
  { label: 'Charge en orbite basse', value: '22,8 t' },
];

export default function App() {
  useScrollSync(scrollStore);
  const reducedMotion = useReducedMotion();
  const scrollTo = useScrollToSection();
  const active = useActiveSection(SECTIONS.length);
  const activePart = SECTIONS[active]?.partId ?? null;

  const altimeterEntries = useMemo<AltimeterEntry[]>(
    () =>
      PART_ORDER.map((id) => ({
        part: PARTS[id],
        sectionId: SECTIONS.find((s) => s.partId === id)?.id ?? '',
      })),
    [],
  );

  return (
    <>
      <Suspense fallback={null}>
        <Scene keyframes={KEYFRAMES} progress={scrollStore} reducedMotion={reducedMotion} />
      </Suspense>
      <SiteNav current="falcon9" />
      <ProgressBar />
      <Altimeter entries={altimeterEntries} activePart={activePart} onSelect={scrollTo} />

      <main className="page">
        {SECTIONS.map((section, index) => {
          const headingId = `${section.id}-titre`;
          const isActive = index === active;
          let content;
          if (index === 0) {
            content = (
              <Hero title={section.title} lead={section.lead} headingId={headingId} onStart={() => scrollTo('anatomie')} />
            );
          } else if (section.partId) {
            content = <PartDetails part={PARTS[section.partId]} headingId={headingId} />;
          } else if (index === SECTIONS.length - 1) {
            content = (
              <TextBlock title={section.title} lead={section.lead} headingId={headingId}>
                <SpecList specs={KEY_FIGURES} className="specs--figures" />
                <div className="actions">
                  <a className="button button--primary" href="./starship.html">
                    Découvrir Starship
                  </a>
                  <Button variant="quiet" onClick={() => scrollTo(SECTIONS[0]!.id)}>
                    Revenir au début
                  </Button>
                </div>
                <p className="fineprint">
                  Modèle 3D simplifié, réalisé à des fins pédagogiques. Les cotes sont approximatives et ce site
                  n'est pas affilié à SpaceX.
                </p>
              </TextBlock>
            );
          } else {
            content = <TextBlock title={section.title} lead={section.lead} headingId={headingId} />;
          }
          return (
            <Section key={section.id} id={section.id} align={section.align} active={isActive} labelledBy={headingId}>
              {content}
            </Section>
          );
        })}
      </main>

    </>
  );
}
