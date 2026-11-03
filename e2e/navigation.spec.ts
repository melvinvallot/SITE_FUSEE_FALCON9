import { test, expect } from './fixtures';

/** Le menu commun en haut de chaque page. */
const PAGES = [
  { path: './', name: 'Falcon 9', title: /Falcon 9/i },
  { path: './starship.html?auto=0', name: 'Starship', title: /Starship/i },
];

for (const p of PAGES) {
  test(`${p.name} : la page s'ouvre et le menu indique la page en cours`, async ({ page }) => {
    await page.goto(p.path);
    await expect(page).toHaveTitle(p.title);
    const nav = page.getByRole('navigation', { name: 'Fusées' });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('link')).toHaveText(['Falcon 9', 'Starship']);
    await expect(nav.getByRole('link', { name: p.name })).toHaveAttribute('aria-current', 'page');
  });
}

test('le menu permet de passer de Falcon 9 à Starship et inversement', async ({ page }) => {
  await page.goto('./');
  const nav = page.getByRole('navigation', { name: 'Fusées' });
  await nav.getByRole('link', { name: 'Starship' }).click();
  await expect(page).toHaveURL(/starship\.html/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/starship/i);

  await page.getByRole('navigation', { name: 'Fusées' }).getByRole('link', { name: 'Falcon 9' }).click();
  await expect(page).not.toHaveURL(/starship\.html/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveAccessibleName(/falcon 9/i);
});
