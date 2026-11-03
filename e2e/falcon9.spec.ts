import { SECTIONS } from '../src/data/sections';
import { PART_ORDER, PARTS } from '../src/data/parts';
import { test, expect, expectCanvasNotBlack, scrollToSection, activeSection } from './fixtures';

test.describe('Page Falcon 9', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('./');
  });

  test('la scène 3D s’affiche (pas d’écran noir)', async ({ page }) => {
    await expectCanvasNotBlack(page);
  });

  test('toutes les sections sont présentes avec leur titre', async ({ page }) => {
    await expect(page.locator('main section')).toHaveCount(SECTIONS.length);
    for (const s of SECTIONS) {
      const section = page.locator(`section#${s.id}`);
      await expect(section).toHaveCount(1);
      await expect(section.getByRole('heading').first()).toBeAttached();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName('FALCON 9');
  });

  test('chaque étape du défilement devient active à son tour', async ({ page }) => {
    for (const s of SECTIONS) {
      await scrollToSection(page, s.id);
      await expect(activeSection(page), `section ${s.id}`).toHaveAttribute('id', s.id);
    }
    // La barre de progression (visible sur téléphone) arrive au bout.
    await expect(page.locator('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '100');
  });

  test('le bouton « Démonter le lanceur » mène à l’anatomie', async ({ page }) => {
    await page.getByRole('button', { name: 'Démonter le lanceur' }).click();
    await expect(activeSection(page)).toHaveAttribute('id', 'anatomie');
  });

  test('l’échelle de hauteur mène à la fiche de chaque pièce', async ({ page }) => {
    const altimeter = page.getByRole('navigation', { name: 'Pièces du lanceur, par hauteur' });
    for (const id of PART_ORDER) {
      const section = SECTIONS.find((s) => s.partId === id)!;
      await altimeter.getByRole('button', { name: PARTS[id].name, exact: true }).click();
      await expect(activeSection(page), PARTS[id].name).toHaveAttribute('id', section.id);
      await expect(altimeter.getByRole('button', { name: PARTS[id].name, exact: true })).toHaveAttribute(
        'aria-current',
        'true',
      );
    }
  });

  test('fin de page : « Revenir au début » et lien vers Starship', async ({ page }) => {
    const last = SECTIONS[SECTIONS.length - 1]!;
    await scrollToSection(page, last.id);
    const end = page.locator(`section#${last.id}`);
    await expect(end.getByRole('link', { name: 'Découvrir Starship' })).toHaveAttribute('href', './starship.html');
    await end.getByRole('button', { name: 'Revenir au début' }).click();
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[0]!.id);
  });
});
