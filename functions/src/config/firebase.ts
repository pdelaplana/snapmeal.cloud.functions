import * as fs from 'node:fs';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
try {
  // In production/CI environment, use service account from env or file
  if (fs.existsSync('./firebase-service-account.json')) {
    admin.initializeApp({
      credential: admin.credential.cert('./firebase-service-account.json'),
    });
  } else {
    // Default initialization for production environment
    admin.initializeApp();
  }
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}
