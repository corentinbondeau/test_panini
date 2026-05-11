# Guide d'Installation et Configuration du Système d'Authentification

## Vue d'ensemble

Vous avez maintenant un système d'authentification complet avec :
- ✅ Inscription/Connexion avec email et mot de passe
- ✅ Base de données MongoDB avec Prisma ORM
- ✅ Synchronisation de la collection de cartes sur le serveur
- ✅ Profil utilisateur
- ✅ Système d'échange de cartes entre utilisateurs

## Installation

### 1. Configurer MongoDB

Vous avez besoin d'une base de données MongoDB. Vous avez deux options:

**Option A: MongoDB Atlas (Cloud - Recommandé)**
1. Créez un compte gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un cluster gratuit
3. Copiez la chaîne de connexion (connection string)
4. Modifiez le `.env.local` avec votre chaîne:

```
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/panini?retryWrites=true&w=majority"
```

**Option B: MongoDB Local**
```
DATABASE_URL="mongodb://localhost:27017/panini"
```

### 2. Configurer les variables d'environnement

Le fichier `.env.local` contient :
```env
DATABASE_URL="votre-url-mongodb"
JWT_SECRET="votre-secret-jwt-super-secret"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Changez le JWT_SECRET en production** avec une chaîne aléatoire complexe.

### 3. Initialiser Prisma

```bash
npx prisma migrate dev --name init
```

Cette commande va:
- Créer les tables dans MongoDB
- Générer le client Prisma

## Utilisation

### Architecture

```
API Routes:
├── POST /api/auth/register          - Créer un nouvel utilisateur
├── POST /api/auth/login              - Connexion utilisateur
├── GET  /api/auth/me                 - Obtenir l'utilisateur actuel
├── GET  /api/collection              - Obtenir la collection de l'utilisateur
├── POST /api/collection              - Ajouter/mettre à jour une carte
├── GET  /api/exchanges               - Obtenir les échanges
├── POST /api/exchanges               - Créer un échange
└── PUT /api/exchanges/[id]           - Accepter/rejeter un échange

Pages Client:
├── /auth                             - Page de connexion/inscription
├── /                                 - Page d'accueil
├── /booster                          - Tirage de boosters
├── /album                            - Album de cartes
└── /doubles                          - Gestion des doublons
```

### Fonctionnalités Principales

#### 1. Authentification
- **Register**: `POST /api/auth/register`
  ```json
  {
    "email": "user@example.com",
    "password": "motdepasse",
    "name": "John Doe"
  }
  ```

- **Login**: `POST /api/auth/login`
  ```json
  {
    "email": "user@example.com",
    "password": "motdepasse"
  }
  ```

- **Vérifier l'authentification**: `GET /api/auth/me`
  Header: `Authorization: Bearer token`

#### 2. Collection Synchronisée
La collection locale (Zustand) se synchronise avec le serveur:

```typescript
// Dans un composant React
import { useCollectionStore } from '@/store/collectionStore';
import { useAuthStore } from '@/store/authStore';

function MyComponent() {
  const { user, token } = useAuthStore();
  const { loadFromServer, syncToServer } = useCollectionStore();

  // Charger la collection depuis le serveur
  useEffect(() => {
    if (token) {
      loadFromServer(token);
    }
  }, [token, loadFromServer]);

  // Synchroniser vers le serveur
  const handleSync = async () => {
    if (token) {
      await syncToServer(token);
    }
  };
}
```

#### 3. Système d'Échange
```javascript
// Créer un échange
POST /api/exchanges
{
  "recipientId": "user-id",
  "offeredCards": { "card-1": 2, "card-2": 1 },
  "requestedCards": { "card-3": 1 }
}

// Mettre à jour le statut
PUT /api/exchanges/[id]
{
  "status": "accepted" | "rejected" | "completed"
}
```

## Flux de Développement

### Lancer le serveur de développement
```bash
npm run dev
```

L'application démarre sur `http://localhost:3000`

### Administrer la base de données (Prisma Studio)
```bash
npx prisma studio
```

Ouvre une interface pour visualiser et modifier les données.

## Structure de Base de Données

### User (Utilisateurs)
```json
{
  "_id": ObjectId,
  "email": "string unique",
  "password": "string (hashé)",
  "name": "string",
  "avatar": "string (URL)",
  "createdAt": Date,
  "updatedAt": Date
}
```

### UserCollection (Collections)
```json
{
  "_id": ObjectId,
  "userId": ObjectId,
  "cards": { "cardId": quantity, ... },
  "updatedAt": Date
}
```

### Exchange (Échanges)
```json
{
  "_id": ObjectId,
  "requesterId": ObjectId,
  "recipientId": ObjectId,
  "offeredCards": { "cardId": quantity, ... },
  "requestedCards": { "cardId": quantity, ... },
  "status": "pending | accepted | rejected | completed",
  "createdAt": Date,
  "updatedAt": Date
}
```

## Prochaines Étapes

1. **Ajouter des validations** : Valider les cartes, les quantités disponibles
2. **Notifications** : Informer les utilisateurs des échanges
3. **Upload d'avatar** : Permettre aux utilisateurs de télécharger une photo de profil
4. **Pagination** : Pour les listes d'échanges
5. **Cache côté client** : React Query ou SWR pour optimiser les appels API
6. **Déploiement** : Sur Vercel avec MongoDB Atlas

## Dépannage

### Erreur: "DATABASE_URL is not set"
→ Vérifiez que `.env.local` existe et contient `DATABASE_URL`

### Erreur: "connect ECONNREFUSED"
→ MongoDB n'est pas accessible. Vérifiez la chaîne de connexion.

### Erreur: "Email already exists"
→ Cet email est déjà utilisé. Créez un nouveau compte.

## Scripts Disponibles

```bash
npm run dev           # Lancer le serveur de développement
npm run build         # Construire pour la production
npm run start         # Lancer le serveur de production
npm run lint          # Vérifier le code
npx prisma migrate dev       # Créer une migration
npx prisma studio           # Ouvrir l'interface Prisma
```

## Conseils de Sécurité

1. **JWT_SECRET** : Changez-le en production avec une chaîne aléatoire longue
2. **HTTPS** : Utilisez HTTPS en production
3. **CORS** : Configurez CORS si vous avez un frontend séparé
4. **Rate limiting** : Implémentez un rate limiting sur les routes d'authentification
5. **Validation** : Validez toutes les entrées utilisateur

---

Pour plus d'informations:
- [Prisma ORM](https://www.prisma.io)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [MongoDB](https://www.mongodb.com)
