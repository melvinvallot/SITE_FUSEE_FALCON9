import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PARTS, PART_ORDER } from '../../data/parts';
import { scrollStore } from '../../lib/scrollStore';
import { Altimeter } from './Altimeter';
import { Button } from './Button';
import { Hero } from './Hero';
import { formatAltitude, PartDetails } from './PartDetails';
import { ProgressBar } from './ProgressBar';
import { Section } from './Section';
import { SpecList } from './SpecList';

describe('SpecList', () => {
  it('affiche chaque caractéristique', () => {
    render(<SpecList specs={[{ label: 'Hauteur', value: '70 m' }]} />);
    expect(screen.getByText('Hauteur')).toBeInTheDocument();
    expect(screen.getByText('70 m')).toBeInTheDocument();
  });
});

describe('PartDetails', () => {
  it('formate la hauteur de la pièce', () => {
    expect(formatAltitude({ from: 0, to: 3 })).toBe('Du sol à 3 m');
    expect(formatAltitude({ from: 57, to: 70 })).toBe('De 57 à 70 m');
  });

  it('présente la pièce avec un titre accessible', () => {
    render(<PartDetails part={PARTS.fairing} headingId="h" />);
    expect(screen.getByRole('heading', { name: 'Coiffe' })).toHaveAttribute('id', 'h');
    expect(screen.getByText('13,1 m')).toBeInTheDocument();
  });
});

describe('Section', () => {
  it("expose l'état actif et l'alignement", () => {
    render(
      <Section id="s" align="end" active labelledBy="t">
        <h2 id="t">Titre</h2>
      </Section>,
    );
    const region = screen.getByRole('region', { name: 'Titre' });
    expect(region).toHaveAttribute('data-active', 'true');
    expect(region).toHaveClass('section--end');
  });
});

describe('Button', () => {
  it('applique la variante et reste un bouton simple', () => {
    render(<Button variant="quiet">Revenir</Button>);
    const button = screen.getByRole('button', { name: 'Revenir' });
    expect(button).toHaveClass('button--quiet');
    expect(button).toHaveAttribute('type', 'button');
  });
});

describe('Hero', () => {
  it('lit le titre en entier et lance la visite', async () => {
    const onStart = vi.fn();
    render(<Hero title="FALCON 9" lead="Texte" headingId="h" onStart={onStart} />);
    expect(screen.getByRole('heading', { level: 1, name: 'FALCON 9' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Démonter le lanceur' }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});

describe('Altimeter', () => {
  const entries = PART_ORDER.map((id) => ({ part: PARTS[id], sectionId: `s-${id}` }));

  it('signale la pièce en cours', () => {
    render(<Altimeter entries={entries} activePart="engines" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Octaweb et neuf Merlin' })).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: 'Coiffe' })).not.toHaveAttribute('aria-current');
  });

  it('renvoie la section de la pièce choisie', async () => {
    const onSelect = vi.fn();
    render(<Altimeter entries={entries} activePart={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Deuxième étage' }));
    expect(onSelect).toHaveBeenCalledWith('s-secondStage');
  });
});

describe('ProgressBar', () => {
  it('suit la progression du défilement', () => {
    render(<ProgressBar />);
    act(() => scrollStore.set(0.42));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
    act(() => scrollStore.set(0));
  });
});
