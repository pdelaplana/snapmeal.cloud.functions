import * as fs from 'node:fs';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';

export const databaseId = defineString('DATABASE_ID', {
  default: 'development',
  description: 'The ID of the Firestore database to use',
});
export const storageBucket = defineString('STORAGE_BUCKET', {
  default: 'snapmeal-sa2e9.firebasestorage.app',
  description: 'The name of the Firebase Storage bucket',
});

let dbInstance: admin.firestore.Firestore | null = null;

export const initializeFirebase = () => {
  // Initialize Firebase Admin SDK
  try {
    if (admin.apps.length === 0) {
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

      console.log(
        `Firebase Admin SDK initialized successfully with database: ${databaseId.value()}`,
      );

      // Create and configure Firestore instance
      dbInstance = admin.firestore();
      dbInstance.settings({
        databaseId: databaseId.value(),
        timestampsInSnapshots: true, // Enable timestamps in snapshots
      });
    }

    // Return the cached db instance or create a new one if not cached
    const db = dbInstance || admin.firestore();
    return { admin, db };
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};

export const getCurrentDatabaseId = () => {
  return databaseId.value();
};
