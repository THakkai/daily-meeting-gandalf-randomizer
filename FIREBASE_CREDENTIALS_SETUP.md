# Firebase Configuration for GitHub Pages

Since you've provided Firebase credentials in a previous chat session but I don't have access to them in this session, here's how to get your GitHub Pages working:

## Option 1: Update firebase.js Directly (Recommended for Public Sites)

Firebase client credentials are designed to be public - they're protected by Firebase Security Rules, not by keeping them secret.

Simply edit `firebase.js` lines 4-9 and replace the placeholder values with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY_HERE",          // Replace with your API key
  authDomain: "YOUR_PROJECT.firebaseapp.com",   // Replace with your auth domain
  projectId: "YOUR_PROJECT_ID",                 // Replace with your project ID
  storageBucket: "YOUR_PROJECT.appspot.com",    // Replace with your storage bucket
  messagingSenderId: "YOUR_SENDER_ID",          // Replace with your sender ID
  appId: "YOUR_APP_ID"                          // Replace with your app ID
};
```

Then commit and push:
```bash
git add firebase.js
git commit -m "Configure Firebase credentials for GitHub Pages"
git push
```

## Option 2: Use GitHub Secrets (More Complex, But Hides Values in Repo)

If you prefer not to have the credentials visible in the repository:

1. Go to your repository settings: https://github.com/THakkai/daily-meeting-gandalf-randomizer/settings/secrets/actions

2. Add these secrets:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

3. The GitHub Actions workflow in `.github/workflows/deploy.yml` will inject them during deployment

## Where to Find Your Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon → Project settings
4. Scroll down to "Your apps"
5. Click on your web app (or add one if you haven't)
6. Copy the configuration values from the `firebaseConfig` object

## Security Note

**It's safe to commit Firebase client credentials to a public repository** as long as you have proper Firestore Security Rules configured (which you do according to FIREBASE_SETUP.md). The Security Rules control what users can actually do, not the API key.

## Quick Fix

If you can provide the Firebase credentials again, I can update firebase.js for you immediately.
