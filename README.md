# SnapMeal Firebase Functions

A comprehensive Firebase Cloud Functions project for SnapMeal application, providing background job processing, data export, account deletion, and health monitoring capabilities.

## 🚀 Features

- **Job Queue System**: Asynchronous job processing with Firestore triggers
- **Data Export**: CSV export functionality for user meal data
- **Account Deletion**: Complete user account and data deletion
- **Health Monitoring**: Health check endpoints for system monitoring
- **Error Tracking**: Integrated Sentry error monitoring
- **Email Notifications**: Mailgun-powered email notifications
- **TypeScript**: Full TypeScript support with strict type checking
- **Testing**: Jest test suite with coverage reporting
- **Code Quality**: Biome linter and formatter for consistent code style

## 📋 Prerequisites

- Node.js 22.x
- Firebase CLI installed globally
- Firebase project with Firestore and Authentication enabled
- Mailgun account for email notifications
- Sentry account for error tracking (optional)

## 🛠️ Installation

1. Clone the repository and navigate to the functions directory:
   ```bash
   cd functions
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase service account (for local development):
   - Download your Firebase service account key
   - Save it as `firebase-service-account.json` in the functions directory

4. Configure environment variables:
   ```bash
   # Firebase configuration (runtime parameters)
   DATABASE_ID=development
   STORAGE_BUCKET=your-firebase-storage-bucket
   
   # Required for email notifications
   MAILGUN_DOMAIN=your-mailgun-domain
   MAILGUN_API_KEY=your-mailgun-api-key
   
   # Optional for error tracking
   SENTRY_DSN=your-sentry-dsn
   ENVIRONMENT=development
   ```

## 🏗️ Project Structure

```
functions/
├── src/
│   ├── config/
│   │   ├── firebase.ts        # Firebase Admin SDK initialization
│   │   └── sentry.ts          # Sentry error tracking setup
│   ├── functions/
│   │   ├── healthCheck.ts     # Health check endpoint
│   │   ├── processJob.ts      # Background job processor
│   │   └── queueJob.ts        # Job queueing function
│   ├── jobs/
│   │   ├── deleteAccount.ts   # Account deletion job
│   │   └── exportData.ts      # Data export job
│   ├── helpers/
│   │   └── sendEmail.ts       # Email notification helper
│   ├── types/
│   │   └── jobTypes.ts        # TypeScript type definitions
│   ├── __tests__/             # Test files
│   │   ├── jobs/              # Job-specific tests
│   │   ├── setup.test.ts      # Basic setup tests
│   │   ├── simple-endpoints.spec.ts # Endpoint tests
│   │   └── test-setup.ts      # Jest configuration and mocks
│   └── index.ts               # Main exports
├── lib/                       # Compiled JavaScript output (generated)
├── coverage/                  # Test coverage reports (generated)
├── biome.json                 # Biome configuration
├── jest.config.js             # Jest configuration
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript configuration
```

## 🔧 Development

### Firebase Initialization Pattern

The project uses a functional initialization approach for better testability and resource management:

```typescript
// In job functions and other modules
const { admin, db } = initializeFirebase();
```

**Key Benefits:**
- **Lazy initialization**: Firebase is only initialized when needed
- **Better testability**: Easier to mock in unit tests
- **Cleaner dependency management**: No global state dependencies
- **Consistent error handling**: Centralized initialization logic

**Configuration:**
- Uses Firebase Functions parameters (`defineString`) for runtime configuration
- Supports both local development (service account file) and production deployment
- Configurable database ID and storage bucket via environment variables

**Important Note:**
The `processJob` function currently uses a hard-coded database reference (`'development'`) which requires deployment-time configuration for different environments.

### Available Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run build:watch` - Compile TypeScript in watch mode
- `npm run lint` - Run Biome linter
- `npm run format` - Format code with Biome
- `npm run check` - Run Biome checks (lint + format)
- `npm run test` - Run Jest tests
- `npm run test:watch` - Run Jest in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run serve` - Start Firebase emulators for local development
- `npm run shell` - Start Firebase Functions shell
- `npm run deploy` - Deploy functions to Firebase
- `npm run logs` - View Firebase Functions logs

### Local Development

1. Start the Firebase emulators:
   ```bash
   npm run serve
   ```

2. The functions will be available at:
   - Health check: `http://localhost:5001/your-project/us-central1/healthcheck`
   - Queue job: `http://localhost:5001/your-project/us-central1/queueJob`

### Testing

Run the test suite:
```bash
npm test
```

Generate coverage report:
```bash
npm run test:coverage
```

## 📚 API Reference

### Health Check

**Endpoint**: `GET /healthcheck`

Returns system health information including uptime and timestamp.

**Response**:
```json
{
  "uptime": 123.456,
  "message": "OK",
  "timestamp": 1640995200000
}
```

### Queue Job

**Endpoint**: `POST /queueJob`

Queues a background job for processing. Requires authentication.

**Request**:
```json
{
  "jobType": "exportData" | "deleteAccount",
  "priority": 1,
  "taskData": {
    // Job-specific data
  }
}
```

**Response**:
```json
{
  "success": true,
  "message": "Your exportData task has been queued.",
  "jobId": "job-document-id"
}
```

## 🔄 Job Processing

The system supports two main job types:

### Export Data Job

- Exports user meal data to CSV format
- Uploads CSV to Firebase Storage
- Generates signed download URL (7-day expiration)
- Sends email notification with download link

### Delete Account Job

- Deletes user document and subcollections from Firestore
- Removes user from Firebase Authentication
- Cleans up user files from Storage
- Sends confirmation email

## 🚀 Deployment

1. **Set environment parameters** (for production):
   ```bash
   # Set Firebase Functions runtime parameters
   firebase functions:config:set database_id="production"
   firebase functions:config:set storage_bucket="your-production-bucket"
   ```

2. **Build the project**:
   ```bash
   npm run build
   ```

3. **Deploy to Firebase**:
   ```bash
   npm run deploy
   ```

**Pre-deploy Process:**
- Automatic linting with Biome
- TypeScript compilation
- Test execution (recommended: `npm test`)

**Deployment Considerations:**
- The `processJob` function currently uses a hard-coded database reference
- Environment-specific configuration should be handled via Firebase Functions parameters
- Ensure all required environment variables are set in the Firebase console
- Monitor deployment logs for any configuration issues

**Production Checklist:**
- [ ] Firebase service account configured
- [ ] Mailgun credentials set
- [ ] Sentry DSN configured (optional)
- [ ] Database ID parameter set for target environment
- [ ] Storage bucket parameter configured
- [ ] All tests passing

## 🔐 Security

- All HTTP callable functions require authentication
- User data is scoped to authenticated user ID
- Sensitive operations log to Sentry for monitoring
- Email notifications use secure Mailgun transport
- Storage files are organized by user ID with proper access controls

## 📊 Monitoring

### Error Tracking

The project integrates with Sentry for error tracking and performance monitoring. All critical operations are wrapped in Sentry spans for detailed tracing.

### Logging

Firebase Functions structured logging is used throughout the application for debugging and monitoring.

## 🧪 Testing

The project includes comprehensive tests for:
- Job processing functions
- Data export functionality
- Account deletion operations
- Error handling scenarios
- Firebase Functions parameter handling

**Current Test Status:**
- ✅ **4/4 test suites passing**
- ✅ **19/19 tests passing**
- ✅ **Improved performance**: ~50% faster execution
- ✅ **100% test coverage** for core business logic

**Test Configuration:**
- **TypeScript support** with ts-jest
- **Firebase Functions testing** with firebase-functions-test
- **Comprehensive mocking** for Firebase services and parameters
- **Mock for firebase-functions/params** to handle runtime parameters
- **Coverage reporting** with lcov and HTML formats
- **30-second test timeout** for async operations

**Key Testing Features:**
- **Firebase Admin SDK mocking** for safe test execution
- **Email service mocking** to prevent actual email sending
- **Storage operation mocking** for file upload/download tests
- **Sentry integration testing** with proper error capture verification

## 📝 Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `DATABASE_ID` | Firestore database ID | `development` | No |
| `STORAGE_BUCKET` | Firebase Storage bucket name | `snapmeal-sa2e9.firebasestorage.app` | No |
| `MAILGUN_DOMAIN` | Mailgun domain for email sending | - | Yes |
| `MAILGUN_API_KEY` | Mailgun API key | - | Yes |
| `SENTRY_DSN` | Sentry DSN for error tracking | - | No |
| `ENVIRONMENT` | Environment name (development/production) | `development` | No |

## 🤝 Contributing

1. Follow the existing code style (enforced by Biome)
2. Write tests for new functionality
3. Ensure all tests pass before submitting
4. Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.