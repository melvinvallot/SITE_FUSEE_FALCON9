import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { SiteNav } from '../components/ui/SiteNav';
import { DESTINATIONS, planetById, type PlanetId } from './data/planets';
import { dayFromDate, planMission } from './lib/orbits';
import { formatDate } from './lib/format';
import { PlanetList } from './components/ui/PlanetList';
import { MissionCard } from './components/ui/MissionCard';
import { MissionHud } from './components/ui/MissionHud';
import { Loader } from './components/ui/Loader';

const Scene = lazy(() => import('./components/three/Scene').then((m) => ({ default: m.Scene })));

/** `?planete=mars` dans l'adresse ouvre directement un voyage. */
function initialTarget(): PlanetId | null {
  if (typeof window === 'undefined') return null;
  const p = planetById(new URLSearchParams(window.location.search).get('planete'));
  return p && p.id !== 'terre' ? p.id : null;
}

export default function App() {
  const reducedMotion = useReducedMotion();
  const nowDay = useMemo(() => dayFromDate(new Date()), []);
  const [targetId, setTargetId] = useState<PlanetId | null>(initialTarget);
  const [runId, setRunId] = useState(0);
  const [skipId, setSkipId] = useState(0);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  const mission = useMemo(() => {
    const p = planetById(targetId);
    return p ? planMission(p, nowDay) : null;
  }, [targetId, nowDay]);

  const select = useCallback(
    (id: PlanetId) => {
      if (id === targetId) setRunId((n) => n + 1);
      else setTargetId(id);
    },
    [targetId],
  );

  // L'adresse suit la destination choisie, pour pouvoir la partager.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (targetId) url.searchParams.set('planete', targetId);
    else url.searchParams.delete('planete');
    window.history.replaceState(null, '', url);
  }, [targetId]);

  // Filet de sécurité : sans WebGL, la page reste lisible.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 6000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="planetes" data-ready={ready} data-mission={!!mission}>
      <Suspense fallback={null}>
        <Scene
          mission={mission}
          runId={runId}
          skipId={skipId}
          nowDay={nowDay}
          reducedMotion={reducedMotion}
          onSelect={select}
          onReady={onReady}
        />
      </Suspense>
      <Loader done={ready} />
      <SiteNav current="planetes" />

      <aside className="panel" aria-labelledby="titre-planetes">
        <p className="panel__eyebrow">Voyages interplanétaires</p>
        <h1 id="titre-planetes" className="panel__title">
          Combien de temps pour aller sur…
        </h1>
        <p className="panel__lead">
          Starship part de la Terre. Choisis une planète : la 3D calcule le trajet, attend la bonne fenêtre de tir et
          t’emmène jusqu’à l’arrivée.
        </p>
        <PlanetList planets={DESTINATIONS} selected={targetId} onSelect={select} />
        <details className="method">
          <summary>Comment on calcule ?</summary>
          <p>
            On utilise un <strong>transfert de Hohmann</strong> : le vaisseau quitte l’orbite de la Terre sur une
            demi-ellipse qui touche l’orbite de la planète visée. C’est le chemin qui consomme le moins de carburant, et
            sa durée se déduit de la 3<sup>e</sup> loi de Kepler.
          </p>
          <p>
            Il faut partir au bon moment, la <strong>fenêtre de tir</strong>, pour que la planète soit au rendez-vous.
            Les dates sont calculées à partir d’aujourd’hui ({formatDate(nowDay)}).
          </p>
          <p>
            Ce sont des <strong>estimations</strong> : les orbites sont supposées rondes et dans le même plan. En
            brûlant plus de carburant, ou en profitant de l’élan d’autres planètes, on peut aller plus vite.
          </p>
        </details>
        <p className="fineprint">
          Dans la 3D, les tailles et les distances ne sont pas à l’échelle : le système solaire réel est bien trop
          grand pour tenir à l’écran. Ce site n’est pas affilié à SpaceX.
        </p>
      </aside>

      {mission && (
        <MissionCard
          key={mission.target.id}
          mission={mission}
          onReplay={() => setRunId((n) => n + 1)}
          onSkip={() => setSkipId((n) => n + 1)}
          onClose={() => setTargetId(null)}
        />
      )}
      {mission && <MissionHud mission={mission} />}
      <p className="hint" aria-hidden="true">
        Glisser pour tourner · molette pour zoomer · clic sur une planète pour y aller
      </p>
    </div>
  );
}
