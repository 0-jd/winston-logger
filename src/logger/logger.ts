/**
 * Main Logger Class
 * 
 * Entry point for the logger module
 * Creates scoped loggers that share transports
 */

import winston from 'winston';
import type { LoggerConfig, ScopedLoggerOptions, SerializationLimits } from '../types';
import { ScopedLogger } from './scoped-logger';
import { createTransports } from '../transports/transport-factory';
import { validateConfig } from '../config/config-validator';
import { DEFAULT_LIMITS, DEFAULT_TRANSPORT_CONFIGS } from '../config/defaults';
import { createSessionID, createErrorID } from '../utils/id-generation';

/**
 * Main Logger class
 * 
 * Usage:
 * ```ts
 * const logger = new Logger({ service: 'my-service', transports: {...} });
 * const scopedLogger = logger.createLogger('MyModule');
 * scopedLogger.info('Hello', 'startup');
 * ```
 */
export class Logger {
  private config: LoggerConfig;
  private winstonLogger: winston.Logger;
  private limits: SerializationLimits;

  constructor(config: LoggerConfig) {
    // Validate configuration
    const validation = validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid logger configuration:\n${validation.errors.join('\n')}`);
    }

    // Merge with defaults
    this.config = {
      ...config,
      limits: {
        ...DEFAULT_LIMITS,
        ...config.limits,
      },
      transports: this.mergeTransportConfigs(config.transports || {}),
    };

    this.limits = this.config.limits as SerializationLimits;

    // Create shared Winston logger instance
    const transports = createTransports(this.config);
    this.winstonLogger = winston.createLogger({
      level: this.config.level || 'silly',
      transports,
      exitOnError: false,
    });
  }

  /**
   * Creates a scoped logger instance
   * 
   * @param origin - Origin string (typically filename or module name)
   * @param options - Optional scoped logger options
   * @returns Scoped logger instance
   */
  createLogger(origin: string, options?: ScopedLoggerOptions): ScopedLogger {
    // For now, we don't support scoped overrides
    // Future enhancement: create separate Winston logger with overridden transports
    if (options?.transports) {
      console.warn('Scoped logger transport overrides are not yet implemented');
    }

    return new ScopedLogger(
      origin,
      this.config.service,
      this.winstonLogger,
      this.limits
    );
  }

  /**
   * Static method to create session ID
   * Exposed for user convenience
   */
  static createSessionID = createSessionID;

  /**
   * Static method to create error ID
   * Exposed for user convenience
   */
  static createErrorID = createErrorID;

  /**
   * Merges user transport configs with defaults
   * 
   * @param userTransports - UserStrike transport configs
   * @returns Merged transport configs
   */
  private mergeTransportConfigs(userTransports: any): any {
    const merged: any = {};

    for (const [key, defaultConfig] of Object.entries(DEFAULT_TRANSPORT_CONFIGS)) {
      const userConfig = userTransports[key];
      
      if (userConfig) {
        merged[key] = {
          ...defaultConfig,
          ...userConfig,
        };
      } else {
        merged[key] = defaultConfig;
      }
    }

    return merged;
  }
}
