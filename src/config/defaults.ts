/**
 * Configuration Defaults
 * 
 * Default values for logger configuration
 */

import type { SerializationLimits, TransportConfigs } from '../types';

/**
 * Default serialization limits
 */
export const DEFAULT_LIMITS: SerializationLimits = {
  stackLimit: 1000,
  responseDataLimit: 500,
  causeMaxDepth: 3,
};

/**
 * Default transport configurations
 * All transports disabled by default except console
 */
export const DEFAULT_TRANSPORT_CONFIGS: TransportConfigs = {
  console: {
    enabled: true,
    level: 'info',
    entries: 'default',
    colorize: true,
  },
  file: {
    enabled: false,
    filename: 'app.log',
    level: 'silly',
    entries: 'default',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
    tailable: true,
  },
  errorFile: {
    enabled: false,
    filename: 'errors.ndjson',
    level: 'error',
    entries: 'default',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  },
  discord: {
    enabled: false,
    webhookUrls: [],
    level: 'error',
    entries: 'default',
    maxRetries: 3,
    retryDelay: 1000,
    maxMessageLength: 2000,
  },
  sentry: {
    enabled: false,
    dsn: '',
    level: 'error',
    entries: 'default',
    environment: 'production',
    tracesSampleRate: 1.0,
  },
  gcp: {
    enabled: false,
    projectId: '',
    level: 'info',
    entries: 'default',
  },
};
