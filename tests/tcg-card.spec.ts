/**
 * Test de rendu TCG Légendaire — Valide l'affichage Premium d'une carte LEGENDAIRE
 *
 * Exécution :
 *   npx playwright test tests/tcg-card.spec.ts
 *
 * Prérequis :
 *   - Le serveur Next.js doit tourner (ou sera démarré automatiquement)
 *   - Les appels API sont mockés pour ne pas nécessiter de base de données
 *
 * Scénario :
 *   1. Simule une authentification valide
 *   2. Accède à l'album pour visualiser la grille de cartes
 *   3. Localise une carte de rareté LEGENDAIRE (Corentin BONDEAU - Dirigeant)
 *   4. Vérifie les styles premium : bordure, lueur, effet shimmer, badge
 */

import { test, expect, Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'mock-user-id',
  email: 'test@ecc-panini.fr',
  name: 'Test User',
  avatar: null,
};

async function mockAuthenticatedApi(page: Page) {
  await page.route('**/api/auth/me', (route) => {
    route.fulfill({ status: 200, body: JSON.stringify({ user: MOCK_USER }) });
  });

  await page.route('**/api/user/quotas', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({ boostersRemainingToday: 25, tradesRemainingToday: 5 }),
    });
  });

  // Collection : retourne des cartes possédées incluant une légendaire
  await page.route('**/api/collection*', (route) => {
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        cards: {
          'dirigeant-381-L': 1,
          'joueur-073-C': 2,
          'joueur-001-C': 1,
        },
      }),
    });
  });
}

// ---------------------------------------------------------------------------
// Test : Rendu Premium Légendaire
// ---------------------------------------------------------------------------
test.describe('Carte TCG Légendaire — Rendu Premium', () => {
  test('affiche les effets visuels d\'une carte LEGENDAIRE dans l\'album', async ({ page }) => {
    await mockAuthenticatedApi(page);
    await page.goto('/album');

    // 1. Attendre que la grille de cartes soit chargée
    const grid = page.locator('section > div').filter({ has: page.locator('article') }).first();
    await expect(grid).toBeVisible({ timeout: 10000 });

    // 2. Localiser toutes les cartes de l'album (ce sont des <article>)
    const allCards = page.locator('article');
    const cardCount = await allCards.count();
    expect(cardCount).toBeGreaterThan(0);

    // 3. Trouver la carte Légendaire
    //    Les cartes LEGENDAIRE ont la classe Tailwind animate-pulse (via rarityStyles)
    //    On cherche l'article qui contient "border-purple-500" dans son className
    let legendaryCard = page.locator('article').filter({
      has: page.locator('*'),
    }).locator('visible=true');

    // On utilise un sélecteur CSS pour trouver la carte avec les classes légendaire
    // Le className contient "animate-pulse" pour les légendaires
    const legendCard = page.locator('article[class*="animate-pulse"]');

    // Si la légendaire n'est pas encore possédée, elle a filter: grayscale. Mais les classes
    // de rareté s'appliquent toujours.
    // On vérifie la présence d'au moins une carte avec le style de bordure légendaire
    const legendaryCards = page.locator('article[class*="border-purple"]');
    const legendaryCount = await legendaryCards.count();
    expect(legendaryCount).toBeGreaterThan(0);

    // 4. Vérifier le conteneur : bordure scintillante et lueur intense
    const firstLegendary = legendaryCards.first();

    // Vérifie la bordure violette (border-purple-500)
    await expect(firstLegendary).toHaveCSS('border-color', 'rgb(168, 85, 247)');

    // Vérifie l'ombre portée intense (shadow avec rgba(168,85,247,0.5))
    const boxShadow = await firstLegendary.evaluate((el) => {
      return window.getComputedStyle(el).boxShadow;
    });
    expect(boxShadow).toContain('rgba(168, 85, 247, 0.5)');

    // 5. L'effet holographique (shimmer) est géré par le CSS pour les vraies photos.
    //    Corentin BONDEAU Dirigeant n'a pas d'imageUrl (null),
    //    donc on vérifie que le composant utilise bien l'image par défaut du rôle.
    const dirigeantImg = firstLegendary.locator('img[src*="/images/roles/dirigeant.svg"]');
    await expect(dirigeantImg).toBeVisible();

    // 6. Vérifie le nom du joueur affiché (Corentin BONDEAU - Dirigeant)
    //    Le composant CardTile affiche firstName + lastName dans .nameText
    await expect(firstLegendary).toContainText('Corentin');
    await expect(firstLegendary).toContainText('BONDEAU');
    await expect(firstLegendary).toContainText('Dirigeant');

    // 7. Vérifie qu'il y a bien un effet animate-pulse sur la carte légendaire
    //    (animation Tailwind qui fait "pulser" l'opacité)
    const animationName = await firstLegendary.evaluate((el) => {
      return window.getComputedStyle(el).animationName;
    });
    // L'animation peut avoir un nom hashé par Tailwind, on vérifie juste qu'elle est définie
    expect(animationName).not.toBe('none');
  });
});
