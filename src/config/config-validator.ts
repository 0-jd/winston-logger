/**
 * Configuration Validator
 * 
 * Validates logger configuration without throwing errors
 */

import type { LoggerConfig } from '../types';
import { isNonEmptyString } from '../utils/validation';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates logger configuration
 * Returns validation result without throwing
 * 
 * @param config - Logger configuration to validate
 * @returns Validation result with any errors
 */
export function validateConfig(config: LoggerConfig): ValidationResult {
  const errors: string[] = [];

  // Service name is required
  if (!config.service || !isNonEmptyString(config.service)) {
    errors.push('config.service is required and must be a non-empty string');
  }

  // Check that at least one transport is enabled
  const transports = config.transports || {};
  const hasEnabledTransport = Object.values(transports).some(t => t?.enabled === true);
  
  if (!hasEnabledTransport) {
    errors.push('At least one transport must be enabled');
  }

  // Validate limits if provided
  if (config.limits) {
    if (config.limits.stackLimit !== undefined && config.limits.stackLimit <= 0) {
      errors.push('limits.stackLimit must be a positive number');
    }
    if (config.limits.responseDataLimit !== undefined && config.limits.responseDataLimit <= 0) {
      errors.push('limits.responseDataLimit must be a positive number');
    }
    if (config.limits.causeMaxDepth !== undefined && config.limits.causeMaxDepth <= 0) {
      errors.push('limits.causeMaxDepth must be a positive number');
    }
  }

  // Validate Discord config if enabled
  if (transports.discord?.enabled) {
    if (!transports.discord.webhookUrls || transports.discord.webhookUrls.length === 0) {
      errors.push('transports.discord.webhookUrls must contain at least one URL when Discord transport is enabled');
    }
  }

  // Validate Sentry config if enabled
  if (transports.sentry?.enabled) {
    if (!transports.sentry.dsn || !isNonEmptyString(transports.sentry.dsn)) {
      errors.push('transports.sentry.dsn is required when Sentry transport is enabled');
    }
  }

  // Validate GCP config if enabled
  if (transports.gcp?.enabled) {
    if (!transports.gcp.projectId || !isNonEmptyString(transports.gcp.projectId)) {
      errors.push('transports.gcp.projectId is required when GCP transport is enabled');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
