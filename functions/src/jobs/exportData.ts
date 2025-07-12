import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Sentry from '@sentry/node';
import admin from 'firebase-admin';
import params from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';

import { parse } from 'json2csv';
import { db } from '../config/firebase';
import { sendEmailNotification } from '../helpers/sendEmail';

export const exportData = async ({
  userId,
  userEmail,
}: { userId: string; userEmail: string }) => {
  return Sentry.startSpan(
    { name: 'exportData', op: 'function.job.exportData' },
    async () => {
      if (!userId) {
        throw new Error('User ID is required.');
      }

      try {
        // Validate collection name (you can add more validation as needed)
        const userRef = db.collection('users').doc(userId ?? '');

        if (!userRef) {
          throw new Error(`User Document for ID ${userId} not found.`);
        }

        // get meals collection
        const mealsSnapshot = await userRef.collection('meals').get();
        const mealDocs = mealsSnapshot.docs;

        // Convert Firestore data to array
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        const meals: any[] = [];
        for (const mealDoc of mealDocs) {
          // Combine document ID with document data
          meals.push({
            id: mealDoc.id,
            ...mealDoc.data(),
            date: mealDoc.data().date.toDate(),
            created: mealDoc.data().created.toDate(),
            updated: mealDoc.data().updated.toDate(),
          });
        }

        // If we have no documents, throw an error
        if (meals.length === 0) {
          throw new HttpsError('not-found', `No data found for ${userEmail}.`);
        }

        // Convert JSON to CSV
        const csv = parse(meals);

        // Create temp file
        const timestamp = Date.now();
        const tempFilePath = path.join(
          os.tmpdir(),
          `meals-export-${userId}-${timestamp}.csv`
        );
        fs.writeFileSync(tempFilePath, csv);

        // Upload to Firebase Storage
        const defaultBucket =
          params.storageBucket?.value() || admin.storage().bucket().name;
        console.log('Default bucket:', defaultBucket);
        const bucket = admin.storage().bucket(defaultBucket);
        const storageFilePath = `users/${userId}/exports/meals-${timestamp}.csv`;

        await bucket.upload(tempFilePath, {
          destination: storageFilePath,
          metadata: {
            contentType: 'text/csv',
          },
        });

        // Clean up temp file
        fs.unlinkSync(tempFilePath);

        const [url] = await bucket.file(storageFilePath).getSignedUrl({
          action: 'read',
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        // Send email notification
        await sendEmailNotification({
          from: '"SnapMeal" <noreply@yourapp.com>',
          to: userEmail,
          subject: 'Your data export is ready',
          html: `
          <h2>Your data export is ready</h2>
          <p>You requested an export of your spending data. Your file is now ready for download.</p>
          <p><a href="${url}">Click here to download your CSV file</a></p>
          <p>This link will expire in 7 days.</p>
        `,
        });

        // Optionally, also send a notification via Firebase messaging
        //await sendFirebaseNotification(userId, collectionName, url);

        // Return success with download URL
        return {
          success: true,
          message: `${userEmail} data exported successfully.`,
          downloadUrl: url,
        };
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error exporting data:', error);
        return {
          success: false,
          message: `${error}`,
        };
      }
    }
  );
};
