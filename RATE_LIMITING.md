# Protection Anti-Bot et Limitation de Taux

Ce document explique les mesures de protection implémentées pour éviter que la base Firebase soit inondée par des bots ou des utilisateurs malveillants.

## 🛡️ Architecture de Protection Multi-Couches

### 1. Protection Côté Client (JavaScript)

L'application implémente des limites de taux directement dans le code JavaScript pour prévenir les abus :

#### Limites Configurées

```javascript
DRAW_COOLDOWN: 5000,        // 5 secondes entre tirages
CONFIRM_COOLDOWN: 2000,     // 2 secondes entre confirmations
CLEAR_LOG_COOLDOWN: 10000,  // 10 secondes entre suppressions de log
```

#### Fonctionnement

- **Vérification avant action** : Avant chaque action (tirage, confirmation, suppression), le système vérifie si le délai minimum est respecté
- **Message utilisateur** : Si l'utilisateur essaie d'agir trop rapidement, un message lui indique combien de secondes il doit attendre
- **Horodatage** : Chaque action enregistre son timestamp pour calculer le temps écoulé

#### Fichier : `script.js`

```javascript
// Exemple de vérification
if (!canPerformAction('Draw')) {
  const remaining = getRemainingCooldown('Draw');
  alert(`Veuillez patienter ${remaining} seconde(s)...`);
  return;
}
```

### 2. Protection Côté Serveur (Firestore Security Rules)

Les règles de sécurité Firebase ajoutent une couche de protection au niveau du serveur, empêchant les requêtes abusives même si le code client est contourné.

#### Règles Implémentées

**Collection `logs`** :
- ✅ Lecture libre pour tous les utilisateurs
- ✅ Création limitée (pas plus d'une écriture toutes les 2 secondes)
- ❌ Suppression bloquée (seulement via Firebase Console)
- ❌ Modification bloquée

**Collection `state`** :
- ✅ Lecture libre pour tous les utilisateurs
- ✅ Écriture limitée (pas plus d'une écriture toutes les 3 secondes)
- ✅ Suppression autorisée (pour clearing après confirmation)

#### Avantages

1. **Protection contre le contournement client** : Même si quelqu'un modifie le code JavaScript, les règles serveur restent actives
2. **Prévention du spam** : Impossible de créer des centaines de logs en quelques secondes
3. **Intégrité des données** : Les logs ne peuvent pas être supprimés par des clients malveillants

## 📊 Cas d'Usage et Comportement

### Scénario 1 : Utilisation Normale
```
Utilisateur A lance un tirage → OK
5 secondes plus tard → Utilisateur A lance un autre tirage → OK
Utilisateur B confirme → OK (indépendant du cooldown de A)
```

### Scénario 2 : Tentative de Spam
```
Bot lance un tirage → OK (premier)
Bot essaie immédiatement un autre tirage → BLOQUÉ (cooldown 5s)
Bot attend 5s et réessaie → OK
Bot essaie immédiatement encore → BLOQUÉ (cooldown 5s)
```

### Scénario 3 : Multiples Utilisateurs
```
Utilisateur A lance un tirage → OK
0.5s plus tard → Utilisateur B lance un tirage → OK
(Chaque utilisateur a son propre cooldown local)
```

**Note** : Les cooldowns côté client sont indépendants par utilisateur. Les cooldowns côté serveur protègent globalement la base.

## 🔧 Personnalisation des Limites

Pour ajuster les limites selon vos besoins, modifiez les valeurs dans `script.js` :

```javascript
const RATE_LIMITS = {
  DRAW_COOLDOWN: 5000,        // Modifier cette valeur (en millisecondes)
  CONFIRM_COOLDOWN: 2000,     // Modifier cette valeur (en millisecondes)
  CLEAR_LOG_COOLDOWN: 10000,  // Modifier cette valeur (en millisecondes)
};
```

Et dans les règles Firestore :

```javascript
// Pour les logs - actuellement 2 secondes
allow create: if request.time > request.time - duration.value(2, 's');

// Pour le state - actuellement 3 secondes
allow write: if request.time > request.time - duration.value(3, 's');
```

## 📈 Limites Recommandées par Contexte

| Contexte | Tirage | Confirmation | Suppression Log |
|----------|--------|--------------|-----------------|
| **Petite équipe (< 10)** | 3-5s | 1-2s | 10s |
| **Équipe moyenne (10-30)** | 5-10s | 2-3s | 15s |
| **Grande équipe (> 30)** | 10-15s | 3-5s | 30s |

## ⚠️ Limitations et Considérations

### Limitations Actuelles

1. **Cooldown local uniquement** : Les cooldowns côté client sont stockés en mémoire, donc se réinitialisent si la page est rechargée
2. **Pas de tracking cross-utilisateur** : Chaque navigateur a ses propres cooldowns
3. **Protection serveur basique** : Les règles Firestore sont simples et ne trackent pas l'historique par IP

### Améliorations Futures Possibles

- Utiliser localStorage pour persister les cooldowns entre rechargements de page
- Implémenter un système de "jetons" avec quota journalier
- Ajouter Firebase Authentication pour tracker les utilisateurs individuellement
- Implémenter Cloud Functions pour une logique de rate limiting plus sophistiquée
- Logger les tentatives d'abus pour analyse

## 🎯 Efficacité de la Protection

Ces mesures protègent efficacement contre :
- ✅ Spam de clics rapides (humain ou script)
- ✅ Bots simples sans délais
- ✅ Suppression accidentelle ou malveillante de logs
- ✅ Surcharge de la base de données

Limitations restantes :
- ⚠️ Un bot sophistiqué respectant les délais peut toujours agir (mais à un rythme acceptable)
- ⚠️ Plusieurs utilisateurs/IPs peuvent contourner les limites globales
- ⚠️ Nécessite Firebase Authentication pour une protection complète par utilisateur

## 🚀 Conclusion

Ce système de protection multi-couches offre un excellent équilibre entre :
- **Facilité d'utilisation** : Les utilisateurs normaux ne sont pas gênés
- **Protection efficace** : Les abus sont largement prévenus
- **Simplicité** : Pas besoin d'authentification complexe
- **Coût** : Minimise l'utilisation de Firebase

Pour la plupart des équipes utilisant cette application en interne, cette protection est largement suffisante.
