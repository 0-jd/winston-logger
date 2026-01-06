/**
 * ID Generation Utilities
 * 
 * Provides cryptographically secure random ID generation for sessions and errors
 */

import { randomBytes } from 'crypto';
import type { SessionID, ErrorID } from '../types';

/**
 * Creates a cryptographically secure session ID
 * 
 * Format: sid-{16-character-hex}
 * Example: sid-a3f2d8c1b4e5f6a7
 * 
 * @returns SessionID with format sid-${string}
 */
export function createSessionID(): SessionID {
  const randomHex = randomBytes(8).toString('hex');
  return `sid-${randomHex}` as SessionID;
}

/**
 * Creates a cryptographically secure error ID
 * 
 * Format: eid-{16-character-hex}
 * Example: eid-9d4c2b7a8e1f3c6d
 * 
 * @returns ErrorID with format eid-${string}
 */
export function createErrorID(): ErrorID {
  const randomHex = randomBytes(8).toString('hex');
  return `eid-${randomHex}` as ErrorID;
}
