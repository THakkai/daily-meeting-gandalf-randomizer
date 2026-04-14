// ── Firebase Configuration ────────────────────────────────────────────────
// Firebase configuration for daily-meeting-gandalf project
const firebaseConfig = {
  apiKey: "AIzaSyCyzwt874_CZABFX_DV4nsI8aW0juZ1mys",
  authDomain: "daily-meeting-gandalf.firebaseapp.com",
  projectId: "daily-meeting-gandalf",
  storageBucket: "daily-meeting-gandalf.firebasestorage.app",
  messagingSenderId: "290142233278",
  appId: "1:290142233278:web:cec78c649d86b42659f4ef"
};

// Initialize Firebase
let db;
let logsCollection;
let currentDrawDoc;

const CURRENT_DRAW_DOC_ID = 'current_draw';

function initFirebase() {
  try {
    // Initialize Firebase App
    firebase.initializeApp(firebaseConfig);

    // Initialize Firestore
    db = firebase.firestore();
    logsCollection = db.collection('logs');
    currentDrawDoc = db.collection('state').doc(CURRENT_DRAW_DOC_ID);

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

// ── Current Draw State Operations ──────────────────────────────────────────

/**
 * Save the current draw result to Firebase (pending confirmation)
 * @param {string} name - The name of the person drawn
 * @param {string} quote - The quote shown
 * @returns {Promise<boolean>} Success status
 */
async function saveCurrentDraw(name, quote) {
  try {
    await currentDrawDoc.set({
      name: name,
      quote: quote,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Current draw saved to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving current draw:', error);
    return false;
  }
}

/**
 * Clear the current draw state (after confirmation)
 * @returns {Promise<boolean>} Success status
 */
async function clearCurrentDraw() {
  try {
    await currentDrawDoc.delete();
    console.log('Current draw cleared from Firebase');
    return true;
  } catch (error) {
    console.error('Error clearing current draw:', error);
    return false;
  }
}

/**
 * Subscribe to real-time updates on the current draw state
 * @param {Function} callback - Function to call when draw state changes
 * @returns {Function} Unsubscribe function
 */
function subscribeToCurrentDraw(callback) {
  return currentDrawDoc.onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      callback({
        name: data.name,
        quote: data.quote,
        timestamp: data.timestamp
      });
    } else {
      callback(null);
    }
  }, error => {
    console.error('Error subscribing to current draw:', error);
  });
}

// ── Participants Synchronization ───────────────────────────────────────────

/**
 * Save participants to Firebase
 * @param {Array} participants - Array of participant objects
 * @returns {Promise<boolean>} Success status
 */
async function saveParticipantsToFirebase(participants) {
  try {
    await db.collection('state').doc('participants').set({
      participants: participants,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    console.log('Participants saved to Firebase');
    return true;
  } catch (error) {
    console.error('Error saving participants to Firebase:', error);
    return false;
  }
}

/**
 * Load participants from Firebase
 * @returns {Promise<Array>} Array of participants
 */
async function loadParticipantsFromFirebase() {
  try {
    const doc = await db.collection('state').doc('participants').get();
    if (doc.exists) {
      const data = doc.data();
      console.log('Participants loaded from Firebase');
      return data.participants || [];
    }
    return [];
  } catch (error) {
    console.error('Error loading participants from Firebase:', error);
    return [];
  }
}

/**
 * Subscribe to real-time updates on participants
 * @param {Function} callback - Function to call when participants update
 * @returns {Function} Unsubscribe function
 */
function subscribeToParticipants(callback) {
  return db.collection('state').doc('participants').onSnapshot(doc => {
    if (doc.exists) {
      const data = doc.data();
      callback(data.participants || []);
    }
  }, error => {
    console.error('Error subscribing to participants:', error);
  });
}
