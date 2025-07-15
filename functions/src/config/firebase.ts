import * as fs from 'node:fs';
import * as admin from 'firebase-admin';
import { onInit } from 'firebase-functions/core';
import { defineString } from 'firebase-functions/params';

export const databaseId = defineString('DATABASE_ID', {
  default: '(default)',
  description: 'The ID of the Firestore database to use',
});
export const storageBucket = defineString('STORAGE_BUCKET', {
  default: 'snapmeal-sa2e9.firebasestorage.app',
  description: 'The name of the Firebase Storage bucket',
});

onInit(() => {
  console.log('Firebase Functions initialized with the following parameters:');
  console.log(`DATABASE_ID: ${databaseId.value()}`);
  console.log(`STORAGE_BUCKET: ${storageBucket.value()}`);
});

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

  console.log(`Firebase Admin SDK initialized successfully with database: ${databaseId}`);
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}

// Export Firestore instance
export const db = admin.firestore();
db.settings({
  databaseId: databaseId.value(),
  timestampsInSnapshots: true, // Enable timestamps in snapshots
});

// Export database ID for reference
export const currentDatabaseId = databaseId.value();
