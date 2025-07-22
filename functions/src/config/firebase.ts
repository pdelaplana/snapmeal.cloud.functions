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
    // Check if Firebase app is already initialized and accessible
    let app: admin.app.App | null = null;

    // Try to get the default app
    if (admin.apps.length > 0) {
      try {
        app = admin.app();
        // Test if the app is actually functional by accessing a service
        app.options; // This will throw if app is not properly initialized
      } catch (_error) {
        console.log('Existing app found but not functional, reinitializing...');
        app = null;
      }
    }

    if (!app) {
      // Initialize new app
      try {
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
      } catch (initError: any) {
        if (initError.code === 'app/duplicate-app') {
          // App already exists, try to get it
          app = admin.app();
          console.log('Using existing Firebase app');
        } else {
          throw initError;
        }
      }
    }

    // Create firestore instance with explicit app reference
    const db = admin.firestore(app);
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
