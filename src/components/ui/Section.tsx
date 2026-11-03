import type { ReactNode } from 'react';
import type { Align } from '../../types';

interface SectionProps {
  id: string;
  align: Align;
  active: boolean;
  labelledBy?: string;
  className?: string;
  children: ReactNode;
}

/** Bloc plein écran dont le texte se place d'un côté de la fusée. */
export function Section({ id, align, active, labelledBy, className, children }: SectionProps) {
  const classes = ['section', `section--${align}`, className].filter(Boolean).join(' ');
  return (
    <section id={id} className={classes} data-active={active} aria-labelledby={labelledBy}>
      <div className="section__body">{children}</div>
    </section>
  );
}
