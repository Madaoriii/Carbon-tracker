# 🌍 TraceCarbone — Guide de déploiement complet

## Vue d'ensemble

TraceCarbone est une application web complète pour calculer le bilan carbone des déplacements. Elle comprend :

- **Interface utilisateur** : formulaire de trajets (quotidiens + exceptionnels), carte interactive, récapitulatif, statistiques globales
- **Back-office admin** : tableau de données trié/filtré, export Excel, accès restreint

---

## 🚀 Installation en 5 étapes

### Étape 1 — Prérequis

- [Node.js 18+](https://nodejs.org)
- Un compte [Firebase](https://firebase.google.com) (gratuit)
- Un compte [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) (gratuit)

---

### Étape 2 — Configurer Firebase

1. Allez sur [console.firebase.google.com](https://console.firebase.google.com)
2. Cliquez **"Ajouter un projet"** → nommez-le `carbon-tracker`
3. **Activer Authentication** :
   - Menu gauche → Authentication → Get started
   - Onglet "Sign-in method" → Activer **Email/Password**
4. **Créer la base Firestore** :
   - Menu gauche → Firestore Database → Create database
   - Choisissez "Start in production mode" → sélectionnez une région proche (europe-west1)
5. **Récupérer les clés** :
   - Icône ⚙️ → Project settings → Votre application web
   - Si pas d'app web : cliquez `</>` pour en ajouter une
   - Copiez l'objet `firebaseConfig`

---

### Étape 3 — Configurer l'application

Ouvrez `src/firebase.js` et remplacez les valeurs :

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← votre clé
  authDomain: "mon-projet.firebaseapp.com",
  projectId: "mon-projet",
  storageBucket: "mon-projet.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc..."
};
```

Ouvrez `src/contexts/AuthContext.jsx` et ajoutez vos emails admin :

```javascript
export const ADMIN_EMAILS = [
  'votre-email@exemple.com',     // ← votre email
  'collegue@exemple.com',        // ← autres admins
];
```

---

### Étape 4 — Appliquer les règles de sécurité Firestore

1. Firebase Console → Firestore Database → **Rules**
2. Copiez le contenu de `firestore.rules`
3. Cliquez **Publish**

---

### Étape 5 — Déployer sur Vercel

```bash
# Dans le dossier du projet
npm install
npm run build   # Vérifier que ça compile

# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel
```

Ou via l'interface Vercel :
1. [vercel.com](https://vercel.com) → New Project
2. Importez depuis GitHub (uploadez les fichiers d'abord)
3. Framework : **Vite**
4. Cliquez Deploy

---

## 🔧 Personnalisation

### Modifier les facteurs d'émission
Fichier : `src/utils/carbonUtils.js`
→ Objet `TRANSPORT_MODES` : modifiez les `emissionFactor` (kgCO2/km)

### Ajouter un mode de transport
Dans `TRANSPORT_MODES`, ajoutez une entrée :
```javascript
nouveau_mode: {
  label: 'Mon transport',
  icon: '🛵',
  color: '#3498db',
  emissionFactor: 0.08,
  needsFuel: false,
}
```

### Ajouter des pays à la carte statistiques
Fichier : `src/pages/Statistics.jsx`
→ Fonction `getCountryCoords()` : ajoutez les coordonnées `[latitude, longitude]`

### Modifier les couleurs / design
Fichier : `src/index.css`
→ Section `:root` avec toutes les variables CSS

### Ajouter un admin
Fichier : `src/contexts/AuthContext.jsx`
→ Tableau `ADMIN_EMAILS` : ajoutez l'email

**Ou** directement en Firestore : accédez à `users/{uid}` et mettez `isAdmin: true`

---

## 📋 Structure des données Firestore

### Collection `users`
```
users/{uid}
  email: string
  displayName: string
  createdAt: timestamp
  isAdmin: boolean
  currentPeriodStart: string (ISO date)
```

### Collection `trips`
```
trips/{tripId}
  userId: string
  userEmail: string
  userName: string
  tripType: "daily" | "exceptional"
  departure: { lat, lon, shortName, name, country, city }
  arrival:   { lat, lon, shortName, name, country, city }
  transport: string (clé de TRANSPORT_MODES)
  fuelType: string (optionnel)
  distance: number (km)
  roundTrip: boolean
  frequency: string
  customFrequency: number (optionnel)
  emissions: { perTrip, perYear, distancePerYear }
  notes: string
  createdAt: string (ISO date)
```

---

## 🔄 Formulaire semestriel (à implémenter)

Pour déclencher automatiquement un nouveau formulaire tous les 6 mois avec pré-remplissage :

1. Dans Firestore, chaque `users/{uid}` a un champ `currentPeriodStart`
2. À chaque connexion, comparez la date actuelle avec `currentPeriodStart + 6 mois`
3. Si dépassé : proposez un nouveau formulaire en pré-remplissant les trajets `daily` du cycle précédent
4. Vous pouvez automatiser avec une **Cloud Function Firebase** (Scheduler)

Exemple de Cloud Function à ajouter (optionnel) :
```javascript
// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.checkSemestralReset = functions.pubsub
  .schedule('0 8 1 * *')  // 1er de chaque mois à 8h
  .onRun(async () => {
    // Logique de détection des 6 mois écoulés
  });
```

---

## 📊 Export Excel — Colonnes

| Colonne | Description |
|---------|-------------|
| Utilisateur | Nom de l'utilisateur |
| Email | Email de connexion |
| Type de trajet | Quotidien / Exceptionnel |
| Départ | Ville/lieu de départ |
| Pays départ | Pays de départ |
| Arrivée | Destination |
| Pays arrivée | Pays d'arrivée |
| Mode de transport | Avion, train, voiture... |
| Carburant | Essence/diesel/hybride/électrique |
| Distance (km) | Distance aller (ou A/R si coché) |
| Aller-retour | Oui / Non |
| Fréquence | Quotidien, hebdo, mensuel... |
| Émissions/trajet (kgCO₂e) | Bilan par trajet |
| Émissions/an (kgCO₂e) | Bilan annualisé |
| Distance/an (km) | Distance annualisée |
| Notes | Notes libres |
| Date création | Date d'ajout du trajet |

---

## 🆘 Support & évolutions

L'application est entièrement open-source et modifiable. Principaux fichiers :

| Fichier | Rôle |
|---------|------|
| `src/firebase.js` | Configuration Firebase |
| `src/contexts/AuthContext.jsx` | Auth + liste admins |
| `src/utils/carbonUtils.js` | Facteurs carbone, calculs |
| `src/pages/DailyTrips.jsx` | Page trajets quotidiens |
| `src/pages/ExceptionalTrips.jsx` | Page trajets exceptionnels |
| `src/pages/Summary.jsx` | Récapitulatif |
| `src/pages/Statistics.jsx` | Statistiques globales |
| `src/pages/AdminPanel.jsx` | Back-office |
| `src/index.css` | Design system complet |

---

*TraceCarbone — Développé avec React + Firebase + Leaflet*
