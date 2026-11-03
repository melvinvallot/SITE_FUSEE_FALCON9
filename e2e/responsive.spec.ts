import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Téléphones et tablettes, debout et couchés (voir les projets dans
 * playwright.config.ts). On vérifie la mise en page, sans attendre la 3D.
 */
const PAGES = [
  { path: './', name: 'Falcon 9' },
  { path: './starship.html?auto=0&fx=0', name: 'Starship' },
  { path: './planetes.html?fx=0', name: 'Planètes' },
];

/** Écran bas et large : téléphone couché. */
const isLandscapePhone = (page: Page) => {
  const v = page.viewportSize()!;
  return v.height <= 520 && v.width > v.height;
};

/** Mise en page empilée de la page Planètes : téléphone, ou tablette debout. */
const isStacked = (page: Page) => {
  const v = page.viewportSize()!;
  return v.width <= 760 || (v.width <= 1100 && v.height > v.width);
};

async function expectInsideViewport(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).first().boundingBox();
  const { width } = page.viewportSize()!;
  expect(box, `${selector} affiché`).not.toBeNull();
  expect(box!.x, `${selector} ne déborde pas à gauche`).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width, `${selector} ne déborde pas à droite`).toBeLessThanOrEqual(width + 1);
}

for (const p of PAGES) {
  test(`${p.name} : la page tient dans l’écran, menu sur une ligne`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(p.path);
    const nav = page.getByRole('navigation', { name: 'Fusées' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Rien ne dépasse : sinon le téléphone dézoome toute la page et le texte devient minuscule.
    const sizes = await page.evaluate(() => ({
      inner: window.innerWidth,
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));
    expect(sizes.inner, 'la page n’est pas dézoomée').toBe(sizes.client);
    expect(sizes.scroll - sizes.inner, 'aucun défilement horizontal').toBeLessThanOrEqual(1);

    // Les trois liens du menu restent sur une seule ligne, dans l'écran.
    const links = nav.getByRole('link');
    await expect(links).toHaveCount(3);
    const boxes = await Promise.all([0, 1, 2].map((i) => links.nth(i).boundingBox()));
    for (const b of boxes) {
      expect(b!.height, 'lien du menu sur une ligne').toBeLessThan(44);
      expect(Math.abs(b!.y - boxes[0]!.y), 'liens alignés').toBeLessThan(2);
    }
    await expectInsideViewport(page, '.site-nav__list');
    await expectInsideViewport(page, 'h1');
  });
}

test('Falcon 9 : le titre, le texte et le bouton de l’accueil tiennent dans l’écran', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  const button = page.getByRole('button', { name: 'Démonter le lanceur' });
  await expect(button).toBeVisible();
  const box = (await button.boundingBox())!;
  expect(box.y + box.height, 'bouton visible sans défiler').toBeLessThanOrEqual(page.viewportSize()!.height);
  await expectInsideViewport(page, '.hero__title');
  if (isLandscapePhone(page)) await expect(page.locator('.altimeter')).toBeHidden();
});

test('Starship : boutons tactiles pour passer d’une étape à l’autre', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./starship.html?auto=0&fx=0');
  await expect(page.locator('.director__hint'), 'pas d’aide « flèches du clavier » sur écran tactile').toHaveCount(0);
  const next = page.getByRole('button', { name: 'Étape suivante' });
  await expect(next).toBeVisible();
  await expectInsideViewport(page, '.director');

  await next.click();
  await expect.poll(() => page.evaluate(() => window.scrollY), { message: 'la page passe à l’étape suivante' }).toBeGreaterThan(50);
  const y = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Étape précédente' }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(y);
});

test('Starship : le texte de chaque étape reste lisible dans la largeur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./starship.html?auto=0&fx=0');
  const { width } = page.viewportSize()!;
  const overflowing = await page.evaluate((w) => {
    return [...document.querySelectorAll('main .section__body')]
      .map((el) => el.getBoundingClientRect())
      .filter((b) => b.left < -1 || b.right > w + 1).length;
  }, width);
  expect(overflowing, 'aucun bloc de texte coupé sur le côté').toBe(0);
  if (isLandscapePhone(page)) {
    await expect(page.locator('.gauge')).toBeHidden();
    await expect(page.locator('.chapters')).toBeHidden();
  }
});

test('Planètes : choisir une planète montre le voyage sans le cacher', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./planetes.html?fx=0');
  await page.getByRole('button', { name: /Mars/ }).first().click();
  const card = page.locator('.card');
  await expect(card).toBeVisible();
  await expectInsideViewport(page, '.card');

  if (isStacked(page)) {
    // La fiche du voyage passe avant la liste des planètes, et on remonte la voir.
    const [cardBox, panelBox] = await Promise.all([card.boundingBox(), page.locator('.panel').boundingBox()]);
    expect(cardBox!.y).toBeLessThan(panelBox!.y);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(5);
  } else if (isLandscapePhone(page)) {
    // Écran trop bas pour tout afficher : la fiche remplace la liste.
    await expect(page.locator('.panel')).toBeHidden();
  }
});

test('Planètes : l’aide parle de toucher et de pincer, pas de souris', async ({ page }) => {
  await page.goto('./planetes.html?fx=0');
  await expect(page.locator('.hint')).toHaveText(/pincer pour zoomer/);
});
