import * as fs from 'node:fs';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';
import { Firestore } from 'firebase-admin/firestore';

export const databaseId = defineString('DATABASE_ID', {
  default: 'development',
  description: 'The ID of the Firestore database to use',
});
export const storageBucket = defineString('STORAGE_BUCKET', {
  default: 'snapmeal-sa2e9.firebasestorage.app',
  description: 'The name of the Firebase Storage bucket',
});


let dbInstance: FirebaseFirestore.Firestore | undefined;
let adminInstance: typeof admin | undefined;
let currentDatabaseId: string;

export const initializeFirebase = () => {
  // ✅ Prevent multiple initializations
  if (adminInstance && dbInstance) {
    return { admin: adminInstance, db: dbInstance, currentDatabaseId };
  }

  try {
    currentDatabaseId = databaseId.value();

    // Initialize Firebase Admin SDK only once
    if (admin.apps.length === 0) {
      const serviceAccountPath = './firebase-service-account.json';

      if (fs.existsSync(serviceAccountPath)) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountPath),
          storageBucket: storageBucket.value(),
        });
        console.log(`Using service account from file: ${serviceAccountPath}`);
      } else {
        admin.initializeApp();
      }
    }

    console.log(`Firebase Admin SDK initialized successfully with database: ${currentDatabaseId}`);

    const dbInstance = new Firestore({
      projectId: admin.app().options.projectId, // Get the project ID from your initialized Firebase app
      databaseId: 'development', // **This is where you specify the named database!**
      keyFilename: './firebase-service-account.json', // Use the service account file if it exists
    });

    console.log(`Firestore initialized successfully with database: ${currentDatabaseId}`);

    adminInstance = admin;
    return { admin: adminInstance, db: dbInstance, currentDatabaseId };

  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    throw error;
  }
};


export const getCurrentDatabaseId = () => {
  return databaseId.value();
};
