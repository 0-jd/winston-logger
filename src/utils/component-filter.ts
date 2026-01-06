/**
 * Log Entry Component Filtering Utilities
 * 
 * Provides utilities to filter log entries based on configured components
 */

import type { LogEntry, LogEntryComponent } from '../types';

/**
 * Default component sets for each transport type
 */
export const DEFAULT_COMPONENTS: Record<string, LogEntryComponent[]> = {
  console: ['timestamp', 'level', 'origin', 'identifier', 'message', 'sessionID', 'errorID'],
  file: ['timestamp', 'level', 'origin', 'identifier', 'message', 'service', 'sessionID', 'errorID', 'error', 'comment', 'meta', 'sendDiscordWebhook'],
  errorFile: ['timestamp', 'level', 'origin', 'identifier', 'message', 'service', 'sessionID', 'errorID', 'error', 'comment', 'meta'],
  discord: ['timestamp', 'level', 'origin', 'identifier', 'message', 'sessionID', 'errorID', 'error', 'comment'],
  sentry: ['timestamp', 'level', 'origin', 'identifier', 'message', 'service', 'sessionID', 'errorID', 'error', 'meta'],
  gcp: ['timestamp', 'level', 'origin', 'identifier', 'message', 'service', 'sessionID', 'errorID', 'error', 'comment', 'meta'],
};

/**
 * Filters a log entry to include only specified components
 * 
 * @param entry - Complete log entry
 * @param components - Component specification ("default" or array of component names)
 * @param transportType - Type of transport (for default resolution)
 * @returns Filtered log entry with only specified components
 */
export function filterLogEntry(
  entry: LogEntry,
  components: 'default' | LogEntryComponent[],
  transportType: string = 'file'
): Partial<LogEntry> {
  // Resolve "default" to actual component list
  const componentList = components === 'default'
    ? DEFAULT_COMPONENTS[transportType] || DEFAULT_COMPONENTS.file
    : components;

  const filtered: Partial<LogEntry> = {};

  for (const component of componentList) {
    if (component in entry) {
      const value = entry[component as keyof LogEntry];
      // Only include non-null, non-undefined values
      if (value !== null && value !== undefined) {
        (filtered as any)[component] = value;
      } else if (component === 'sessionID' || component === 'errorID') {
        // Explicitly include null for ID fields
        (filtered as any)[component] = null;
      }
    }
  }

  return filtered;
}

/**
 * Validates that component names are valid
 * 
 * @param components - Array of component names to validate
 * @returns Array of invalid component names (empty if all valid)
 */
export function validateComponents(components: string[]): string[] {
  const validComponents = new Set<string>([
    'timestamp',
    'level',
    'origin',
    'identifier',
    'sendDiscordWebhook',
    'message',
    'service',
    'sessionID',
    'errorID',
    'error',
    'comment',
    'meta',
  ]);

  return components.filter(c => !validComponents.has(c));
}
