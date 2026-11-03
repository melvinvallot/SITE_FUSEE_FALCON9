import { test, expect } from './fixtures';

/** Sur téléphone : pas de défilement horizontal, menu et texte lisibles. */
for (const path of ['./', './starship.html?auto=0', './planetes.html']) {
  test(`téléphone : ${path} tient dans la largeur de l’écran`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(path);
    await expect(page.getByRole('navigation', { name: 'Fusées' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, 'aucun défilement horizontal').toBeLessThanOrEqual(1);
  });
}
