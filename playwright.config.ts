import { defineConfig, devices } from '@playwright/test';

/**
 * Configuration Playwright pour ECC Panini
 * 
 * Lance le serveur Next.js de développement avant les tests
 * et définit les alias d'import (notamment @public pour les assets).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,

  // Configuration du serveur Next.js de développement
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Les alias d'importation sont résolus via le tsconfig.json racine
    // qui définit déjà @/* -> src/* et @public/* -> public/*
  },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  // Projets : desktop et mobile
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 14 Pro Max'],
        viewport: { width: 390, height: 844 },
      },
    },
  ],
});
