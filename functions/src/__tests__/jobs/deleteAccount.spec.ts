import { initializeFirebase } from '../../config/firebase';
import { sendEmailNotification } from '../../helpers/sendEmail';
import { deleteAccount } from '../../jobs/deleteAccount';

// Mock the firebase config module
jest.mock('../../config/firebase', () => {
  const mockDb = {
    collection: jest.fn(),
  };

  const mockAdmin = {
    auth: jest.fn(),
    storage: jest.fn(),
    apps: { length: 0 },
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
    },
  };

  return {
    initializeFirebase: jest.fn(() => ({
      admin: mockAdmin,
      db: mockDb,
      auth: mockAdmin.auth(),
      storage: mockAdmin.storage(),
      currentDatabaseId: 'development',
    })),
    databaseId: {
      value: jest.fn().mockReturnValue('development'),
    },
    storageBucket: {
      value: jest.fn().mockReturnValue('test-bucket'),
    },
  };
});

// Mock node:fs
jest.mock('node:fs', () => ({
  existsSync: jest.fn().mockReturnValue(false), // Mock existsSync to return false (no service account file)
}));

// Mock firebase-functions
jest.mock('firebase-functions', () => {
  const mockStorageBucket = {
    value: jest.fn().mockReturnValue('test-bucket'),
  };

  return {
    params: {
      storageBucket: mockStorageBucket,
    },
  };
});

// Mock firebase-functions/v2
jest.mock('firebase-functions/v2', () => ({
  params: {
    projectID: {
      value: jest.fn().mockReturnValue('test-project-id'),
    },
  },
}));

// Mock firebase-functions params
jest.mock('firebase-functions/params', () => ({
  defineString: jest.fn((_name, config) => ({
    value: jest.fn().mockReturnValue(config.default),
  })),
})); // Mock email sending
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

    // Setup the initializeFirebase mock to return our test objects
    const mockBucket = {
      deleteFiles: jest.fn().mockResolvedValue([]),
      name: 'default-bucket',
    };

    const mockAuth = {
      deleteUser: jest.fn().mockResolvedValue({}),
    };

    const mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    };

    const mockDb = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserDocRef),
      }),
    };

    const mockAdmin = {
      auth: jest.fn().mockReturnValue(mockAuth),
      storage: jest.fn().mockReturnValue(mockStorage),
    };

    (initializeFirebase as jest.Mock).mockReturnValue({
      admin: mockAdmin,
      db: mockDb,
      auth: mockAuth,
      storage: mockStorage,
      currentDatabaseId: 'development',
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
  });

  it('should successfully delete account and all associated data', async () => {
    // Call the function
    const result = await deleteAccount({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Verify account lookup (now through initializeFirebase db instance)
    expect(mockUserDocRef.get).toHaveBeenCalled();

    // Verify subcollections were queried
    expect(mockUserDocRef.collection).toHaveBeenCalledWith('meals');

    // Verify document deletion operations
    expect(mockMealsSnapshot.docs[0].ref.delete).toHaveBeenCalled();
    expect(mockMealsSnapshot.docs[1].ref.delete).toHaveBeenCalled();
    expect(mockUserDocRef.delete).toHaveBeenCalled();

    // Get the mocked initializeFirebase result for verification
    const mockInitResult = (initializeFirebase as jest.Mock).mock.results[0].value;

    // Verify authentication deletion
    expect(mockInitResult.auth.deleteUser).toHaveBeenCalledWith('user1');

    // Verify storage cleanup - might be called with 'test-bucket' or default bucket name
    expect(mockInitResult.storage.bucket).toHaveBeenCalled();
    expect(mockInitResult.storage.bucket().deleteFiles).toHaveBeenCalledWith({
      prefix: 'users/user1/',
    });

    // Verify email sent
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your account has been deleted',
      }),
    );

    // Verify successful result
    expect(result).toEqual({
      success: true,
      message: 'Account for user@example.com deleted successfully.',
      accountId: 'user1',
    });
  });

  it('should handle missing userId', async () => {
    await expect(deleteAccount({ userId: '', userEmail: 'user@example.com' })).rejects.toThrow(
      'User ID is required.',
    );
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
      message: expect.stringContaining('User Doc with ID nonexistent not found'),
    });
  });

  it('should handle storage errors gracefully', async () => {
    // Setup a new mock with storage error for this test
    const mockBucket = {
      deleteFiles: jest.fn().mockRejectedValue(new Error('Storage error')),
      name: 'default-bucket',
    };

    const mockAuth = {
      deleteUser: jest.fn().mockResolvedValue({}),
    };

    const mockStorage = {
      bucket: jest.fn().mockReturnValue(mockBucket),
    };

    const mockDb = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockUserDocRef),
      }),
    };

    const mockAdmin = {
      auth: jest.fn().mockReturnValue(mockAuth),
      storage: jest.fn().mockReturnValue(mockStorage),
    };

    (initializeFirebase as jest.Mock).mockReturnValue({
      admin: mockAdmin,
      db: mockDb,
      auth: mockAuth,
      storage: mockStorage,
      currentDatabaseId: 'development',
    });

    // Call the function
    const result = await deleteAccount({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Should still succeed despite storage error
    expect(result.success).toBe(true);
  });

  it('should handle errors during execution', async () => {
    // Force an error in the database operation
    const mockDb = {
      collection: jest.fn().mockImplementation(() => {
        throw new Error('Test error');
      }),
    };

    (initializeFirebase as jest.Mock).mockReturnValue({
      admin: {},
      db: mockDb,
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
