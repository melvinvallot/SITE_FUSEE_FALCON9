import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { scrollStore } from '../lib/scrollStore';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useScrollToSection } from '../hooks/useScrollToSection';
import { useStoreValue } from '../hooks/useStoreValue';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SiteNav } from '../components/ui/SiteNav';
import { KEYFRAMES } from './data/keyframes';
import { CHAPTERS, SECTIONS } from './data/sections';
import { GAUGE_ITEMS, GAUGE_TOTAL } from './data/gauge';
import { TELEMETRY } from './data/telemetry';
import { activeIndex } from './lib/timeline';
import { useSectionScroll } from './hooks/useSectionScroll';
import { Hero } from './components/ui/Hero';
import { SectionContent } from './components/ui/SectionContent';
import { ChapterNav } from './components/ui/ChapterNav';
import { StackGauge } from './components/ui/StackGauge';
import { Telemetry } from './components/ui/Telemetry';
import { Loader } from './components/ui/Loader';
import { AtmosphereScale } from './components/ui/AtmosphereScale';
import { DirectorOverlay } from './components/ui/DirectorOverlay';
import { useDirectorControls } from './hooks/useDirectorControls';
import { startLaunch } from './lib/director';

const Scene = lazy(() => import('./components/three/Scene').then((m) => ({ default: m.Scene })));

const pad = (n: number) => String(n).padStart(2, '0');
const SECTION_IDS = SECTIONS.map((s) => s.id);
/** `?auto=0` dans l'adresse désactive le mode vidéo automatique (captures, démonstrations). */
const AUTO_TOUR = typeof window === 'undefined' || new URLSearchParams(window.location.search).get('auto') !== '0';

export default function App() {
  useSectionScroll(scrollStore, SECTION_IDS);
  const reducedMotion = useReducedMotion();
  const scrollTo = useScrollToSection();
  useDirectorControls(SECTION_IDS, reducedMotion, AUTO_TOUR);
  const active = useStoreValue(scrollStore, (p) => activeIndex(SECTIONS.length, p));
  const current = SECTIONS[active];
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  // Filet de sécurité : sans WebGL, la page reste lisible.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="starship" data-ready={ready} data-telemetry={!!current?.telemetry}>
      <Suspense fallback={null}>
        <Scene keyframes={KEYFRAMES} progress={scrollStore} reducedMotion={reducedMotion} onReady={onReady} />
      </Suspense>
      <Loader done={ready} />
      <SiteNav current="starship" />
      <ProgressBar />
      <StackGauge items={GAUGE_ITEMS} total={GAUGE_TOTAL} activeSection={current?.id} onSelect={scrollTo} hidden={!!current?.telemetry} />
      <AtmosphereScale points={TELEMETRY} visible={!!current?.telemetry} />
      <ChapterNav chapters={CHAPTERS} sections={SECTIONS} active={active} onSelect={scrollTo} />
      <Telemetry points={TELEMETRY} visible={!!current?.telemetry} />
      <DirectorOverlay />

      <main className="page">
        {SECTIONS.map((section, index) => {
          const headingId = `${section.id}-titre`;
          const isActive = index === active;
          const isLast = index === SECTIONS.length - 1;
          return (
            <Section
              key={section.id}
              id={section.id}
              align={section.align}
              active={isActive}
              labelledBy={headingId}
              className={index === 0 ? 'section--hero' : undefined}
            >
              {index === 0 ? (
                <Hero
                  title={section.title}
                  lead={section.lead}
                  headingId={headingId}
                  stats={section.stats}
                  reducedMotion={reducedMotion}
                  onStart={() => scrollTo(SECTIONS[1]!.id)}
                  onLaunch={() => startLaunch(true)}
                />
              ) : (
                <SectionContent
                  section={section}
                  headingId={headingId}
                  active={isActive}
                  reducedMotion={reducedMotion}
                  index={`${pad(index + 1)} / ${pad(SECTIONS.length)}`}
                >
                  {section.id === 'pas-de-tir' && (
                    <div className="panel__actions panel__launch" data-director="">
                      <Button onClick={() => startLaunch(true)}>Lancer le compte à rebours</Button>
                    </div>
                  )}
                  {isLast && (
                    <>
                      <div className="panel__actions">
                        <a className="button button--primary" href="./">
                          Découvrir Falcon 9
                        </a>
                        <Button variant="quiet" onClick={() => scrollTo(SECTIONS[0]!.id)}>
                          Revenir au début
                        </Button>
                      </div>
                      <p className="fineprint">
                        Chiffres issus de la page Starship de SpaceX (spacex.com/vehicles/starship). Les repères de vol
                        sont approximatifs ; la charge de Falcon 9 est celle de la version non récupérée. Modèle 3D
                        simplifié, réalisé à des fins pédagogiques. Cartes de la Terre : Solar System Scope (CC BY 4.0), d’après
                        la NASA. Ce site n’est pas affilié à SpaceX.
                      </p>
                    </>
                  )}
                </SectionContent>
              )}
            </Section>
          );
        })}
      </main>
    </div>
  );
}
