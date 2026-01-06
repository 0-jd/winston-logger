/**
 * Logger Module Main Entry Point
 * 
 * Exports all public APIs
 */

// Main Logger class
export { Logger } from './logger/logger';

// Types
export type {
  LogLevel,
  SessionID,
  ErrorID,
  ErrorObject,
  LogEntry,
  LogEntries,
  LogEntryComponent,
  SerializationLimits,
  LoggerConfig,
  ScopedLoggerOptions,
  IScopedLogger,
  // Transport configs
  BaseTransportConfig,
  ConsoleTransportConfig,
  FileTransportConfig,
  DiscordTransportConfig,
  SentryTransportConfig,
  GCPTransportConfig,
  TransportConfigs,
} from './types';

// Utility functions
export { createSessionID, createErrorID } from './utils/id-generation';
export { serializeError } from './utils/error-serialization';
export { isErrorLike, isValidSessionID, isValidErrorID } from './utils/validation';

// Default constants
export { DEFAULT_LIMITS } from './config/defaults';
