/**
 * Advanced Configuration Example
 * 
 * Demonstrates advanced logger configuration with all transports
 */

import { Logger } from '../src';

// Advanced configuration with custom limits and multiple transports
const logger = new Logger({
  service: 'advanced-app',
  
  // Custom serialization limits
  limits: {
    stackLimit: 2000,
    responseDataLimit: 1000,
    causeMaxDepth: 5,
  },

  // Default log level
  level: 'debug',

  // Transport configuration
  transports: {
    // Console with custom component filtering
    console: {
      enabled: true,
      level: 'info',
      colorize: true,
      entries: ['timestamp', 'level', 'origin', 'identifier', 'message', 'errorID'],
    },

    // Main log file
    file: {
      enabled: true,
      filename: 'logs/app.log',
      level: 'silly',
      entries: 'default',
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
      zippedArchive: true,
    },

    // Error-only file
    errorFile: {
      enabled: true,
      filename: 'logs/errors.ndjson',
      entries: 'default',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    },

    // Discord webhook (commented out - add your webhook URLs)
    // discord: {
    //   enabled: true,
    //   webhookUrls: [
    //     'https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN',
    //     'https://discord.com/api/webhooks/BACKUP_WEBHOOK_ID/BACKUP_WEBHOOK_TOKEN',
    //   ],
    //   level: 'error',
    //   entries: ['timestamp', 'level', 'origin', 'identifier', 'message', 'error', 'errorID', 'sessionID'],
    //   maxRetries: 3,
    //   retryDelay: 1000,
    //   maxMessageLength: 1900,
    // },

    // Sentry integration (commented out - add your DSN)
    // sentry: {
    //   enabled: true,
    //   dsn: 'https://your-sentry-dsn@sentry.io/project-id',
    //   environment: 'production',
    //   tracesSampleRate: 1.0,
    //   level: 'error',
    //   entries: 'default',
    // },

    // Google Cloud Logging (commented out - add your project ID)
    // gcp: {
    //   enabled: true,
    //   projectId: 'your-gcp-project-id',
    //   keyFilename: '/path/to/service-account-key.json',
    //   logName: 'advanced-app-logs',
    //   level: 'info',
    //   entries: 'default',
    // },
  },
});

// Create multiple scoped loggers
const mainLog = logger.createLogger('Main');
const dbLog = logger.createLogger('Database');
const apiLog = logger.createLogger('API');

console.log('\n=== Advanced Configuration Demo ===\n');

// Main application logging
mainLog.info('Application initialized', 'startup', {
  meta: {
    version: '1.0.0',
    environment: 'production',
    nodeVersion: process.version,
  },
});

// Database module logging
const dbSessionID = Logger.createSessionID();
dbLog.debug('Connecting to database', 'db-connect', {
  sessionID: dbSessionID,
  meta: {
    host: 'localhost',
    port: 5432,
    database: 'myapp',
  },
});

dbLog.info('Database connection established', 'db-connect', {
  sessionID: dbSessionID,
});

// API module logging with error
const apiError: any = new Error('Rate limit exceeded');
apiError.code = 'RATE_LIMIT_ERROR';
apiError.response = {
  status: 429,
  statusText: 'Too Many Requests',
  data: {
    message: 'Rate limit exceeded',
    retryAfter: 60,
    limit: 100,
    remaining: 0,
  },
};

apiLog.error('API call failed due to rate limiting', 'api-request', {
  error: apiError,
  comment: 'Should implement exponential backoff',
  meta: {
    endpoint: '/api/v1/users',
    method: 'POST',
    requestId: 'req-abc123',
  },
});

// Discord webhook example (only sent if Discord transport is enabled and sendDiscordWebhook is true)
mainLog.error('Critical system error', 'system-monitor', {
  error: new Error('Memory usage exceeded 90%'),
  sendDiscordWebhook: true, // This will trigger Discord notification if configured
  meta: {
    memoryUsage: process.memoryUsage(),
    uptime: process.uptime(),
  },
});

// Nested error with cause chain
const rootCause = new Error('Network timeout');
const intermediateError = new Error('Failed to fetch data');
(intermediateError as any).cause = rootCause;
const topError = new Error('Request processing failed');
(topError as any).cause = intermediateError;

apiLog.error('Request failed with nested causes', 'request-handler', {
  error: topError,
  meta: {
    requestUrl: 'https://api.example.com/data',
  },
});

console.log('\n=== Advanced Configuration Demo Complete ===\n');
console.log('Check logs/ directory for output files\n');
