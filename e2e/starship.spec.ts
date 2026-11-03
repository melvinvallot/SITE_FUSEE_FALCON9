import { CHAPTERS, SECTIONS } from '../src/starship/data/sections';
import { GAUGE_ITEMS } from '../src/starship/data/gauge';
import { test, expect, expectCanvasNotBlack, scrollToSection, activeSection } from './fixtures';

/**
 * `?auto=0` : pas de mode vidéo automatique au bout de 10 s pendant les tests.
 * `fx=0` : sans halo lumineux, la 3D est plus légère pour les tests sans carte graphique.
 */
const URL = './starship.html?auto=0&fx=0';
const director = (page: import('@playwright/test').Page) => page.locator('.director');

test.describe('Page Starship', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(URL);
  });

  test('la scène se prépare puis s’affiche (pas d’écran noir)', async ({ page }) => {
    await page.goto('./starship.html?auto=0'); // avec tous les effets
    await expect(page.locator('.starship')).toHaveAttribute('data-ready', 'true', { timeout: 60_000 });
    await expect(page.locator('.loader')).toHaveAttribute('data-done', 'true');
    await expect(page.locator('.loader__text')).toHaveText('Scène prête');
    await expectCanvasNotBlack(page);
  });

  test('toutes les sections sont présentes avec leur titre', async ({ page }) => {
    await expect(page.locator('main section')).toHaveCount(SECTIONS.length);
    for (const s of SECTIONS) {
      const section = page.locator(`section#${s.id}`);
      await expect(section).toHaveCount(1);
      await expect(section.getByRole('heading').first()).toBeAttached();
    }
    await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/starship/i);
  });

  test('chaque étape du défilement devient active à son tour', async ({ page }) => {
    for (const s of SECTIONS) {
      await scrollToSection(page, s.id);
      await expect(activeSection(page), `section ${s.id}`).toHaveAttribute('id', s.id);
      // La télémétrie n'apparaît que pendant le vol.
      await expect(page.locator('.telemetry')).toHaveAttribute('data-visible', String(!!s.telemetry));
    }
  });

  test('flèches du clavier : étape suivante puis précédente', async ({ page }) => {
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[0]!.id);
    for (let i = 1; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[i]!.id);
    }
    await page.keyboard.press('ArrowUp');
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[2]!.id);
    await page.keyboard.press('ArrowRight');
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[3]!.id);
    await page.keyboard.press('ArrowLeft');
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[2]!.id);
  });

  test('boutons de l’accueil : « Explorer Starship » et « Voir le lancement »', async ({ page }) => {
    await page.getByRole('button', { name: 'Explorer Starship' }).click();
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[1]!.id);

    await scrollToSection(page, SECTIONS[0]!.id);
    await page.getByRole('button', { name: 'Voir le lancement' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'launch');
    await expect(activeSection(page)).toHaveAttribute('id', 'pas-de-tir');
    await page.getByRole('button', { name: 'Arrêter' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'idle');
  });

  test('sommaire des chapitres : chaque chapitre mène à sa première section', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Chapitres' });
    for (const c of CHAPTERS) {
      const first = SECTIONS.find((s) => s.chapter === c.id)!;
      const button = nav.getByRole('button', { name: c.title });
      await button.click();
      await expect(activeSection(page), c.title).toHaveAttribute('id', first.id);
      await expect(button).toHaveAttribute('aria-current', 'step');
    }
  });

  test('jauge de hauteur : chaque élément mène à sa fiche', async ({ page }) => {
    const gauge = page.getByRole('navigation', { name: 'Éléments du lanceur, par hauteur' });
    for (const item of GAUGE_ITEMS) {
      await gauge.getByRole('button', { name: item.name, exact: true }).click();
      await expect(activeSection(page), item.name).toHaveAttribute('id', item.sectionId);
    }
  });

  test('bouton du son : active puis coupe le son', async ({ page }) => {
    const sound = director(page).getByRole('button', { name: /Son/ });
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'true');
    await expect(sound).toHaveText(/Son activé/);
    await sound.click();
    await expect(sound).toHaveAttribute('aria-pressed', 'false');
    await expect(sound).toHaveText(/Son coupé/);
  });

  test('bouton « Mode vidéo » : la page défile seule, « Arrêter » rend la main', async ({ page }) => {
    await director(page).getByRole('button', { name: 'Mode vidéo' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'tour');
    await expect(page.getByText('Mode vidéo · faites défiler pour reprendre la main')).toBeVisible();
    // Au bout de quelques secondes, on est passé à l'étape suivante.
    await expect(activeSection(page)).not.toHaveAttribute('id', SECTIONS[0]!.id, { timeout: 30_000 });
    await page.getByRole('button', { name: 'Arrêter' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'idle');
  });

  test('séquence de lancement : compte à rebours, sous-titres, puis Échap l’arrête', async ({ page }) => {
    await director(page).getByRole('button', { name: 'Lancement' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'launch');
    await expect(page.getByText('Séquence de lancement')).toBeVisible();
    await expect(activeSection(page)).toHaveAttribute('id', 'pas-de-tir');
    await expect(page.locator('.caption')).toBeVisible();
    // Le décompte démarre après les deux annonces (environ 7 s).
    const timer = page.getByRole('timer');
    await expect(timer).toContainText(/T−\d\d/, { timeout: 40_000 });
    await page.keyboard.press('Escape');
    await expect(director(page)).toHaveAttribute('data-mode', 'idle');
    await expect(timer).toHaveCount(0);
  });

  test('bouton « Lancer le compte à rebours » de la section pas de tir', async ({ page }) => {
    await scrollToSection(page, 'pas-de-tir');
    await page.locator('section#pas-de-tir').getByRole('button', { name: 'Lancer le compte à rebours' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'launch');
    await page.getByRole('button', { name: 'Arrêter' }).click();
    await expect(director(page)).toHaveAttribute('data-mode', 'idle');
  });

  test('fin de page : « Revenir au début » et lien vers Falcon 9', async ({ page }) => {
    const last = SECTIONS[SECTIONS.length - 1]!;
    await scrollToSection(page, last.id);
    const end = page.locator(`section#${last.id}`);
    await expect(end.getByRole('link', { name: 'Découvrir Falcon 9' })).toHaveAttribute('href', './');
    await end.getByRole('button', { name: 'Revenir au début' }).click();
    await expect(activeSection(page)).toHaveAttribute('id', SECTIONS[0]!.id);
  });
});

test('Starship : le mode vidéo démarre seul après 10 s sans action', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./starship.html');
  await expect(page.locator('.director')).toHaveAttribute('data-mode', 'idle');
  await expect(page.locator('.director')).toHaveAttribute('data-mode', 'tour', { timeout: 40_000 });
  await page.keyboard.press('Escape');
  await expect(page.locator('.director')).toHaveAttribute('data-mode', 'idle');
});
