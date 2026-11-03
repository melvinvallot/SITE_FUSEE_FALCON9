import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { SECTIONS } from './data/sections';

// WebGL n'existe pas dans jsdom : la scène 3D est remplacée par un témoin.
vi.mock('./components/three/Scene', () => ({
  Scene: () => <div data-testid="scene" />,
}));

describe('App', () => {
  it('affiche une section par étape du parcours', async () => {
    render(<App />);
    expect(await screen.findByTestId('scene')).toBeInTheDocument();
    expect(screen.getAllByRole('region')).toHaveLength(SECTIONS.length);
    expect(screen.getByRole('heading', { level: 1, name: 'FALCON 9' })).toBeInTheDocument();
  });

  it("fait défiler jusqu'à la vue éclatée depuis l'accueil", async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Démonter le lanceur' }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it("propose une navigation par pièce", () => {
    render(<App />);
    const nav = screen.getByRole('navigation', { name: 'Pièces du lanceur, par hauteur' });
    expect(nav.querySelectorAll('button')).toHaveLength(6);
  });
});
