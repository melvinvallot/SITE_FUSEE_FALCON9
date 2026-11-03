import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { DESTINATIONS } from './data/planets';

// WebGL n'existe pas dans jsdom : la scène 3D est remplacée par un témoin.
vi.mock('./components/three/Scene', () => ({
  Scene: () => <div data-testid="scene" />,
}));

describe('Page des planètes', () => {
  beforeEach(() => window.history.replaceState(null, '', '/planetes.html'));

  it('liste les sept destinations avec leur durée estimée', async () => {
    render(<App />);
    expect(await screen.findByTestId('scene')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Destinations' });
    expect(within(list).getAllByRole('button')).toHaveLength(DESTINATIONS.length);
    expect(within(list).getByRole('button', { name: /Mars.*8,5.*mois/ })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: /Neptune.*30,6.*ans/ })).toBeInTheDocument();
  });

  it('ouvre la fiche de la planète choisie et met à jour l’adresse', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /^Jupiter/ }));
    const card = screen.getByRole('region', { name: 'Jupiter' });
    expect(within(card).getByText('2,7')).toBeInTheDocument();
    expect(within(card).getByText(/estimation/)).toBeInTheDocument();
    expect(within(card).getByRole('button', { name: 'Rejouer le voyage' })).toBeInTheDocument();
    expect(window.location.search).toBe('?planete=jupiter');
    await userEvent.click(within(card).getByRole('button', { name: 'Fermer la fiche' }));
    expect(screen.queryByRole('region', { name: 'Jupiter' })).not.toBeInTheDocument();
  });

  it('ouvre directement un voyage depuis l’adresse', () => {
    window.history.replaceState(null, '', '/planetes.html?planete=saturne');
    render(<App />);
    expect(screen.getByRole('region', { name: 'Saturne' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Saturne/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('explique la méthode de calcul et relie les autres pages', () => {
    render(<App />);
    expect(screen.getByText('Comment on calcule ?')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Planètes' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Starship' })).toHaveAttribute('href', './starship.html');
  });
});
