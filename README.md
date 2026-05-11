# Panini Club - Collection Next.js

Application Next.js pour collectionner 442 cartes (joueurs, coachs, dirigeants) avec :

- gestion des quantités (`{ [cardId]: quantity }`)
- détection des doubles (badge `x2`, `x3`, ...)
- onglet **Mes Doubles**
- progression par catégorie + score de complétion
- préparation du partage manuel pour échanges

## Démarrage

1. Installer Node.js (version LTS recommandée)
2. Installer les dépendances :

```bash
npm install
```

3. Lancer le projet :

```bash
npm run dev
```

4. Ouvrir `http://localhost:3000`

## Source de vérité des cartes

Le fichier `scripts/seed-club.ts` génère les 442 définitions.
La couche app consomme ce seed via `src/data/clubCards.ts`.
