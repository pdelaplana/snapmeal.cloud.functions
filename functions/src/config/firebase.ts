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

export const initializeFirebase = () => {
  try {
    // Always check if we can access the default app
    let app: admin.app.App | null;
    try {
      app = admin.app(); // Try to get default app
    } catch (_error) {
      // No accessible app, need to initialize
      app = null;
    }

    if (!app) {
      // Initialize new app
      if (fs.existsSync('./firebase-service-account.json')) {
        app = admin.initializeApp({
          credential: admin.credential.cert('./firebase-service-account.json'),
          storageBucket: storageBucket.value() || 'snapmeal-sa2e9.firebasestorage.app',
        });
        console.log(`Using service account from file: firebase-service-account.json`);
      } else {
        app = admin.initializeApp();
      }

      console.log(
        `Firebase Admin SDK initialized successfully with database: ${databaseId.value()}`,
      );
    }

    // Always create fresh firestore instance
    const db = admin.firestore();
    db.settings({
      databaseId: databaseId.value(),
      timestampsInSnapshots: true,
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
