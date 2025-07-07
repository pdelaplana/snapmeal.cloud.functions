# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Firebase Cloud Functions** project written in TypeScript using Firebase Functions v2 with Node.js 22. The project structure follows the standard Firebase Functions layout with source code in TypeScript that compiles to JavaScript.

## Development Commands

### Essential Commands
- `npm run build` - Compile TypeScript to JavaScript (outputs to `lib/` directory)
- `npm run build:watch` - Compile TypeScript in watch mode for development
- `npm run lint` - Run ESLint to check code quality and style
- `npm run serve` - Build and start Firebase emulators for local development
- `npm run shell` - Build and start Firebase Functions shell for testing
- `npm run deploy` - Deploy functions to Firebase (production)
- `npm run logs` - View Firebase Functions logs

### Testing Functions Locally
- Use `npm run serve` to start local emulators
- Use `npm run shell` for interactive testing of functions
- Firebase emulators provide a local development environment

## Code Architecture

### Project Structure
```
functions/
├── src/
│   ├── index.ts          # Main entry point for Cloud Functions
│   └── config/
│       └── firebase.ts   # Firebase Admin SDK initialization
├── lib/                  # Compiled JavaScript output (generated)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── tsconfig.dev.json     # Development TypeScript config
```

### Key Components

**Main Entry Point (`src/index.ts`)**
- Contains commented template for Firebase Functions
- Uses Firebase Functions v2 API (`onRequest`, `onCall`, etc.)
- Functions should be exported from this file to be deployed

**Firebase Configuration (`src/config/firebase.ts`)**
- Handles Firebase Admin SDK initialization
- Supports both local development (with service account file) and production deployment
- Uses conditional initialization based on environment

### Firebase Functions Architecture
- Uses Firebase Functions v2 (`firebase-functions/v2/https`)
- Supports multiple trigger types (HTTP, Firestore, Auth, etc.)
- Functions are deployed as individual endpoints
- Uses structured logging with `firebase-functions/logger`

## Development Guidelines

### TypeScript Configuration
- Target: ES2017 with Node.js compatibility
- Strict mode enabled with additional safety checks
- Source maps generated for debugging
- Output directory: `lib/`

### Code Style
- ESLint configured with Google style guide
- TypeScript ESLint rules enabled
- Import plugin for module resolution

### Environment Setup
- Node.js 22 required
- Firebase service account file (`firebase-service-account.json`) for local development
- Production deployment uses default Firebase credentials

## Firebase Configuration

The project uses `firebase.json` for deployment configuration:
- Functions source directory: `functions/`
- Pre-deploy hooks: lint and build
- Standard ignore patterns for node_modules and temporary files