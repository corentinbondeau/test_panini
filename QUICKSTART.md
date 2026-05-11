# Démarrage Rapide

## 1️⃣ Installation (5 minutes)

### Installer les dépendances
```bash
npm install
```

### Configurer MongoDB
1. Créez un compte gratuit sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un cluster gratuit
3. Obtenez votre chaîne de connexion
4. Modifiez `.env.local`:
```env
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/panini?retryWrites=true&w=majority"
JWT_SECRET="changez-ceci-en-production-avec-une-clé-aléatoire-longue"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### Initialiser la base de données
```bash
npx prisma migrate dev --name init
```

## 2️⃣ Lancer l'application

```bash
npm run dev
```

Ouvrez `http://localhost:3000`

## 3️⃣ Tester le système

### Sur la page d'accueil:
- Cliquez sur "Connexion" en haut à droite
- Créez un compte: cliquez sur "S'inscrire"
- Remplissez le formulaire avec:
  - Email: `test@example.com`
  - Nom: `Test User`
  - Mot de passe: `password123` (min 6 caractères)

### Après la connexion:
- Votre profil s'affiche en haut à droite
- Votre collection se synchronise avec la base de données
- Vous pouvez tirer des boosters et ajouter des cartes
- Les changes se synchronisent automatiquement avec MongoDB

## 📱 Fonctionnalités

✅ **Authentification**
- Inscription avec email/mot de passe
- Connexion sécurisée
- Récupération de session

✅ **Collection Personnelle**
- Chaque utilisateur a sa propre collection
- Synchronisation en temps réel avec MongoDB
- Historique d'acquisition des cartes

✅ **Gestion des Doubles**
- Visualisez facilement vos doublons
- Préparez les échanges

✅ **Système d'Échange** (à venir)
- Proposez des échanges à d'autres utilisateurs
- Acceptez/refusez les propositions
- Historique des échanges

## 🗄️ Base de Données

Voir la collection avec Prisma Studio:
```bash
npx prisma studio
```

## 📚 Documentation Complète

Voir [AUTHENTICATION.md](./AUTHENTICATION.md) pour plus de détails.

## ⚡ Conseils

- **Développement**: Les données se sauvegardent automatiquement dans MongoDB
- **Débogage**: Utilisez `npx prisma studio` pour inspecter les données
- **Reset**: Pour supprimer toutes les données:
  ```bash
  npx prisma migrate reset
  ```

## 🆘 Besoin d'aide?

### "Failed to connect to database"
→ Vérifiez votre chaîne `DATABASE_URL` dans `.env.local`

### "Email already exists"
→ Utilisez un email différent ou réinitialisez la base

### "Invalid token"
→ Connectez-vous à nouveau
