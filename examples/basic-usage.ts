/**
 * Basic Usage Example
 * 
 * Demonstrates basic logger usage with minimal configuration
 */

import { Logger } from '../src';

// Create logger instance
const logger = new Logger({
  service: 'example-app',
  transports: {
    console: {
      enabled: true,
      level: 'info',
      entries: 'default',
    },
    file: {
      enabled: true,
      filename: 'app.log',
      level: 'silly',
      entries: 'default',
    },
    errorFile: {
      enabled: true,
      filename: 'errors.ndjson',
      entries: 'default',
    },
  },
});

// Create scoped logger for this module
const log = logger.createLogger('BasicExample');

// Basic logging
console.log('\n=== Basic Logging ===\n');
log.info('Application started successfully', 'startup');
log.debug('Debug message with identifier', 'debug-test');
log.warn('This is a warning', 'warning-test');

// Logging with metadata
console.log('\n=== Logging with Metadata ===\n');
log.info('User action recorded', 'user-action', {
  meta: {
    userId: 12345,
    action: 'login',
    timestamp: Date.now(),
  },
});

// Logging with session ID
console.log('\n=== Logging with Session ID ===\n');
const sessionID = Logger.createSessionID();
log.info('Session started', 'session-start', {
  sessionID,
  meta: {
    userAgent: 'Mozilla/5.0',
    ip: '192.168.1.1',
  },
});

log.info('Session activity', 'session-activity', {
  sessionID,
  comment: 'User navigated to dashboard',
});

// Error logging
console.log('\n=== Error Logging ===\n');

// Without errorID (will auto-generate)
try {
  throw new Error('Something went wrong');
} catch (err) {
  log.error('An error occurred', 'error-handler', {
    error: err,
    comment: 'This error was caught in the main try-catch block',
  });
}

// With explicit errorID and sessionID
const errorID = Logger.createErrorID();
try {
  JSON.parse('invalid json');
} catch (err) {
  log.error('Failed to parse JSON', 'json-parser', {
    error: err,
    errorID,
    sessionID,
    meta: {
      input: 'invalid json',
    },
  });
}

// HTTP error with response details
console.log('\n=== HTTP Error Example ===\n');
const httpError: any = new Error('Request failed');
httpError.code = 'ERR_HTTP';
httpError.response = {
  status: 500,
  statusText: 'Internal Server Error',
  data: { message: 'Database connection failed', details: 'Connection timeout after 30s' },
};

log.error('HTTP request failed', 'http-client', {
  error: httpError,
  meta: {
    url: 'https://api.example.com/users',
    method: 'GET',
  },
});

console.log('\n=== Examples Complete ===\n');
console.log('Check app.log and errors.ndjson for full output\n');
