// Initializes the Firebase Admin SDK so the dashboard can securely read
// field-rep data (activity logs, GPS pings) from Cloud Firestore using a
// server-side service account — never a client-side API key.
//
// If no credentials are found (e.g. a fresh clone with no .env yet), the app
// falls back to local mock data instead of crashing, so the UI stays demoable.
const admin = require('firebase-admin');

let db = null;
let connected = false;

function initFirebase() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      // Whole service account JSON pasted as one env var
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      credential = admin.credential.cert(serviceAccount);
    } else if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Hosts like Render/Heroku store the key with literal "\n" sequences
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    } else {
      throw new Error('No Firebase credentials found in environment variables');
    }

    admin.initializeApp({ credential });
    db = admin.firestore();
    connected = true;
    console.log('Connected to Firebase Firestore.');
    return db;
  } catch (err) {
    connected = false;
    console.warn(`Firebase Admin SDK not configured (${err.message}).`);
    console.warn('Falling back to local mock data — see .env.example to connect a real project.');
    return null;
  }
}

module.exports = {
  initFirebase,
  isFirebaseConnected: () => connected
};
