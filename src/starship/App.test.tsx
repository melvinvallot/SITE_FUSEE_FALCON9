import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import App from './App';
import { directorStore, stop } from './lib/director';
import { SECTIONS } from './data/sections';

// WebGL n'existe pas dans jsdom : la scène 3D est remplacée par un témoin.
vi.mock('./components/three/Scene', () => ({
  Scene: () => <div data-testid="scene" />,
}));

describe('App Starship', () => {
  it('affiche une section par étape du parcours', async () => {
    render(<App />);
    expect(await screen.findByTestId('scene')).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(SECTIONS.length);
    expect(screen.getByRole('heading', { level: 1, name: 'STARSHIP' })).toBeInTheDocument();
  });

  it('propose les chapitres, la jauge de hauteur et le lien vers Falcon 9', () => {
    render(<App />);
    expect(screen.getByRole('navigation', { name: 'Chapitres' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Éléments du lanceur, par hauteur' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Falcon 9/ }).length).toBeGreaterThan(0);
  });

  it('lance la visite depuis l’accueil', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Explorer Starship' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('propose la séquence de lancement et le bouton du son', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Voir le lancement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Lancer le compte à rebours' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Activer le son|Son coupé/ }));
    expect(directorStore.get().sound).toBe(true);
    act(() => stop());
  });

  it('passe à l’étape suivante avec la flèche du bas', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    render(<App />);
    await userEvent.keyboard('{ArrowDown}');
    await act(async () => {
      await new Promise((r) => setTimeout(r, 1300));
    });
    expect(scrollTo).toHaveBeenCalled();
    scrollTo.mockRestore();
  });
});
