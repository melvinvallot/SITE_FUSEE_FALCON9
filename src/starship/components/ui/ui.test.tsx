import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { scrollStore } from '../../../lib/scrollStore';
import { SiteNav } from '../../../components/ui/SiteNav';
import { CHAPTERS, SECTIONS } from '../../data/sections';
import { GAUGE_ITEMS, GAUGE_TOTAL } from '../../data/gauge';
import { TELEMETRY } from '../../data/telemetry';
import { useCountUp } from '../../hooks/useCountUp';
import { ChapterNav } from './ChapterNav';
import { CompareBars } from './CompareBars';
import { Hero } from './Hero';
import { SectionContent } from './SectionContent';
import { StackGauge } from './StackGauge';
import { StatCounter } from './StatCounter';
import { Telemetry } from './Telemetry';
import { DeployPicker } from './DeployPicker';
import { DEPLOYMENTS } from '../../data/deployments';
import { deployStore } from '../../lib/deploy';

const nbsp = (s: string | null) => (s ?? '').replace(/\s/g, ' ');

describe('StatCounter', () => {
  it('annonce la valeur finale, préfixe et unité compris', () => {
    render(
      <dl>
        <StatCounter stat={{ label: 'Poussée', value: 8240, unit: 'tf', prefix: '+ de' }} active reducedMotion />
      </dl>,
    );
    expect(nbsp(screen.getByLabelText(/8.240/).getAttribute('aria-label'))).toBe('+ de 8 240 tf');
    expect(screen.getByText('Poussée')).toBeInTheDocument();
  });
});

describe('useCountUp', () => {
  it('affiche directement la valeur si les animations sont réduites', () => {
    const { result } = renderHook(() => useCountUp(124, false, true));
    expect(result.current).toBe(124);
  });

  it('part de zéro tant que la section n’est pas affichée', () => {
    const { result } = renderHook(() => useCountUp(124, false, false));
    expect(result.current).toBe(0);
  });
});

describe('CompareBars', () => {
  it('donne les deux valeurs de chaque ligne, avec leur fusée', () => {
    render(<CompareBars rows={[{ label: 'Hauteur', unit: 'm', starship: 124, falcon: 70 }]} />);
    expect(screen.getByText('Hauteur')).toBeInTheDocument();
    expect(screen.getByText('124 m', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Falcon 9 :')).toBeInTheDocument();
  });
});

describe('ChapterNav', () => {
  it('signale le chapitre en cours et mène au début d’un chapitre', async () => {
    const onSelect = vi.fn();
    const active = SECTIONS.findIndex((s) => s.id === 'raptor');
    render(<ChapterNav chapters={CHAPTERS} sections={SECTIONS} active={active} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: /Super Heavy/ })).toHaveAttribute('aria-current', 'step');
    await userEvent.click(screen.getByRole('button', { name: /Le vol/ }));
    expect(onSelect).toHaveBeenCalledWith('pas-de-tir');
  });
});

describe('StackGauge', () => {
  it('surligne l’élément présenté et renvoie à sa fiche', async () => {
    const onSelect = vi.fn();
    render(<StackGauge items={GAUGE_ITEMS} total={GAUGE_TOTAL} activeSection="anneau" onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: 'Anneau de séparation' })).toHaveAttribute('aria-current', 'true');
    await userEvent.click(screen.getByRole('button', { name: '33 moteurs Raptor' }));
    expect(onSelect).toHaveBeenCalledWith('moteurs-propulseur');
  });
});

describe('Telemetry', () => {
  it('suit le défilement pendant le vol', () => {
    render(<Telemetry points={TELEMETRY} visible />);
    act(() => scrollStore.set(TELEMETRY[2]!.at));
    expect(screen.getByText('T+00:02:42')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveAttribute('data-visible', 'true');
    act(() => scrollStore.set(0));
  });

  it('se cache hors des sections de vol', () => {
    const { container } = render(<Telemetry points={TELEMETRY} visible={false} />);
    expect(container.querySelector('.telemetry')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('SectionContent', () => {
  it('présente le titre, le texte et la fiche technique', () => {
    const section = SECTIONS.find((s) => s.id === 'nez')!;
    render(<SectionContent section={section} headingId="h" active reducedMotion index="05 / 22" />);
    expect(screen.getByRole('heading', { level: 2, name: 'Nez et volets avant' })).toHaveAttribute('id', 'h');
    expect(screen.getByText('Moteurs électriques')).toBeInTheDocument();
    expect(screen.getByText('05 / 22')).toBeInTheDocument();
  });
});

describe('Hero', () => {
  it('lit le titre en entier et lance la visite', async () => {
    const onStart = vi.fn();
    render(<Hero title="STARSHIP" lead="Texte" headingId="h" reducedMotion onStart={onStart} />);
    expect(screen.getByRole('heading', { level: 1, name: 'STARSHIP' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Explorer Starship' }));
    expect(onStart).toHaveBeenCalledOnce();
  });
});

describe('SiteNav', () => {
  it('relie les trois pages et marque la page courante', () => {
    render(<SiteNav current="starship" />);
    expect(screen.getByRole('link', { name: 'Starship' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Falcon 9' })).toHaveAttribute('href', './');
    expect(screen.getByRole('link', { name: 'Planètes' })).toHaveAttribute('href', './planetes.html');
  });
});

describe('DeployPicker', () => {
  it('propose chaque vol et relance le largage du vol choisi', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<DeployPicker deployments={DEPLOYMENTS} active={false} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(DEPLOYMENTS.length);
    expect(radios[DEPLOYMENTS.length - 1]).toHaveAttribute('aria-checked', 'true');

    // En arrivant sur la section, le largage démarre.
    const run = deployStore.get().run;
    rerender(<DeployPicker deployments={DEPLOYMENTS} active />);
    expect(deployStore.get().run).toBe(run + 1);

    await user.click(screen.getByRole('radio', { name: /Vol 10/ }));
    expect(screen.getByRole('radio', { name: /Vol 10/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByText('8 simulateurs de satellites Starlink')).toBeInTheDocument();

    // Flèche droite : vol suivant, sans changer d'étape de la page.
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: /Vol 11/ })).toHaveAttribute('aria-checked', 'true');

    const before = deployStore.get().run;
    await user.click(screen.getByRole('button', { name: 'Rejouer le largage' }));
    expect(deployStore.get()).toEqual({ index: 1, run: before + 1 });
  });
});
