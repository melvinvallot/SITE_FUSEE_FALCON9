import { useStoreValue } from '../../../hooks/useStoreValue';
import type { Mission } from '../../lib/orbits';
import { hudStore } from '../../lib/missionStore';
import { formatDate, formatKm, formatNumber } from '../../lib/format';

const PHASES = {
  idle: '',
  window: 'Attente de la fenêtre de tir',
  depart: 'Départ de la Terre',
  cruise: 'Croisière',
  brake: 'Retournement et freinage',
  arrived: 'Arrivée en orbite',
} as const;

/** Tableau de bord du voyage : date simulée, jour du trajet, vitesse et distance. */
export function MissionHud({ mission }: { mission: Mission }) {
  const hud = useStoreValue(hudStore);
  if (hud.phase === 'idle') return null;
  const total = Math.round(mission.transfer.days);
  const dayOfTrip = hud.phase === 'window' ? 0 : Math.min(total, Math.round(hud.progress * mission.transfer.days));
  const label = hud.phase === 'cruise' ? `Croisière vers ${mission.target.name}` : PHASES[hud.phase];
  return (
    <div className="hud" style={{ ['--accent' as string]: mission.target.color }} data-phase={hud.phase}>
      <div className="hud__head">
        <span className="hud__phase">{label}</span>
        <span className="hud__date">{formatDate(hud.day)}</span>
      </div>
      <div
        className="hud__track"
        role="progressbar"
        aria-label="Avancement du voyage"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={dayOfTrip}
      >
        <span style={{ transform: `scaleX(${hud.phase === 'window' ? 0 : hud.progress})` }} />
      </div>
      <dl className="hud__stats">
        <div>
          <dt>Jour</dt>
          <dd>
            {formatNumber(dayOfTrip)} <small>/ {formatNumber(total)}</small>
          </dd>
        </div>
        <div>
          <dt title="Vitesse par rapport au Soleil">Vitesse</dt>
          <dd>
            {formatNumber(hud.speed, 1)} <small>km/s</small>
          </dd>
        </div>
        <div>
          <dt>Distance de la Terre</dt>
          <dd>{hud.phase === 'window' ? '—' : formatKm(hud.fromEarth)}</dd>
        </div>
      </dl>
    </div>
  );
}
