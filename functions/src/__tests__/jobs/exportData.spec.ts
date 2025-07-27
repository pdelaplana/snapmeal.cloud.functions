import * as fs from 'node:fs';

import { initializeFirebase } from '../../config/firebase';
import { sendEmailNotification } from '../../helpers/sendEmail';
import { exportData } from '../../jobs/exportData';

// Mock the firebase config module
jest.mock('../../config/firebase', () => {
  const mockDb = {
    collection: jest.fn(),
  };

  const mockAdmin = {
    storage: jest.fn(),
  };

  return {
    initializeFirebase: jest.fn(() => ({
      admin: mockAdmin,
      db: mockDb,
    })),
  };
});

jest.mock('node:fs', () => ({
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false), // Mock existsSync to return false (no service account file)
}));

// Mock firebase-functions
jest.mock('firebase-functions', () => ({
  params: {
    storageBucket: {
      value: jest.fn().mockReturnValue('test-bucket'),
    },
  },
}));

// Mock firebase-functions params
jest.mock('firebase-functions/params', () => ({
  defineString: jest.fn((_name, config) => ({
    value: jest.fn().mockReturnValue(config.default),
  })),
}));
jest.mock('../../helpers/sendEmail', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue({}),
}));

jest.mock('@sentry/node', () => ({
  startSpan: jest.fn().mockImplementation((_, fn) => fn()),
  captureException: jest.fn(),
}));

describe('exportData job', () => {
  const bucket = {
    name: 'test-bucket',
    upload: jest.fn().mockResolvedValue([]),
    file: jest.fn().mockReturnValue({
      getSignedUrl: jest.fn().mockResolvedValue(['https://download-url.com']),
    }),
  };

  const mockAccountRef = {
    collection: jest.fn(),
    get: jest.fn(),
  };

  const mockMealsSnapshot = {
    docs: [
      {
        id: 'meal1',
        data: () => ({
          name: 'Test Meal',
          description: 'A delicious test meal',
          date: { toDate: () => new Date('2025-01-15') },
          created: { toDate: () => new Date('2025-01-15') },
          updated: { toDate: () => new Date('2025-01-15') },
        }),
      },
    ],
  };

  const mockAccountSnapshot = {
    data: () => ({
      id: 'user1',
      name: 'Test User',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      createdAt: { toDate: () => new Date('2024-01-01') },
      updatedAt: { toDate: () => new Date('2025-01-01') },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup the initializeFirebase mock to return our test objects
    const mockDb = {
      collection: jest.fn().mockReturnValue({
        doc: jest.fn().mockReturnValue(mockAccountRef),
      }),
    };

    const mockAdmin = {
      storage: jest.fn().mockReturnValue({
        bucket: jest.fn(() => bucket),
      }),
    };

    (initializeFirebase as jest.Mock).mockReturnValue({
      admin: mockAdmin,
      db: mockDb,
    });

    mockAccountRef.get.mockResolvedValue(mockAccountSnapshot);

    mockAccountRef.collection.mockImplementation((collectionName) => {
      if (collectionName === 'meals') {
        return { get: jest.fn().mockResolvedValue(mockMealsSnapshot) };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    });
  });

  it('should successfully export data', async () => {
    // Call the function
    const result = await exportData({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Get the mocked initializeFirebase result for verification
    const mockInitResult = (initializeFirebase as jest.Mock).mock.results[0].value;

    // Verify database operations
    expect(mockInitResult.db.collection).toHaveBeenCalledWith('users');
    expect(mockInitResult.db.collection().doc).toHaveBeenCalledWith('user1');

    // Verify Firestore queries
    expect(mockAccountRef.collection).toHaveBeenCalledWith('meals');

    // Verify file operations
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();

    // Verify storage operations
    expect(mockInitResult.admin.storage().bucket).toHaveBeenCalled();
    expect(mockInitResult.admin.storage().bucket().upload).toHaveBeenCalled();
    expect(mockInitResult.admin.storage().bucket().file).toHaveBeenCalledWith(
      expect.stringMatching(/users\/user1\/exports\/meals-.*\.csv/),
    );

    // Verify email sent
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your data export is ready',
      }),
    );

    // Verify successful result
    expect(result).toEqual({
      success: true,
      message: 'user@example.com data exported successfully.',
      downloadUrl: 'https://download-url.com',
    });
  });

  it('should handle missing userId', async () => {
    await expect(exportData({ userId: '', userEmail: 'user@example.com' })).rejects.toThrow(
      'User ID is required.',
    );
  });

  it('should handle no meals data', async () => {
    // Mock empty meals collection
    mockAccountRef.collection.mockImplementation((collectionName) => {
      if (collectionName === 'meals') {
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    });

    // Call the function
    const result = await exportData({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Should fail with appropriate message
    expect(result).toEqual({
      success: false,
      message: expect.stringContaining('No data found'),
    });
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
    const result = await exportData({
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
