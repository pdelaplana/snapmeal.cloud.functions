import * as admin from 'firebase-admin';
import { sendEmailNotification } from '../../helpers/sendEmail';
import { deleteAccount } from '../../jobs/deleteAccount';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  const mockBucket = {
    deleteFiles: jest.fn().mockResolvedValue([]),
  };

  const mockStorage = {
    bucket: jest.fn().mockReturnValue(mockBucket),
  };

  const mockAuth = {
    deleteUser: jest.fn().mockResolvedValue({}),
  };

  const mockFirestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
  };

  return {
    firestore: jest.fn(() => mockFirestore),
    storage: jest.fn(() => mockStorage),
    auth: jest.fn(() => mockAuth),
  };
});

// Mock firebase-functions params
jest.mock('firebase-functions', () => ({
  params: {
    storageBucket: {
      value: jest.fn().mockReturnValue('test-bucket'),
    },
  },
}));

// Mock email sending
jest.mock('../../helpers/sendEmail', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue({}),
}));

// Mock Sentry
jest.mock('@sentry/node', () => ({
  startSpan: jest.fn().mockImplementation((_, fn) => fn()),
  captureException: jest.fn(),
}));

describe('deleteAccount job', () => {
  const mockUserDocRef = {
    get: jest.fn(),
    delete: jest.fn().mockResolvedValue({}),
    collection: jest.fn(),
  };

  const mockUserSnapshot = {
    exists: true,
    data: jest.fn().mockReturnValue({
      id: 'user1',
      name: 'Test User',
    }),
  };

  const mockMealsCollection = {
    get: jest.fn(),
  };

  const mockMealsSnapshot = {
    docs: [
      {
        ref: {
          delete: jest.fn().mockResolvedValue({}),
        },
        id: 'meal1',
      },
      {
        ref: {
          delete: jest.fn().mockResolvedValue({}),
        },
        id: 'meal2',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Firestore responses
    (admin.firestore().collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue(mockUserDocRef),
    });

    mockUserDocRef.get.mockResolvedValue(mockUserSnapshot);

    // Setup collection mocks
    mockUserDocRef.collection.mockImplementation((collectionName) => {
      if (collectionName === 'meals') {
        return mockMealsCollection;
      }
      return {
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    });

    mockMealsCollection.get.mockResolvedValue(mockMealsSnapshot);

    // Setup auth mock
    (admin.auth as jest.Mock).mockReturnValue({
      deleteUser: jest.fn().mockResolvedValue({}),
    });

    // Setup storage mock
    (admin.storage as jest.Mock).mockReturnValue({
      bucket: jest.fn().mockReturnValue({
        deleteFiles: jest.fn().mockResolvedValue([]),
      }),
    });
  });

  it('should successfully delete account and all associated data', async () => {
    // Call the function
    const result = await deleteAccount({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Verify account lookup
    expect(admin.firestore().collection).toHaveBeenCalledWith('users');
    expect(admin.firestore().collection('users').doc).toHaveBeenCalledWith(
      'user1'
    );

    // Verify subcollections were queried
    expect(mockUserDocRef.collection).toHaveBeenCalledWith('meals');

    // Verify document deletion operations
    expect(mockMealsSnapshot.docs[0].ref.delete).toHaveBeenCalled();
    expect(mockMealsSnapshot.docs[1].ref.delete).toHaveBeenCalled();
    expect(mockUserDocRef.delete).toHaveBeenCalled();

    // Verify authentication deletion
    expect(admin.auth().deleteUser).toHaveBeenCalledWith('user1');

    // Verify storage cleanup
    expect(admin.storage().bucket).toHaveBeenCalled();
    expect(admin.storage().bucket().deleteFiles).toHaveBeenCalledWith({
      prefix: 'users/user1/',
    });

    // Verify email sent
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your account has been deleted',
      })
    );

    // Verify successful result
    expect(result).toEqual({
      success: true,
      message: 'Account for user@example.com deleted successfully.',
      accountId: 'user1',
    });
  });

  it('should handle missing userId', async () => {
    await expect(
      deleteAccount({ userId: '', userEmail: 'user@example.com' })
    ).rejects.toThrow('User ID is required.');
  });

  it('should handle non-existent account', async () => {
    // Setup mock to return a non-existent account
    mockUserDocRef.get.mockResolvedValue({
      exists: false,
    });

    // Call the function
    const result = await deleteAccount({
      userId: 'nonexistent',
      userEmail: 'user@example.com',
    });

    // Should fail with appropriate message
    expect(result).toEqual({
      success: false,
      message: expect.stringContaining(
        'User Doc with ID nonexistent not found'
      ),
    });
  });

  it('should handle storage errors gracefully', async () => {
    // Force a storage error but let the rest proceed
    (admin.storage().bucket().deleteFiles as jest.Mock).mockRejectedValue(
      new Error('Storage error')
    );

    // Call the function
    const result = await deleteAccount({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Should still succeed despite storage error
    expect(result.success).toBe(true);
  });

  it('should handle errors during execution', async () => {
    // Force an error in the main process
    (admin.firestore().collection as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
    });

    // Call the function
    const result = await deleteAccount({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Should return failure
    expect(result).toEqual({
      success: false,
      message: expect.stringContaining('Test error'),
    });
  });
});
