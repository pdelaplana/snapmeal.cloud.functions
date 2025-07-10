import * as fs from 'node:fs';
import * as admin from 'firebase-admin';

// Get environment-specific database ID
const getDatabaseId = (): string => {
  return process.env.DATABASE_ID || '(default)';
};

// Initialize Firebase Admin SDK
try {
  // In production/CI environment, use service account from env or file
  if (fs.existsSync('./firebase-service-account.json')) {
    admin.initializeApp({
      credential: admin.credential.cert('./firebase-service-account.json'),
    },);
  } else {
    // Default initialization for production environment
    admin.initializeApp();
  }

  const databaseId = getDatabaseId();
  console.log(
    `Firebase Admin SDK initialized successfully with database: ${databaseId}`
  );
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}

// Export Firestore instance with correct database selection
const databaseId = getDatabaseId();

// Create Firestore instance with the correct database
// Note: For non-default databases, we need to configure this differently
// The Firebase Admin SDK doesn't allow specifying database at instance creation
// Instead, we configure the default database and use database-specific triggers
export const db = admin.firestore();

db.settings({
  databaseId: 'development',
});


// Export database ID for reference
export const currentDatabaseId = databaseId;
