import * as fs from 'node:fs';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';

export const databaseId = defineString('DATABASE_ID', {
  default: '(default)',
  description: 'The ID of the Firestore database to use',
});
export const storageBucket = defineString('STORAGE_BUCKET', {
  default: 'snapmeal-sa2e9.firebasestorage.app',
  description: 'The name of the Firebase Storage bucket',
});

export const initializeFirebase = () => {
  // Initialize Firebase Admin SDK
  try {
    // In production/CI environment, use service account from env or file
    if (fs.existsSync('./firebase-service-account.json')) {
      admin.initializeApp({
        credential: admin.credential.cert('./firebase-service-account.json'),
        storageBucket: storageBucket.value() || 'snapmeal-sa2e9.firebasestorage.app',
      });
      console.log(`Using service account from file: firebase-service-account.json`);
    } else {
      // Default initialization for production environment
      admin.initializeApp();
    }

    console.log(`Firebase Admin SDK initialized successfully with database: ${databaseId.value()}`);

    // Export Firestore instance
    const db = admin.firestore();
    db.settings({
      databaseId: databaseId.value(),
      timestampsInSnapshots: true, // Enable timestamps in snapshots
    });

    return { admin, db };
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

export const getCurrentDatabaseId = () => {
  return databaseId.value();
};
