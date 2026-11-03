import { Button } from './Button';

interface HeroProps {
  title: string;
  lead: string;
  headingId: string;
  onStart: () => void;
}

export function Hero({ title, lead, headingId, onStart }: HeroProps) {
  return (
    <div className="hero">
      <h1 id={headingId} className="hero__title" aria-label={title}>
        {[...title].map((char, i) => (
          <span key={i} aria-hidden="true" style={{ animationDelay: `${120 + i * 55}ms` }}>
            {char === ' ' ? '\u00a0' : char}
          </span>
        ))}
      </h1>
      <p className="hero__lead">{lead}</p>
      <Button onClick={onStart}>Démonter le lanceur</Button>
    </div>
  );
}
