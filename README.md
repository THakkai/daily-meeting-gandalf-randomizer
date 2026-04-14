# daily-meeting-gandalf-randomizer
Tirage au sort pour les daily meeting de l'équipe GField

[daily-meeting-gandalf-randomizer](https://thakkai.github.io/daily-meeting-gandalf-randomizer/)

## 🛡️ Architecture de Protection Multi-Couches

### 1. Protection Côté Client (JavaScript)

L'application implémente des limites de taux directement dans le code JavaScript pour prévenir les abus :

#### Limites Configurées

```javascript
DRAW_COOLDOWN: 5000,        // 5 secondes entre tirages
CONFIRM_COOLDOWN: 2000,     // 2 secondes entre confirmations
CLEAR_LOG_COOLDOWN: 10000,  // 10 secondes entre suppressions de log
```

### 2. Protection Côté Base (FireBase)

Restriction via HTTP referrers (web sites) sur la clé API


## Configuration de Firebase pour GitHub Pages

### 1. Ajouter vos identifiants Firebase

Ouvrez le fichier `firebase.js` et remplacez les valeurs de configuration :

```javascript
const firebaseConfig = {
  apiKey: "VOTRE_API_KEY",
  authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
  projectId: "VOTRE_PROJECT_ID",
  storageBucket: "VOTRE_PROJECT_ID.appspot.com",
  messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
  appId: "VOTRE_APP_ID"
};
```