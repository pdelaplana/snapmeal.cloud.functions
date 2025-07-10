import * as fs from 'node:fs';
import * as admin from 'firebase-admin';

// Get environment-specific database ID
const getDatabaseId = (): string => {
  const environment = process.env.ENVIRONMENT || 'production';

  switch (environment) {
    case 'development':
      return 'development';
    case 'staging':
      return 'staging';
    default:
      return '(default)'; // Default Firestore database
  }
};

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

  const databaseId = getDatabaseId();
  console.log(
    `Firebase Admin SDK initialized successfully with database: ${databaseId}`
  );
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  throw error;
}

// Export Firestore instance
export const db = admin.firestore();

// Configure Firestore settings (optional)
db.settings({
  databaseId: 'development',
  ignoreUndefinedProperties: true,
});

// Export database ID for reference
export const currentDatabaseId = getDatabaseId();
