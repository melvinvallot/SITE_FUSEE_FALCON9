import { DESTINATIONS } from '../src/planetes/data/planets';
import { test, expect, expectCanvasNotBlack } from './fixtures';

test.describe('Page Planètes', () => {
  test.beforeEach(async ({ page }) => {
    // Mouvement réduit : le voyage va directement à l'arrivée.
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('le système solaire se prépare puis s’affiche (pas d’écran noir)', async ({ page }) => {
    await page.goto('./planetes.html');
    await expect(page.locator('.planetes')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    await expect(page.locator('.loader__text')).toHaveText('Scène prête');
    await expectCanvasNotBlack(page);
  });

  test('la liste montre chaque planète avec la durée du trajet', async ({ page }) => {
    await page.goto('./planetes.html');
    const list = page.getByRole('list', { name: 'Destinations' });
    await expect(list.getByRole('button')).toHaveCount(DESTINATIONS.length);
    for (const p of DESTINATIONS) {
      const button = list.getByRole('button', { name: new RegExp(p.name) });
      await expect(button).toHaveAttribute('aria-pressed', 'false');
      await expect(button.locator('.dest__time')).not.toBeEmpty();
    }
  });

  test('chaque planète ouvre sa fiche de voyage, et l’adresse suit', async ({ page }) => {
    // 7 voyages de suite : sans carte graphique, c'est long.
    test.setTimeout(360_000);
    await page.goto('./planetes.html');
    const list = page.getByRole('list', { name: 'Destinations' });
    for (const p of DESTINATIONS) {
      const button = list.getByRole('button', { name: new RegExp(p.name) });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      const card = page.getByRole('region', { name: p.name, exact: true });
      await expect(card, p.name).toBeVisible();
      await expect(card.getByText(`Terre → ${p.name}`)).toBeVisible();
      await expect(card.getByText('Prochain départ possible')).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`planete=${p.id}`));
    }
  });

  test('fiche : « Rejouer », « Aller à l’arrivée » et fermeture', async ({ page }) => {
    await page.goto('./planetes.html?planete=mars');
    const card = page.getByRole('region', { name: 'Mars', exact: true });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: 'Aller à l’arrivée' }).click();
    await expect(page.locator('.hud')).toHaveAttribute('data-phase', 'arrived', { timeout: 60_000 });
    await expect(page.getByRole('progressbar', { name: 'Avancement du voyage' })).toBeVisible();

    await card.getByRole('button', { name: 'Rejouer le voyage' }).click();
    await expect(page.locator('.hud')).toBeAttached();

    await card.getByRole('button', { name: 'Fermer la fiche' }).click();
    await expect(card).toHaveCount(0);
    await expect(page).not.toHaveURL(/planete=/);
    await expect(page.locator('.planetes')).toHaveAttribute('data-mission', 'false');
  });

  test('l’encadré « Comment on calcule ? » s’ouvre', async ({ page }) => {
    await page.goto('./planetes.html');
    await page.getByText('Comment on calcule ?').click();
    await expect(page.getByText(/transfert de Hohmann/)).toBeVisible();
  });
});
