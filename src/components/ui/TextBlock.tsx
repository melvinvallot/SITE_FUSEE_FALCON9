import type { ReactNode } from 'react';

interface TextBlockProps {
  title: string;
  lead: string;
  headingId: string;
  children?: ReactNode;
}

export function TextBlock({ title, lead, headingId, children }: TextBlockProps) {
  return (
    <div className="text-block">
      <h2 id={headingId} className="text-block__title">
        {title}
      </h2>
      <p className="text-block__lead">{lead}</p>
      {children}
    </div>
  );
}
