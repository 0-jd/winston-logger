/**
 * Core type definitions for the logger module
 * This file contains all TypeScript types and interfaces used throughout the logger
 */

// ============================================================================
// Log Levels
// ============================================================================

/**
 * Supported log levels ordered from most verbose to least
 */
export type LogLevel = 'silly' | 'debug' | 'info' | 'warn' | 'error';

// ============================================================================
// Branded ID Types
// ============================================================================

/**
 * Session identifier with format: sid-${string}
 * Branded type to prevent accidental mixing with regular strings
 */
export type SessionID = string & { __brand: 'SessionID' };

/**
 * Error identifier with format: eid-${string}
 * Branded type to prevent accidental mixing with regular strings
 */
export type ErrorID = string & { __brand: 'ErrorID' };

// ============================================================================
// Error Object Structure
// ============================================================================

/**
 * Structured error object that can be included in log entries
 */
export interface ErrorObject {
  /** Error name (e.g., 'TypeError', 'ValidationError') */
  name?: string;
  
  /** Error message - always required */
  message: string;
  
  /** Stack trace (truncated to configured limit) */
  stack?: string;
  
  /** Error code (e.g., 'ENOENT', 'ERR_INVALID_ARG') */
  code?: string | number;
  
  /** Causal error (depth-limited to prevent deep recursion) */
  cause?: ErrorObject;
  
  /** HTTP response details if error comes from HTTP request */
  response?: {
    status?: number;
    statusText?: string;
    data?: string; // Truncated response data
  };
}

// ============================================================================
// Log Entry Structure
// ============================================================================

/**
 * Complete log entry structure
 * This is the shape of every log message processed by the logger
 */
export interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  
  /** Log level */
  level: LogLevel;
  
  /** Origin string from createLogger() - typically filename or module name */
  origin: string;
  
  /** Short identifier for specific code location */
  identifier: string;
  
  /** Whether this log should be sent to Discord webhook */
  sendDiscordWebhook: boolean;
  
  /** Primary log message */
  message: string;
  
  /** Service name from logger configuration */
  service: string;
  
  /** Optional session identifier */
  sessionID: SessionID | null;
  
  /** Optional error identifier (auto-generated for error logs if not provided) */
  errorID: ErrorID | null;
  
  /** Structured error object */
  error?: ErrorObject;
  
  /** User-defined comment */
  comment?: string;
  
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
}

// ============================================================================
// Log Entry Components (for filtering)
// ============================================================================

/**
 * Valid log entry component names that can be used in transport configuration
 */
export type LogEntryComponent = 
  | 'timestamp'
  | 'level'
  | 'origin'
  | 'identifier'
  | 'sendDiscordWebhook'
  | 'message'
  | 'service'
  | 'sessionID'
  | 'errorID'
  | 'error'
  | 'comment'
  | 'meta';

// ============================================================================
// Logger Arguments
// ============================================================================

/**
 * Optional entries object passed to logging methods
 */
export interface LogEntries {
  /** Structured error object */
  error?: ErrorObject | unknown;
  
  /** Whether to send to Discord webhook */
  sendDiscordWebhook?: boolean;
  
  /** User-defined comment */
  comment?: string;
  
  /** Arbitrary metadata */
  meta?: Record<string, unknown>;
  
  /** Session identifier */
  sessionID?: SessionID;
  
  /** Error identifier */
  errorID?: ErrorID;
}

// ============================================================================
// Serialization Limits
// ============================================================================

/**
 * Configuration for error serialization limits
 */
export interface SerializationLimits {
  /** Maximum length for stack traces */
  stackLimit: number;
  
  /** Maximum length for HTTP response data */
  responseDataLimit: number;
  
  /** Maximum depth for error.cause chain */
  causeMaxDepth: number;
}

// ============================================================================
// Transport Configuration
// ============================================================================

/**
 * Base transport configuration
 */
export interface BaseTransportConfig {
  /** Whether this transport is enabled */
  enabled: boolean;
  
  /** Minimum log level for this transport */
  level?: LogLevel;
  
  /** Which log entry components to include ("default" or array of component names) */
  entries: 'default' | LogEntryComponent[];
}

/**
 * Console transport configuration
 */
export interface ConsoleTransportConfig extends BaseTransportConfig {
  /** Use colors in console output */
  colorize?: boolean;
}

/**
 * File transport configuration
 */
export interface FileTransportConfig extends BaseTransportConfig {
  /** Path to log file */
  filename: string;
  
  /** Maximum size of log file before rotation */
  maxsize?: number;
  
  /** Maximum number of log files to keep */
  maxFiles?: number;
  
  /** Use tailable logs */
  tailable?: boolean;
  
  /** Use compression for rotated logs */
  zippedArchive?: boolean;
}

/**
 * Discord webhook transport configuration
 */
export interface DiscordTransportConfig extends BaseTransportConfig {
  /** Array of Discord webhook URLs (failover support) */
  webhookUrls: string[];
  
  /** Maximum retry attempts per webhook */
  maxRetries?: number;
  
  /** Initial retry delay in milliseconds */
  retryDelay?: number;
  
  /** Maximum message length (Discord limit is 2000) */
  maxMessageLength?: number;
}

/**
 * Sentry transport configuration
 */
export interface SentryTransportConfig extends BaseTransportConfig {
  /** Sentry DSN */
  dsn: string;
  
  /** Environment (e.g., 'production', 'development') */
  environment?: string;
  
  /** Traces sample rate (0.0 to 1.0) */
  tracesSampleRate?: number;
  
  /** Additional Sentry options */
  sentryOptions?: Record<string, unknown>;
}

/**
 * Google Cloud Logging transport configuration
 */
export interface GCPTransportConfig extends BaseTransportConfig {
  /** GCP project ID */
  projectId: string;
  
  /** Path to service account key file */
  keyFilename?: string;
  
  /** Log name in GCP */
  logName?: string;
  
  /** Monitored resource */
  resource?: {
    type: string;
    labels?: Record<string, string>;
  };
  
  /** Additional GCP logging options */
  gcpOptions?: Record<string, unknown>;
}

/**
 * All transport configurations
 */
export interface TransportConfigs {
  console?: ConsoleTransportConfig;
  file?: FileTransportConfig;
  errorFile?: FileTransportConfig;
  discord?: DiscordTransportConfig;
  sentry?: SentryTransportConfig;
  gcp?: GCPTransportConfig;
}

// ============================================================================
// Logger Configuration
// ============================================================================

/**
 * Main logger configuration
 */
export interface LoggerConfig {
  /** Service name (required) */
  service: string;
  
  /** Transport configurations */
  transports?: TransportConfigs;
  
  /** Error serialization limits */
  limits?: Partial<SerializationLimits>;
  
  /** Default log level */
  level?: LogLevel;
}

/**
 * Scoped logger override options
 */
export interface ScopedLoggerOptions {
  /** Override transport configurations for this scoped logger */
  transports?: Partial<TransportConfigs>;
}

// ============================================================================
// Scoped Logger Interface
// ============================================================================

/**
 * Interface for scoped logger instances
 */
export interface IScopedLogger {
  /** Log at silly level */
  silly(message: string, identifier: string, entries?: LogEntries): void;
  
  /** Log at debug level */
  debug(message: string, identifier: string, entries?: LogEntries): void;
  
  /** Log at info level */
  info(message: string, identifier: string, entries?: LogEntries): void;
  
  /** Log at warn level */
  warn(message: string, identifier: string, entries?: LogEntries): void;
  
  /** Log at error level */
  error(message: string, identifier: string, entries?: LogEntries): void;
}
