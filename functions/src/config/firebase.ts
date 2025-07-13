import * as fs from 'node:fs';
import * as admin from 'firebase-admin';

console.log('Initializing Firebase Admin SDK...');
console.log(`Using environment variable DATABASE_ID: ${process.env.DATABASE_ID}`);
console.log(`Using environment variable STORAGE_BUCKET: ${process.env.STORAGE_BUCKET}`);

// Get environment-specific database ID
const getDatabaseId = (): string => {
  return process.env.DATABASE_ID || '(default)';
};

// Get database ID before initialization
const databaseId = getDatabaseId();

// Initialize Firebase Admin SDK
try {
  // In production/CI environment, use service account from env or file
  if (fs.existsSync('./firebase-service-account.json')) {
    admin.initializeApp({
      credential: admin.credential.cert('./firebase-service-account.json'),
      storageBucket: process.env.STORAGE_BUCKET || 'snapmeal-sa2e9.firebasestorage.app',
    });
    console.log(`Using service account from file: firebase-service-account.json`);
  } else {
    // Default initialization for production environment
    admin.initializeApp();
  }

  console.log(`Firebase Admin SDK initialized successfully with database: ${databaseId}`);
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}

// Export Firestore instance
export const db = admin.firestore();
db.settings({
  databaseId: databaseId,
  timestampsInSnapshots: true, // Enable timestamps in snapshots
});

// Export database ID for reference
export const currentDatabaseId = databaseId;
