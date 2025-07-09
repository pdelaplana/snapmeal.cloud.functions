import * as fs from 'node:fs';

import * as admin from 'firebase-admin';
import { sendEmailNotification } from '../../helpers/sendEmail';
import { exportData } from '../../jobs/exportData';

// Mock firebase-admin and other dependencies
jest.mock('firebase-admin', () => {
  const firestore = {
    collection: jest.fn().mockReturnThis(),
    doc: jest.fn().mockReturnThis(),
    get: jest.fn(),
  };

  return {
    firestore: jest.fn(() => firestore),
    storage: jest.fn(() => ({
      bucket: jest.fn(),
    })),
  };
});

jest.mock('node:fs', () => ({
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(false), // Mock existsSync to return false (no service account file)
}));

jest.mock('../../helpers/sendEmail', () => ({
  sendEmailNotification: jest.fn().mockResolvedValue({}),
}));

jest.mock('@sentry/node', () => ({
  startSpan: jest.fn().mockImplementation((_, fn) => fn()),
  captureException: jest.fn(),
}));

jest.mock('firebase-functions/params', () => ({
  storageBucket: {
    value: jest.fn().mockReturnValue('test-bucket'),
  },
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

    // Setup mock firestore responses
    (admin.firestore().collection as jest.Mock).mockReturnValue({
      doc: jest.fn().mockReturnValue(mockAccountRef),
    });

    mockAccountRef.get.mockResolvedValue(mockAccountSnapshot);

    mockAccountRef.collection.mockImplementation((collectionName) => {
      if (collectionName === 'meals') {
        return { get: jest.fn().mockResolvedValue(mockMealsSnapshot) };
      }
      return { get: jest.fn().mockResolvedValue({ docs: [] }) };
    });

    // Setup storage mock
    (admin.storage as jest.Mock).mockReturnValue({
      bucket: jest.fn(() => bucket),
    });
  });

  it('should successfully export data', async () => {
    // Call the function
    const result = await exportData({
      userId: 'user1',
      userEmail: 'user@example.com',
    });

    // Verify admin.firestore was called correctly
    expect(admin.firestore().collection).toHaveBeenCalledWith('users');
    expect(admin.firestore().collection('users').doc).toHaveBeenCalledWith(
      'user1'
    );

    // Verify Firestore queries
    expect(mockAccountRef.collection).toHaveBeenCalledWith('meals');

    // Verify file operations
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(fs.unlinkSync).toHaveBeenCalled();

    // Verify storage operations
    expect(admin.storage().bucket).toHaveBeenCalled();
    expect(admin.storage().bucket().upload).toHaveBeenCalled();
    expect(admin.storage().bucket().file).toHaveBeenCalledWith(
      expect.stringMatching(/users\/user1\/exports\/meals-.*\.csv/)
    );

    // Verify email sent
    expect(sendEmailNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'Your data export is ready',
      })
    );

    // Verify successful result
    expect(result).toEqual({
      success: true,
      message: 'user@example.com data exported successfully.',
      downloadUrl: 'https://download-url.com',
    });
  });

  it('should handle missing userId', async () => {
    await expect(
      exportData({ userId: '', userEmail: 'user@example.com' })
    ).rejects.toThrow('User ID is required.');
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
    // Force an error
    (admin.firestore().collection as jest.Mock).mockImplementation(() => {
      throw new Error('Test error');
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
