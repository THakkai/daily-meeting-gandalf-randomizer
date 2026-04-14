# Configuration Firebase

Ce guide explique comment configurer Firebase pour sauvegarder les logs de l'application.

## Étapes de configuration

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur "Ajouter un projet"
3. Suivez les étapes pour créer votre projet

### 2. Créer une application Web

1. Dans la console Firebase, sélectionnez votre projet
2. Cliquez sur l'icône Web (</>) pour ajouter une application web
3. Enregistrez votre application avec un nom (ex: "Daily Meeting Gandalf")
4. Firebase vous fournira un objet de configuration

### 3. Configurer Firestore

1. Dans le menu latéral, allez à "Firestore Database"
2. Cliquez sur "Créer une base de données"
3. Choisissez le mode de démarrage :
   - **Mode test** : Pour le développement (accès ouvert pendant 30 jours)
   - **Mode production** : Pour la production (nécessite des règles de sécurité)
4. Sélectionnez une région proche de vous

### 4. Configurer les règles de sécurité Firestore

Pour une utilisation simple avec faible traffic, vous pouvez utiliser ces règles :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Logs collection - read/write access
    match /logs/{logId} {
      allow read, write: true;
    }

    // State collection for collaborative features
    match /state/{document} {
      allow read, write: true;
    }
  }
}
```

**Note** : Ces règles permettent un accès complet. Pour une meilleure sécurité en production, ajoutez une authentification Firebase.

### 5. Ajouter vos identifiants Firebase

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

Vous trouverez ces informations dans :
- Console Firebase → Paramètres du projet → Vos applications → Configuration du SDK

## Fonctionnalités

Une fois configuré, l'application :
- ✅ Sauvegarde automatiquement les logs dans Firebase
- ✅ Charge les logs au démarrage
- ✅ Met à jour en temps réel avec les changements
- ✅ **Synchronisation collaborative en temps réel** - tous les utilisateurs voient le tirage instantanément
- ✅ **N'importe quel utilisateur peut valider** - la prise de parole peut être confirmée par n'importe quel participant
- ✅ Garde les participants dans localStorage (stockage local)

### Collaboration en temps réel

L'application utilise Firebase Firestore avec `onSnapshot` pour synchroniser en temps réel :

1. **Tirage partagé** : Quand un utilisateur lance un tirage, tous les utilisateurs connectés voient immédiatement le résultat
2. **Confirmation collaborative** : N'importe quel utilisateur peut cliquer sur "Confirmer la prise de parole"
3. **Mises à jour instantanées** : Les logs sont synchronisés en temps réel entre tous les clients

Cela permet à une équipe de voir le même écran même si plusieurs personnes ont l'application ouverte.

## Structure des données

### Collection `logs`
Les logs sont stockés dans la collection `logs` avec la structure suivante :

```javascript
{
  name: "Nom du participant",
  date: "lundi 14 avril 2026",
  time: "09:45",
  timestamp: Firestore.Timestamp
}
```

### Collection `state`
L'état actuel du tirage (en attente de confirmation) est stocké dans `state/current_draw` :

```javascript
{
  name: "Nom du participant tiré",
  quote: "Citation de Gandalf",
  timestamp: Firestore.Timestamp
}
```

Ce document est :
- **Créé** quand un utilisateur lance un tirage
- **Supprimé** quand n'importe quel utilisateur confirme la prise de parole
- **Écouté en temps réel** par tous les clients connectés via `onSnapshot`

## Dépannage

### Firebase ne s'initialise pas
- Vérifiez que les identifiants dans `firebase.js` sont corrects
- Vérifiez la console du navigateur pour les erreurs
- Assurez-vous que Firestore est activé dans votre projet

### Les logs ne se sauvegardent pas
- Vérifiez les règles de sécurité Firestore
- Vérifiez la console du navigateur pour les erreurs de permission
- Assurez-vous que la collection `logs` existe (elle sera créée automatiquement)

## Migration des données existantes

Si vous avez déjà des logs dans localStorage :

1. Ouvrez la console du navigateur (F12)
2. Exécutez ce code pour récupérer vos logs :

```javascript
const oldLogs = JSON.parse(localStorage.getItem('lotr_daily_log') || '[]');
console.log(oldLogs);
```

3. Vous pouvez ensuite les ajouter manuellement à Firebase si nécessaire
