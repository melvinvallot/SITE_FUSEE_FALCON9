export type SiteId = 'falcon9' | 'starship' | 'planetes';

const LINKS: { id: SiteId; label: string; href: string }[] = [
  { id: 'falcon9', label: 'Falcon 9', href: './' },
  { id: 'starship', label: 'Starship', href: './starship.html' },
  { id: 'planetes', label: 'Planètes', href: './planetes.html' },
];

interface SiteNavProps {
  current: SiteId;
}

/** Barre commune aux pages du site : Falcon 9, Starship et les voyages vers les planètes. */
export function SiteNav({ current }: SiteNavProps) {
  return (
    <nav className="site-nav" aria-label="Fusées">
      <span className="site-nav__brand">Fusées en 3D</span>
      <ul className="site-nav__list">
        {LINKS.map((l) => (
          <li key={l.id}>
            <a className="site-nav__link" href={l.href} aria-current={l.id === current ? 'page' : undefined}>
              {l.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
