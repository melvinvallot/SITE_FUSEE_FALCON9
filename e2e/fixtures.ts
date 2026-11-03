import { test as base, expect, type Page } from '@playwright/test';

/**
 * Base commune à tous les tests :
 * - les polices Google sont remplacées par une feuille vide (pas de réseau, chargement rapide) ;
 * - toute erreur JavaScript ou de console fait échouer le test.
 */
export const test = base.extend<{ errors: string[] }>({
  errors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
      );
      page.on('pageerror', (e) => errors.push(`Erreur JavaScript : ${e.message}`));
      page.on('console', (msg) => {
        if (msg.type() === 'error') errors.push(`Console : ${msg.text()}`);
      });
      await use(errors);
      expect(errors, 'aucune erreur dans la page').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

/**
 * Vérifie que la scène 3D est bien dessinée : on prend une capture du
 * canevas et on compte les pixels qui ne sont pas noirs.
 */
export async function expectCanvasNotBlack(page: Page): Promise<void> {
  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await expect
    .poll(
      async () => {
        const png = (await canvas.screenshot({ timeout: 60_000 })).toString('base64');
        return page.evaluate(async (data) => {
          const img = new Image();
          img.src = `data:image/png;base64,${data}`;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = 160;
          c.height = 100;
          const ctx = c.getContext('2d')!;
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const px = ctx.getImageData(0, 0, c.width, c.height).data;
          let lit = 0;
          for (let i = 0; i < px.length; i += 4) if (px[i]! + px[i + 1]! + px[i + 2]! > 60) lit++;
          return lit / (c.width * c.height);
        }, png);
      },
      { message: 'la scène 3D ne doit pas être noire', timeout: 90_000, intervals: [2_000] },
    )
    .toBeGreaterThan(0.02);
}

/** Fait défiler jusqu'à une section, sans animation. */
export async function scrollToSection(page: Page, id: string): Promise<void> {
  await page.evaluate((sectionId) => {
    const el = document.getElementById(sectionId);
    if (!el) throw new Error(`section introuvable : ${sectionId}`);
    window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY);
  }, id);
}

/** Section actuellement marquée comme active. */
export const activeSection = (page: Page) => page.locator('main section[data-active="true"]');
