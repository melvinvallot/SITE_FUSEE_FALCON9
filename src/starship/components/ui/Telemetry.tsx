import { scrollStore } from '../../../lib/scrollStore';
import { useStoreValue } from '../../../hooks/useStoreValue';
import { formatNumber } from '../../lib/format';
import { formatMissionTime, readTelemetry, type TelemetryPoint } from '../../lib/telemetry';

interface TelemetryProps {
  points: readonly TelemetryPoint[];
  visible: boolean;
}

interface ReadoutProps {
  name: string;
  speed: number;
  altitude: number;
  maxSpeed: number;
  maxAltitude: number;
}

function Readout({ name, speed, altitude, maxSpeed, maxAltitude }: ReadoutProps) {
  return (
    <div className="telemetry__stage">
      <p className="telemetry__name">{name}</p>
      <dl className="telemetry__values">
        <div>
          <dt>Vitesse</dt>
          <dd>
            {formatNumber(Math.round(speed / 10) * 10)} <span>km/h</span>
          </dd>
          <span className="telemetry__meter" style={{ ['--v' as string]: speed / maxSpeed }} aria-hidden="true" />
        </div>
        <div>
          <dt>Altitude</dt>
          <dd>
            {formatNumber(altitude, altitude < 10 ? 1 : 0)} <span>km</span>
          </dd>
          <span className="telemetry__meter" style={{ ['--v' as string]: altitude / maxAltitude }} aria-hidden="true" />
        </div>
      </dl>
    </div>
  );
}

/**
 * Bandeau de télémétrie façon retransmission : chronomètre, vitesse et
 * altitude des deux étages, calculés à partir du défilement.
 */
export function Telemetry({ points, visible }: TelemetryProps) {
  const progress = useStoreValue(scrollStore);
  const r = readTelemetry(points, progress);
  const maxSpeed = Math.max(...points.map((p) => Math.max(p.ship.speed, p.booster.speed)));
  const maxAltitude = Math.max(...points.map((p) => Math.max(p.ship.altitude, p.booster.altitude)));
  return (
    <aside className="telemetry" data-visible={visible} aria-hidden={!visible} aria-label="Télémétrie du vol (valeurs approximatives)">
      <Readout name="Super Heavy" speed={r.booster.speed} altitude={r.booster.altitude} maxSpeed={maxSpeed} maxAltitude={maxAltitude} />
      <p className="telemetry__clock">{formatMissionTime(r.time)}</p>
      <Readout name="Starship" speed={r.ship.speed} altitude={r.ship.altitude} maxSpeed={maxSpeed} maxAltitude={maxAltitude} />
    </aside>
  );
}
