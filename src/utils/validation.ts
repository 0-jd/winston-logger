/**
 * Validation Utilities
 * 
 * Provides validation functions that return boolean results (never throw)
 */

import type { LogLevel, SessionID, ErrorID } from '../types';

const VALID_LOG_LEVELS: LogLevel[] = ['silly', 'debug', 'info', 'warn', 'error'];

/**
 * Validates if a string is a valid log level
 * 
 * @param level - String to validate
 * @returns true if valid log level, false otherwise
 */
export function isValidLogLevel(level: string): level is LogLevel {
  return VALID_LOG_LEVELS.includes(level as LogLevel);
}

/**
 * Validates if a string matches SessionID format: sid-{string}
 * 
 * @param id - String to validate
 * @returns true if valid session ID format, false otherwise
 */
export function isValidSessionID(id: string): id is SessionID {
  return typeof id === 'string' && id.startsWith('sid-') && id.length > 4;
}

/**
 * Validates if a string matches ErrorID format: eid-{string}
 * 
 * @param id - String to validate
 * @returns true if valid error ID format, false otherwise
 */
export function isValidErrorID(id: string): id is ErrorID {
  return typeof id === 'string' && id.startsWith('eid-') && id.length > 4;
}

/**
 * Type guard to check if a value is error-like
 * 
 * @param value - Value to check
 * @returns true if value has error-like properties
 */
export function isErrorLike(value: unknown): value is Error {
  return (
    value !== null &&
    typeof value === 'object' &&
    'message' in value &&
    typeof (value as any).message === 'string'
  );
}

/**
 * Validates if a value is a non-empty string
 * 
 * @param value - Value to check
 * @returns true if non-empty string, false otherwise
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}
