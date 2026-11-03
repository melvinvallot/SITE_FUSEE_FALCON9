import { scrollStore } from '../../../lib/scrollStore';
import { useStoreValue } from '../../../hooks/useStoreValue';
import { formatNumber } from '../../lib/format';
import { readTelemetry, type TelemetryPoint } from '../../lib/telemetry';

/** Couches de l'atmosphère terrestre, en km (valeurs moyennes). */
export const LAYERS = [
  { id: 'troposphere', name: 'Troposphère', from: 0, to: 12, note: 'Nuages et météo', label: 0.55 },
  { id: 'stratosphere', name: 'Stratosphère', from: 12, to: 50, note: 'Couche d’ozone', label: 0.5 },
  { id: 'mesosphere', name: 'Mésosphère', from: 50, to: 85, note: 'Les météores s’y consument', label: 0.12 },
  { id: 'thermosphere', name: 'Thermosphère', from: 85, to: 160, note: 'Aurores, orbite basse', label: 0.62 },
] as const;

export const SCALE_TOP = 160;
/** Échelle en racine carrée : la troposphère, très fine, reste lisible. */
export const altitudeToPercent = (km: number): number => Math.sqrt(Math.max(0, Math.min(SCALE_TOP, km)) / SCALE_TOP) * 100;

const MARKERS = [
  { km: 12, label: 'Max Q · 12 km' },
  { km: 70, label: 'Séparation · 70 km', hot: true },
  { km: 100, label: 'Kármán · 100 km' },
];

interface AtmosphereScaleProps {
  points: readonly TelemetryPoint[];
  visible: boolean;
}

/**
 * Échelle verticale des couches de l'atmosphère pendant le vol : on y voit
 * à quelle altitude se trouvent le vaisseau et le propulseur, et où ils se séparent.
 */
export function AtmosphereScale({ points, visible }: AtmosphereScaleProps) {
  const progress = useStoreValue(scrollStore);
  const r = readTelemetry(points, progress);
  const separated = r.ship.altitude - r.booster.altitude > 2;
  // Un repère fixe s'efface quand un étage passe dessus, pour que les étiquettes restent lisibles.
  const crafts = separated ? [r.ship.altitude, r.booster.altitude] : [r.ship.altitude];
  return (
    <aside className="atmo" data-visible={visible} aria-hidden={!visible} aria-label="Couches de l’atmosphère et altitude du vol">
      <div className="atmo__column">
        {LAYERS.map((l) => (
          <div
            key={l.id}
            className={`atmo__layer atmo__layer--${l.id}`}
            style={{ bottom: `${altitudeToPercent(l.from)}%`, height: `${altitudeToPercent(l.to) - altitudeToPercent(l.from)}%` }}
          >
            <span className="atmo__name" style={{ bottom: `${l.label * 100}%` }}>
              {l.name}
              <span className="atmo__note">
                {l.from}–{l.to === SCALE_TOP ? '600' : l.to} km · {l.note}
              </span>
            </span>
          </div>
        ))}
        {MARKERS.filter((m) => !crafts.some((c) => Math.abs(altitudeToPercent(c) - altitudeToPercent(m.km)) < 3.5)).map((m) => (
          <span key={m.km} className="atmo__marker" data-hot={m.hot ?? false} style={{ bottom: `${altitudeToPercent(m.km)}%` }}>
            {m.label}
          </span>
        ))}
        <span className="atmo__craft atmo__craft--ship" style={{ bottom: `${altitudeToPercent(r.ship.altitude)}%` }}>
          {separated ? 'Starship' : 'Lanceur'} · {formatNumber(r.ship.altitude, r.ship.altitude < 10 ? 1 : 0)} km
        </span>
        {separated && (
          <span className="atmo__craft atmo__craft--booster" style={{ bottom: `${altitudeToPercent(r.booster.altitude)}%` }}>
            Propulseur · {formatNumber(r.booster.altitude, r.booster.altitude < 10 ? 1 : 0)} km
          </span>
        )}
      </div>
    </aside>
  );
}
