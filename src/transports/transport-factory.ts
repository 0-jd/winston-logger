/**
 * Transport Factory
 * 
 * Creates and configures Winston transports based on logger configuration
 */

import winston from 'winston';
import type { LoggerConfig } from '../types';
import { DiscordWebhookTransport } from './discord-webhook-transport';
import { filterLogEntry } from '../utils/component-filter';
import Sentry from 'winston-transport-sentry-node';
import { LoggingWinston } from '@google-cloud/logging-winston';

/**
 * Creates Winston format that applies component filtering
 * 
 * @param components - Components to include
 * @param transportType - Type of transport
 * @returns Winston format
 */
function createFilterFormat(components: 'default' | string[], transportType: string) {
  return winston.format((info) => {
    const filtered = filterLogEntry(info as any, components as any, transportType);
    return { ...info, ...filtered };
  })();
}

/**
 * Creates all enabled transports from configuration
 * 
 * @param config - Logger configuration
 * @returns Array of Winston transports
 */
export function createTransports(config: LoggerConfig): winston.transport[] {
  const transports: winston.transport[] = [];
  const transportConfigs = config.transports || {};

  // Console Transport
  if (transportConfigs.console?.enabled) {
    const consoleConfig = transportConfigs.console;
    const format = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      createFilterFormat(consoleConfig.entries, 'console'),
      winston.format.colorize({ all: consoleConfig.colorize ?? true }),
      winston.format.printf((info: any) => {
        const parts: string[] = [
          `${info.timestamp}`,
          `[${info.level}]`,
          `${info.origin} > ${info.identifier}:`,
          info.message,
        ];

        if (info.sessionID) {
          parts.push(`[${info.sessionID}]`);
        }

        if (info.errorID) {
          parts.push(`[${info.errorID}]`);
        }

        return parts.join(' ');
      })
    );

    transports.push(
      new winston.transports.Console({
        level: consoleConfig.level || config.level || 'info',
        format,
      })
    );
  }

  // File Transport (app.log)
  if (transportConfigs.file?.enabled) {
    const fileConfig = transportConfigs.file;
    const format = winston.format.combine(
      winston.format.timestamp(),
      createFilterFormat(fileConfig.entries, 'file'),
      winston.format.json()
    );

    transports.push(
      new winston.transports.File({
        level: fileConfig.level || config.level || 'silly',
        filename: fileConfig.filename,
        maxsize: fileConfig.maxsize,
        maxFiles: fileConfig.maxFiles,
        tailable: fileConfig.tailable,
        format,
      })
    );
  }

  // Error File Transport (errors.ndjson)
  if (transportConfigs.errorFile?.enabled) {
    const errorFileConfig = transportConfigs.errorFile;
    const format = winston.format.combine(
      winston.format.timestamp(),
      createFilterFormat(errorFileConfig.entries, 'errorFile'),
      winston.format.json()
    );

    transports.push(
      new winston.transports.File({
        level: 'error',
        filename: errorFileConfig.filename,
        maxsize: errorFileConfig.maxsize,
        maxFiles: errorFileConfig.maxFiles,
        format,
      })
    );
  }

  // Discord Webhook Transport
  if (transportConfigs.discord?.enabled) {
    const discordConfig = transportConfigs.discord;
    const format = winston.format.combine(
      winston.format.timestamp(),
      createFilterFormat(discordConfig.entries, 'discord')
    );

    transports.push(
      new DiscordWebhookTransport({
        level: discordConfig.level || 'error',
        webhookUrls: discordConfig.webhookUrls,
        maxRetries: discordConfig.maxRetries,
        retryDelay: discordConfig.retryDelay,
        maxMessageLength: discordConfig.maxMessageLength,
        format,
      })
    );
  }

  // Sentry Transport
  if (transportConfigs.sentry?.enabled) {
    const sentryConfig = transportConfigs.sentry;
    
    transports.push(
      new Sentry({
        sentry: {
          dsn: sentryConfig.dsn,
          environment: sentryConfig.environment,
          tracesSampleRate: sentryConfig.tracesSampleRate,
          ...sentryConfig.sentryOptions,
        },
        level: sentryConfig.level || 'error',
      })
    );
  }

  // Google Cloud Logging Transport
  if (transportConfigs.gcp?.enabled) {
    const gcpConfig = transportConfigs.gcp;
    
    const loggingWinston = new LoggingWinston({
      projectId: gcpConfig.projectId,
      keyFilename: gcpConfig.keyFilename,
      logName: gcpConfig.logName,
      resource: gcpConfig.resource,
      ...gcpConfig.gcpOptions,
    });

    transports.push(loggingWinston);
  }

  return transports;
}
