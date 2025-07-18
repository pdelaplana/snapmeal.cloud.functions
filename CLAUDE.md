# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **SnapMeal Firebase Cloud Functions** project - a meal tracking application backend built with TypeScript using Firebase Functions v2 and Node.js 22. The system implements an asynchronous job queue for handling user data operations like account deletion and data export.

## Development Commands

### Essential Commands
- `npm run build` - Compile TypeScript to JavaScript (outputs to `lib/` directory)
- `npm run build:watch` - Compile TypeScript in watch mode for development
- `npm run lint` - Run Biome linter for code quality and style checking
- `npm run format` - Format code using Biome formatter
- `npm run check` - Run comprehensive Biome checks (lint + format)
- `npm run serve` - Build and start Firebase emulators for local development
- `npm run shell` - Build and start Firebase Functions shell for testing
- `npm run deploy` - Deploy functions to Firebase (production)
- `npm run logs` - View Firebase Functions logs

### Testing Commands
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:endpoints` - Test deployed functions (runs `../test-deployed-functions.js`)

### Testing Functions Locally
- Use `npm run serve` to start local emulators
- Use `npm run shell` for interactive testing of functions
- Firebase emulators provide a local development environment
- Test coverage reports are generated in `coverage/` directory

## Code Architecture

### Project Structure
```
functions/
├── src/
│   ├── index.ts              # Main entry point - exports all Cloud Functions
│   ├── config/
│   │   ├── firebase.ts       # Firebase Admin SDK & Firestore configuration
│   │   └── sentry.ts         # Sentry error tracking initialization
│   ├── functions/
│   │   ├── healthCheck.ts    # HTTP health check endpoint
│   │   ├── queueJob.ts       # Callable function to queue async jobs
│   │   └── processJob.ts     # Firestore trigger to process queued jobs
│   ├── jobs/
│   │   ├── deleteAccount.ts  # Account deletion job implementation
│   │   └── exportData.ts     # Data export job implementation
│   ├── helpers/
│   │   └── sendEmail.ts      # Email notification utilities (Mailgun)
│   ├── types/
│   │   └── jobTypes.ts       # TypeScript type definitions for jobs
│   └── __tests__/            # Jest test files
├── lib/                      # Compiled JavaScript output (generated)
├── coverage/                 # Test coverage reports (generated)
├── package.json              # Dependencies and scripts
└── tsconfig.json             # TypeScript configuration
```

### Key Components

**Main Entry Point (`src/index.ts`)**
- Initializes Firebase and Sentry configurations on import
- Exports three main functions: `healthcheck`, `processJob`, `queueJob`
- Clean, minimal entry point with proper initialization order

**Firebase Configuration (`src/config/firebase.ts`)**
- Function-based initialization with `initializeFirebase()` returning `{ admin, db }`
- Configurable database ID and storage bucket via environment parameters
- Conditional initialization: service account file for local dev, default credentials for production
- Lazy initialization pattern for better testability and resource management
- Helper function `getCurrentDatabaseId()` for accessing current database configuration
- Proper error handling and logging for initialization

**Sentry Configuration (`src/config/sentry.ts`)**
- Error tracking and performance monitoring setup
- Environment-specific configuration
- Full trace sampling for comprehensive monitoring

### Core Functions

**Health Check (`functions/healthCheck.ts`)**
- HTTP endpoint for service health monitoring
- Returns uptime, timestamp, and status
- Structured logging with Firebase logger

**Job Queue System**
1. **Queue Job (`functions/queueJob.ts`)**
   - Callable HTTPS function for authenticated users
   - Validates user authentication and job parameters
   - Creates job documents in Firestore `jobs` collection
   - Supports priority-based job scheduling

2. **Process Job (`functions/processJob.ts`)**
   - Firestore trigger on new documents in `jobs/{jobId}` collection
   - Routes jobs to appropriate handlers based on `jobType`
   - Updates job status (completed/failed) with attempt tracking
   - Comprehensive error handling with Sentry integration

### Job Types and Implementations

**Delete Account Job (`jobs/deleteAccount.ts`)**
- Comprehensive user data deletion:
  - Firestore user document and `meals` subcollection
  - Firebase Authentication account
  - Firebase Storage files under `users/{userId}/`
- Email confirmation notification
- Proper error handling with partial cleanup logging

**Export Data Job (`jobs/exportData.ts`)**
- Exports user's meals data to CSV format
- Converts Firestore timestamps to readable dates
- Uploads to Firebase Storage with signed download URL
- Email notification with 7-day expiration link
- Temporary file cleanup

### Type System

**Job Types (`types/jobTypes.ts`)**
- Strong TypeScript typing for job queue system
- Job status tracking: `pending | in-progress | completed | failed`
- Includes metadata: priority, timestamps, error tracking, retry attempts

### Utilities and Helpers

**Email Service (`helpers/sendEmail.ts`)**
- Mailgun integration for transactional emails
- Configurable via environment variables (`MAILGUN_DOMAIN`, `MAILGUN_API_KEY`)
- Type-safe email interface

## Technology Stack

### Core Technologies
- **Firebase Functions v2** - Serverless compute platform
- **TypeScript 4.9** - Type-safe JavaScript development
- **Node.js 22** - Runtime environment
- **Firestore** - NoSQL document database
- **Firebase Storage** - File storage service
- **Firebase Authentication** - User authentication

### Key Dependencies
- **firebase-admin 12.6.0** - Firebase Admin SDK
- **firebase-functions 6.0.1** - Functions framework
- **@sentry/node 9.35.0** - Error tracking and monitoring
- **nodemailer 7.0.4** + **nodemailer-mailgun-transport** - Email delivery
- **json2csv 6.0.0** - CSV export functionality

### Development Tools
- **Biome 2.1.1** - Fast linter, formatter, and code analyzer (replaces ESLint/Prettier)
- **Jest 30.0.4** - Testing framework with TypeScript support
- **firebase-functions-test 3.1.0** - Firebase Functions testing utilities

## Development Guidelines

### Firebase Initialization Pattern
The project uses a functional initialization approach:
```typescript
// In job functions and other modules
const { admin, db } = initializeFirebase();
```

**Key Benefits:**
- Lazy initialization - Firebase is only initialized when needed
- Better testability - easier to mock in unit tests
- Cleaner dependency management
- Consistent error handling across all functions

**Important Notes:**
- The `processJob` function currently uses a hard-coded database reference (`'development'`)
- This requires deployment-time configuration for different environments
- Firebase Admin SDK handles multiple initialization calls gracefully

### TypeScript Configuration
- Target: ES2017 with CommonJS modules for Node.js compatibility
- Strict mode enabled with comprehensive type checking
- Source maps generated for debugging
- Output directory: `lib/`
- Force consistent casing and skip lib checks for performance

### Code Style (Biome Configuration)
- 2-space indentation, 100-character line width
- Single quotes for JavaScript/TypeScript
- Semicolons always required
- Auto-organize imports enabled
- Recommended linting rules with enhanced strictness

### Environment Configuration
**Required Environment Variables:**
- `DATABASE_ID` - Firestore database ID (default: "development")
- `STORAGE_BUCKET` - Firebase Storage bucket name
- `SENTRY_DSN` - Sentry project DSN for error tracking
- `ENVIRONMENT` - Environment name for monitoring
- `MAILGUN_DOMAIN` - Mailgun domain for email delivery
- `MAILGUN_API_KEY` - Mailgun API key for authentication

**Local Development:**
- Node.js 22 required
- `firebase-service-account.json` file for local Firebase admin access
- Firebase CLI for emulator and deployment commands

### Error Handling and Monitoring
- Sentry integration for error tracking and performance monitoring
- Structured logging with Firebase Functions logger
- Comprehensive error handling in all async operations
- Job retry logic with attempt tracking

### Testing Strategy
- Jest testing framework with TypeScript support
- Test coverage reporting enabled
- Separate test configurations for unit and integration tests
- Firebase Functions test utilities for Cloud Functions testing
- Comprehensive mocking strategy for Firebase services and parameters
- Mock for `firebase-functions/params` to handle runtime parameters in tests

## Firebase Configuration

**firebase.json Configuration:**
- Functions source directory: `functions/`
- Pre-deploy hooks: lint and build validation
- Proper ignore patterns for node_modules and temporary files
- Single codebase deployment strategy

**Database Architecture:**
- `users/{userId}` - User profile documents
- `users/{userId}/meals` - User's meal tracking subcollection
- `jobs/{jobId}` - Async job queue collection

**Storage Structure:**
- `users/{userId}/exports/` - User data export files
- `users/{userId}/` - User-specific file storage

## Security Considerations
- Authentication required for all user-facing functions
- User data isolation via userId-based access control
- Secure credential management via environment variables
- Storage access via signed URLs with expiration
- Comprehensive input validation and error handling