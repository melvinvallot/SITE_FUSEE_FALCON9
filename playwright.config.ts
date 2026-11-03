import { defineConfig, devices } from '@playwright/test';

/**
 * Tests de bout en bout : le site est construit (`yarn build`), servi par
 * `vite preview`, puis parcouru dans un vrai navigateur (Chromium).
 *
 * Lancer : `yarn test:e2e`   (première fois : `yarn playwright install chromium`)
 */
const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  // La 3D est lourde quand il n'y a pas de carte graphique (serveur de CI) : on laisse du temps.
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 1280, height: 800 },
    locale: 'fr-FR',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  // Les tests de mise en page (responsive.spec.ts) passent sur téléphone et tablette, debout et couchés.
  projects: [
    {
      name: 'ordinateur',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: /responsive\.spec\.ts/,
    },
    { name: 'telephone', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
    { name: 'telephone-paysage', use: { ...devices['Pixel 7 landscape'] }, testMatch: /responsive\.spec\.ts/ },
    // Tablette de 820 × 1180 (taille d'un iPad Air), dans Chromium.
    {
      name: 'tablette',
      use: { ...devices['Galaxy Tab S4'], viewport: { width: 820, height: 1180 } },
      testMatch: /responsive\.spec\.ts/,
    },
    {
      name: 'tablette-paysage',
      use: { ...devices['Galaxy Tab S4 landscape'], viewport: { width: 1180, height: 820 } },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: {
    command: `yarn build && yarn preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
