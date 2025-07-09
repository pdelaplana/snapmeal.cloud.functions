import Sentry from '@sentry/node';
import admin from 'firebase-admin';
import { params } from 'firebase-functions';
import { db } from '../config/firebase';
import { sendEmailNotification } from '../helpers/sendEmail';

export const deleteAccount = async ({
  userId,
  userEmail,
}: { userId: string; userEmail: string }) => {
  return Sentry.startSpan(
    { name: 'deleteAccount', op: 'function.job.deleteAccount' },
    async () => {
      if (!userId) {
        throw new Error('User ID is required.');
      }

      try {
        // Get a reference to the account document
        const userRef = db.collection('users').doc(userId);

        // Get account data before deletion (for audit/confirmation purposes)
        const userSnapshot = await userRef.get();

        if (!userSnapshot.exists) {
          throw new Error(`User Doc with ID ${userId} not found.`);
        }

        // Delete subcollections first (periods and spending)
        // Note: Firestore doesn't automatically delete subcollections when a document is deleted

        // 1. Delete meals subcollection
        const mealsSnapshot = await userRef.collection('meals').get();
        const deleteMealsPromises = mealsSnapshot.docs.map(async (doc) => {
          await doc.ref.delete();
        });
        await Promise.all(deleteMealsPromises);

        // 2. Delete the user  document
        await userRef.delete();

        // 3. Delete user from Firebase Authentication
        await admin.auth().deleteUser(userId);

        // 5. Delete user's storage files
        try {
          // Get storage bucket name from parameters or use default
          const defaultBucket =
            params.storageBucket.value() || admin.storage().bucket().name;
          console.log('Default bucket:', defaultBucket);
          const bucket = admin.storage().bucket(defaultBucket);

          await bucket.deleteFiles({
            prefix: `users/${userId}/`,
          });
        } catch (storageError) {
          // Log but don't fail if storage deletion has issues
          console.warn(
            `Storage cleanup error for user ${userId}:`,
            storageError
          );
          Sentry.captureException(storageError);
        }

        // Send confirmation email
        await sendEmailNotification({
          from: '"SnapMeal" <noreply@yourapp.com>',
          to: userEmail,
          subject: 'Your account has been deleted',
          html: `
          <h2>Account Deletion Confirmation</h2>
          <p>Hello,</p>
          <p>This is a confirmation that your Spendless account and all associated data have been successfully deleted from our system.</p>
          <p>We're sorry to see you go. If you have any feedback about your experience with SnapMeal, please feel free to reply to this email.</p>
          <p>If you deleted your account by mistake or wish to rejoin in the future, you'll need to create a new account.</p>
          <p>Thank you for using Spendless.</p>
        `,
        });

        return {
          success: true,
          message: `Account for ${userEmail} deleted successfully.`,
          accountId: userId,
        };
      } catch (error) {
        Sentry.captureException(error);
        console.error('Error deleting account:', error);
        return {
          success: false,
          message: `${error}`,
        };
      }
    }
  );
};
