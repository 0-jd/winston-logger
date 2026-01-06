/**
 * String and Object Truncation Utilities
 * 
 * Provides utilities to truncate strings and limit object depth
 */

/**
 * Truncates a string to the specified limit
 * Adds ellipsis (...) if truncated
 * 
 * @param str - String to truncate
 * @param limit - Maximum length
 * @returns Truncated string
 */
export function truncateString(str: string, limit: number): string {
  if (!str || str.length <= limit) {
    return str;
  }
  return str.substring(0, limit - 3) + '...';
}

/**
 * Truncates object depth to prevent deeply nested structures
 * Handles circular references
 * 
 * @param obj - Object to truncate
 * @param maxDepth - Maximum depth to traverse
 * @param currentDepth - Current depth (used internally)
 * @param seen - Set of seen objects (used internally to detect circular refs)
 * @returns Depth-limited object
 */
export function truncateObjectDepth(
  obj: any,
  maxDepth: number,
  currentDepth: number = 0,
  seen: WeakSet<object> = new WeakSet()
): any {
  // Return primitives and null as-is
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Check for circular reference
  if (seen.has(obj)) {
    return '[Circular]';
  }

  // Check depth limit
  if (currentDepth >= maxDepth) {
    return '[Max Depth Reached]';
  }

  // Mark this object as seen
  seen.add(obj);

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => 
      truncateObjectDepth(item, maxDepth, currentDepth + 1, seen)
    );
  }

  // Handle objects
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = truncateObjectDepth(value, maxDepth, currentDepth + 1, seen);
  }

  return result;
}

/**
 * Converts value to string and truncates if needed
 * Useful for HTTP response bodies and other large text
 * 
 * @param value - Value to stringify and truncate
 * @param limit - Maximum length
 * @returns Truncated string representation
 */
export function stringifyAndTruncate(value: unknown, limit: number): string {
  if (value === undefined || value === null) {
    return String(value);
  }

  let str: string;
  
  if (typeof value === 'string') {
    str = value;
  } else if (typeof value === 'object') {
    try {
      str = JSON.stringify(value);
    } catch (err) {
      str = String(value);
    }
  } else {
    str = String(value);
  }

  return truncateString(str, limit);
}
