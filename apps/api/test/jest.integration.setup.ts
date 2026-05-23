// Jest integration test setup - runs before all tests
// This file is loaded before any tests to ensure environment variables are set

// Load test environment variables with absolute path
const path = require('path');
const envTestPath = path.join(__dirname, '..', '.env.test');
require('dotenv').config({ path: envTestPath });

// Critical: Verify REDIS_URL was loaded
if (!process.env.REDIS_URL) {
  throw new Error(`REDIS_URL not found after loading ${envTestPath}. Current cwd: ${process.cwd()}`);
}

// Log successful load (visible in test output)
console.log('✓ Environment loaded:', {
  REDIS_URL: process.env.REDIS_URL ? 'Set (Upstash)' : 'Missing',
  DATABASE_URL: process.env.DATABASE_URL ? 'Set (Neon)' : 'Missing',
});

// Set required environment variables with defaults for local testing
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
process.env.JWT_ACCESS_EXPIRY ??= '15m';
process.env.JWT_REFRESH_EXPIRY ??= '7d';

// Only set DATABASE_URL default if not already set (allows CI to override)
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://cortexgrid:cortexgrid@localhost:5432/cortexgrid?schema=public';
}

