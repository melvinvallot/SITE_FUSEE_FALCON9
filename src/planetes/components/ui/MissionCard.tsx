import { Button } from '../../../components/ui/Button';
import { EARTH } from '../../data/planets';
import { distanceKm, lightMinutes, pathLengthKm, synodicDays, type Mission } from '../../lib/orbits';
import { formatDuration, formatKm, formatLight, formatMonth, durationText } from '../../lib/format';

interface MissionCardProps {
  mission: Mission;
  onReplay: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/** Fiche de la destination : durée estimée, dates, distances et quelques repères. */
export function MissionCard({ mission, onReplay, onSkip, onClose }: MissionCardProps) {
  const p = mission.target;
  const d = formatDuration(mission.transfer.days);
  const radio = lightMinutes(distanceKm(EARTH, p, mission.arrivalDay));
  const titleId = `fiche-${p.id}`;
  return (
    <section className="card" aria-labelledby={titleId} style={{ ['--accent' as string]: p.color }}>
      <button type="button" className="card__close" onClick={onClose} aria-label="Fermer la fiche">
        ×
      </button>
      <p className="card__eyebrow">Terre → {p.name}</p>
      <h2 id={titleId} className="card__title">
        {p.name}
      </h2>
      <p className="card__tagline">{p.tagline}</p>

      <p className="card__big">
        <span className="card__value">{d.value}</span> <span className="card__unit">{d.unit}</span>
      </p>
      <p className="card__est">
        de voyage, soit environ {Math.round(mission.transfer.days).toLocaleString('fr-FR')} jours <em>(estimation)</em>
      </p>
      <div className="card__actions">
        <Button onClick={onReplay}>Rejouer le voyage</Button>
        <Button variant="quiet" onClick={onSkip}>
          Aller à l’arrivée
        </Button>
      </div>

      <dl className="card__rows">
        <div>
          <dt>Prochain départ possible</dt>
          <dd>{formatMonth(mission.launchDay)}</dd>
        </div>
        <div>
          <dt>Arrivée</dt>
          <dd>{formatMonth(mission.arrivalDay)}</dd>
        </div>
        <div>
          <dt>Une fenêtre de tir tous les</dt>
          <dd>{durationText(synodicDays(p))}</dd>
        </div>
        <div>
          <dt>Distance parcourue</dt>
          <dd>≈ {formatKm(pathLengthKm(mission.transfer))}</dd>
        </div>
        <div>
          <dt>Message radio vers la Terre</dt>
          <dd>{formatLight(radio)}</dd>
        </div>
      </dl>

      {p.realMission && (
        <p className="card__compare">
          <strong>Pour comparer :</strong> {p.realMission}
        </p>
      )}
      {p.note && <p className="card__note">{p.note}</p>}

      <dl className="card__facts">
        {p.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

    </section>
  );
}
