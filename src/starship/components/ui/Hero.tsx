import { Button } from '../../../components/ui/Button';
import type { Stat } from '../../types';
import { StatGrid } from './StatCounter';

interface HeroProps {
  title: string;
  lead: string;
  headingId: string;
  stats?: readonly Stat[];
  reducedMotion: boolean;
  onStart: () => void;
  /** Lance la séquence de lancement (compte à rebours, sons et voix). */
  onLaunch?: () => void;
}

/** Écran d'accueil : titre animé lettre par lettre, chiffres clés et invitation à défiler. */
export function Hero({ title, lead, headingId, stats, reducedMotion, onStart, onLaunch }: HeroProps) {
  return (
    <div className="hero">
      <p className="hero__kicker reveal" style={{ ['--i' as string]: 0 }}>
        Système de lancement entièrement réutilisable
      </p>
      <h1 id={headingId} className="hero__title" aria-label={title}>
        {[...title].map((char, i) => (
          <span key={i} aria-hidden="true" style={{ animationDelay: `${150 + i * 70}ms` }}>
            {char}
          </span>
        ))}
      </h1>
      <p className="hero__lead reveal" style={{ ['--i' as string]: 2 }}>
        {lead}
      </p>
      {stats && (
        <div className="reveal" style={{ ['--i' as string]: 3 }}>
          <StatGrid stats={stats} active reducedMotion={reducedMotion} />
        </div>
      )}
      <div className="hero__actions reveal" style={{ ['--i' as string]: 4 }}>
        <Button onClick={onStart}>Explorer Starship</Button>
        {onLaunch && (
          <Button variant="quiet" onClick={onLaunch}>
            Voir le lancement
          </Button>
        )}
        <span className="hero__hint" aria-hidden="true">
          Faites défiler
        </span>
      </div>
    </div>
  );
}
