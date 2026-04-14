// ── Firebase Configuration ────────────────────────────────────────────────
// Firebase configuration - Replace with your Firebase project credentials
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
let db;
let logsCollection;

function initFirebase() {
  try {
    // Initialize Firebase App
    firebase.initializeApp(firebaseConfig);

    // Initialize Firestore
    db = firebase.firestore();
    logsCollection = db.collection('logs');

    console.log('Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return false;
  }
}

// ── Firebase Log Operations ────────────────────────────────────────────────

/**
 * Save a new log entry to Firebase
 * @param {Object} logEntry - The log entry to save {name, date, time}
 * @returns {Promise<boolean>} Success status
 */
async function saveLogToFirebase(logEntry) {
  try {
    await logsCollection.add({
      ...logEntry,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Log entry saved to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving log to Firebase:', error);
    return false;
  }
}

/**
 * Load all logs from Firebase
 * @returns {Promise<Array>} Array of log entries sorted by timestamp (newest first)
 */
async function loadLogsFromFirebase() {
  try {
    const snapshot = await logsCollection
      .orderBy('timestamp', 'desc')
      .get();

    const logs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        name: data.name,
        date: data.date,
        time: data.time
      });
    });

    console.log(`Loaded ${logs.length} log entries from Firebase`);
    return logs;
  } catch (error) {
    console.error('Error loading logs from Firebase:', error);
    return [];
  }
}

/**
 * Clear all logs from Firebase
 * @returns {Promise<boolean>} Success status
 */
async function clearLogsFromFirebase() {
  try {
    const snapshot = await logsCollection.get();

    // Delete all documents in batches
    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log('All logs cleared from Firebase');
    return true;
  } catch (error) {
    console.error('Error clearing logs from Firebase:', error);
    return false;
  }
}

/**
 * Listen to real-time updates on logs
 * @param {Function} callback - Function to call when logs update
 * @returns {Function} Unsubscribe function
 */
function subscribeToLogs(callback) {
  return logsCollection
    .orderBy('timestamp', 'desc')
    .onSnapshot(snapshot => {
      const logs = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          name: data.name,
          date: data.date,
          time: data.time
        });
      });
      callback(logs);
    }, error => {
      console.error('Error subscribing to logs:', error);
    });
}
