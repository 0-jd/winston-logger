/**
 * Error Serialization Utilities
 * 
 * Provides robust error serialization with truncation and depth limiting
 */

import { serializeError as baseSerializeError } from 'serialize-error';
import type { ErrorObject, SerializationLimits } from '../types';
import { isErrorLike } from './validation';
import { truncateString, stringifyAndTruncate } from './truncation';

/**
 * Default serialization limits
 */
export const DEFAULT_LIMITS: SerializationLimits = {
  stackLimit: 1000,
  responseDataLimit: 500,
  causeMaxDepth: 3,
};

/**
 * Serializes an error or error-like value into a structured ErrorObject
 * 
 * This function:
 * - Handles both Error instances and plain objects
 * - Uses serialize-error for robust serialization
 * - Applies truncation limits to prevent oversized logs
 * - Limits cause chain depth
 * - Extracts HTTP response details if present
 * 
 * @param error - Error or error-like value to serialize
 * @param limits - Optional serialization limits (uses defaults if not provided)
 * @returns Structured ErrorObject
 */
export function serializeError(
  error: unknown,
  limits: SerializationLimits = DEFAULT_LIMITS
): ErrorObject {
  // If already an error-like object, serialize it
  if (!isErrorLike(error)) {
    // Convert non-error values to error-like objects
    return {
      message: String(error),
      name: 'UnknownError',
    };
  }

  // Use serialize-error for robust serialization
  const serialized = baseSerializeError(error);

  // Build the base error object
  const errorObj: ErrorObject = {
    name: serialized.name,
    message: serialized.message || 'Unknown error',
  };

  // Add stack trace (truncated)
  if (serialized.stack) {
    errorObj.stack = truncateString(serialized.stack, limits.stackLimit);
  }

  // Add error code if present
  if ('code' in serialized && serialized.code !== undefined) {
    errorObj.code = serialized.code as string | number;
  }

  // Add cause chain (depth-limited)
  if ('cause' in serialized && serialized.cause) {
    errorObj.cause = serializeCause(
      serialized.cause,
      limits.causeMaxDepth,
      1,
      limits
    );
  }

  // Extract HTTP response details if present
  if ('response' in serialized && serialized.response && typeof serialized.response === 'object') {
    const response = serialized.response as any;
    errorObj.response = {
      status: response.status,
      statusText: response.statusText,
      data: response.data 
        ? stringifyAndTruncate(response.data, limits.responseDataLimit)
        : undefined,
    };
  }

  return errorObj;
}

/**
 * Recursively serializes error cause chain with depth limiting
 * 
 * @param cause - Cause value
 * @param maxDepth - Maximum depth to traverse
 * @param currentDepth - Current depth
 * @param limits - Serialization limits
 * @returns Serialized cause or undefined
 */
function serializeCause(
  cause: unknown,
  maxDepth: number,
  currentDepth: number,
  limits: SerializationLimits
): ErrorObject | undefined {
  if (currentDepth > maxDepth) {
    return {
      message: '[Max Cause Depth Reached]',
      name: 'DepthLimitError',
    };
  }

  if (!isErrorLike(cause)) {
    return {
      message: String(cause),
      name: 'UnknownCause',
    };
  }

  const serialized = baseSerializeError(cause);

  const causeObj: ErrorObject = {
    name: serialized.name,
    message: serialized.message || 'Unknown cause',
  };

  if (serialized.stack) {
    causeObj.stack = truncateString(serialized.stack, limits.stackLimit);
  }

  if ('code' in serialized && serialized.code !== undefined) {
    causeObj.code = serialized.code as string | number;
  }

  // Recursively process nested cause
  if ('cause' in serialized && serialized.cause) {
    causeObj.cause = serializeCause(
      serialized.cause,
      maxDepth,
      currentDepth + 1,
      limits
    );
  }

  return causeObj;
}
