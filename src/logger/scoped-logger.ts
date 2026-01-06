/**
 * Scoped Logger
 * 
 * Scoped logger instance created via createLogger()
 * Implements all log level methods and handles log entry construction
 */

import type winston from 'winston';
import type {
  IScopedLogger,
  LogLevel,
  LogEntry,
  LogEntries,
  ErrorObject,
  SessionID,
  ErrorID,
  SerializationLimits,
} from '../types';
import { createErrorID } from '../utils/id-generation';
import { serializeError } from '../utils/error-serialization';
import { isErrorLike, isValidSessionID, isValidErrorID } from '../utils/validation';

/**
 * Scoped logger implementation
 * 
 * Provides logging methods with consistent signature:
 * logger.<level>(message, identifier, entries?)
 */
export class ScopedLogger implements IScopedLogger {
  private origin: string;
  private service: string;
  private winstonLogger: winston.Logger;
  private limits: SerializationLimits;

  constructor(
    origin: string,
    service: string,
    winstonLogger: winston.Logger,
    limits: SerializationLimits
  ) {
    this.origin = origin;
    this.service = service;
    this.winstonLogger = winstonLogger;
    this.limits = limits;
  }

  silly(message: string, identifier: string, entries?: LogEntries): void {
    this.log('silly', message, identifier, entries);
  }

  debug(message: string, identifier: string, entries?: LogEntries): void {
    this.log('debug', message, identifier, entries);
  }

  info(message: string, identifier: string, entries?: LogEntries): void {
    this.log('info', message, identifier, entries);
  }

  warn(message: string, identifier: string, entries?: LogEntries): void {
    this.log('warn', message, identifier, entries);
  }

  error(message: string, identifier: string, entries?: LogEntries): void {
    this.log('error', message, identifier, entries);
  }

  /**
   * Core logging method
   * Builds complete LogEntry and delegates to Winston
   * 
   * @param level - Log level
   * @param message - Log message
   * @param identifier - Code location identifier
   * @param entries - Optional log entries
   */
  private log(
    level: LogLevel,
    message: string,
    identifier: string,
    entries?: LogEntries
  ): void {
    const timestamp = new Date().toISOString();

    // Build base log entry
    const logEntry: LogEntry = {
      timestamp,
      level,
      origin: this.origin,
      identifier,
      message,
      service: this.service,
      sendDiscordWebhook: entries?.sendDiscordWebhook ?? false,
      sessionID: this.normalizeSessionID(entries?.sessionID),
      errorID: this.normalizeErrorID(entries?.errorID, level),
    };

    // Add optional fields
    if (entries?.comment) {
      logEntry.comment = entries.comment;
    }

    if (entries?.meta) {
      logEntry.meta = entries.meta;
    }

    // Handle error serialization
    if (entries?.error) {
      logEntry.error = this.normalizeError(entries.error);
    }

    // Log to Winston
    this.winstonLogger.log(level, logEntry);
  }

  /**
   * Normalizes error to ErrorObject
   * 
   * @param error - Error value
   * @returns Structured ErrorObject
   */
  private normalizeError(error: unknown): ErrorObject {
    if (isErrorLike(error)) {
      return serializeError(error, this.limits);
    }

    // If user already provided an ErrorObject-like structure, use it
    if (error && typeof error === 'object' && 'message' in error) {
      return error as ErrorObject;
    }

    // Fallback: serialize whatever was provided
    return serializeError(error, this.limits);
  }

  /**
   * Normalizes sessionID
   * Returns null if invalid
   * 
   * @param sessionID - Session ID to normalize
   * @returns Normalized SessionID or null
   */
  private normalizeSessionID(sessionID?: SessionID): SessionID | null {
    if (!sessionID) {
      return null;
    }

    if (isValidSessionID(sessionID)) {
      return sessionID;
    }

    // Invalid format - log internal warning and return null
    console.warn(`Invalid sessionID format: ${sessionID}. Expected format: sid-{string}`);
    return null;
  }

  /**
   * Normalizes errorID
   * Auto-generates for error level if not provided
   * Returns null for other levels if not provided
   * 
   * @param errorID - Error ID to normalize
   * @param level - Log level
   * @returns Normalized ErrorID or null
   */
  private normalizeErrorID(errorID: ErrorID | undefined, level: LogLevel): ErrorID | null {
    // Auto-generate errorID for error level if not provided
    if (level === 'error' && !errorID) {
      return createErrorID();
    }

    if (!errorID) {
      return null;
    }

    if (isValidErrorID(errorID)) {
      return errorID;
    }

    // Invalid format - log internal warning and return null (or generate for error level)
    console.warn(`Invalid errorID format: ${errorID}. Expected format: eid-{string}`);
    return level === 'error' ? createErrorID() : null;
  }
}
