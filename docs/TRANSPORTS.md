# Transport Guide

Detailed guide for each transport supported by @0-jd/logger.

## Table of Contents

- [Console Transport](#console-transport)
- [File Transport](#file-transport)
- [Error File Transport](#error-file-transport)
- [Discord Webhook Transport](#discord-webhook-transport)
- [Sentry Transport](#sentry-transport)
- [Google Cloud Logging Transport](#google-cloud-logging-transport)

---

## Console Transport

Logs to the terminal with color-coded output.

### Configuration

```typescript
console: {
  enabled: true,
  level: 'info',
  colorize: true,
  entries: 'default',
}
```

### Options

| Option     | Type                  | Default     | Description              |
| ---------- | --------------------- | ----------- | ------------------------ |
| `enabled`  | boolean               | `true`      | Enable/disable transport |
| `level`    | LogLevel              | `'info'`    | Minimum log level        |
| `colorize` | boolean               | `true`      | Enable color output      |
| `entries`  | string[] \| 'default' | `'default'` | Components to include    |

### Default Components

- `timestamp`
- `level`
- `origin`
- `identifier`
- `message`
- `sessionID`
- `errorID`

### Output Format

```
{timestamp} [{level}] {origin} > {identifier}: {message} [{sessionID}] [{errorID}]
```

### Example Output

```bash
2026-01-06 10:30:45 [info] UserService > create-user: User created [sid-a3f2d8c1b4e5f6a7]
2026-01-06 10:30:46 [error] AuthService > login-failed: Invalid credentials [eid-9d4c2b7a8e1f3c6d]
```

### Use Cases

- **Development**: Immediate feedback while coding
- **Debugging**: Quick visibility into application flow
- **Local Testing**: Monitor logs in real-time

### Best Practices

- Disable in production to avoid I/O overhead
- Set appropriate log level to reduce noise
- Use `colorize: false` when piping to files

---

## File Transport

Logs all messages to a JSON file with rotation support.

### Configuration

```typescript
file: {
  enabled: true,
  filename: 'app.log',
  level: 'silly',
  entries: 'default',
  maxsize: 5242880,    // 5MB
  maxFiles: 5,
  tailable: true,
  zippedArchive: true,
}
```

### Options

| Option          | Type                  | Default     | Description                           |
| --------------- | --------------------- | ----------- | ------------------------------------- |
| `enabled`       | boolean               | `false`     | Enable/disable transport              |
| `filename`      | string                | `'app.log'` | Log file path                         |
| `level`         | LogLevel              | `'silly'`   | Minimum log level                     |
| `entries`       | string[] \| 'default' | `'default'` | Components to include                 |
| `maxsize`       | number                | `5242880`   | Max file size before rotation (bytes) |
| `maxFiles`      | number                | `5`         | Max number of rotated files           |
| `tailable`      | boolean               | `true`      | New logs written at end               |
| `zippedArchive` | boolean               | `false`     | Compress rotated files                |

### Default Components

All fields are included by default.

### Output Format

Each line is a JSON object:

```json
{
  "timestamp": "2026-01-06T10:30:45.123Z",
  "level": "info",
  "origin": "UserService",
  "identifier": "create-user",
  "message": "User created",
  "service": "my-app",
  "sessionID": "sid-a3f2d8c1b4e5f6a7",
  "errorID": null,
  "sendDiscordWebhook": false
}
```

### File Rotation

When `maxsize` is reached:

1. Current file is renamed (e.g., `app.log` → `app.log.1`)
2. Previous rotated files increment (e.g., `app.log.1` → `app.log.2`)
3. Oldest files beyond `maxFiles` are deleted
4. If `zippedArchive: true`, rotated files are gzipped

### Use Cases

- **Production Logging**: Persistent log storage
- **Audit Trails**: Complete record of all events
- **Analysis**: Parse JSON logs for insights
- **Debugging**: Review historical logs

### Best Practices

- Use absolute paths in production (`/var/log/myapp/app.log`)
- Set appropriate `maxsize` and `maxFiles` for disk space
- Enable `zippedArchive` to save disk space
- Use `level: 'silly'` to capture everything
- Consider log aggregation services for distributed systems

---

## Error File Transport

Logs only error-level messages to NDJSON format.

### Configuration

```typescript
errorFile: {
  enabled: true,
  filename: 'errors.ndjson',
  entries: 'default',
  maxsize: 5242880,
  maxFiles: 5,
}
```

### Options

Same as File Transport, except:

- `level` is always `'error'` (cannot be changed)

### NDJSON Format

Newline Delimited JSON - each line is a complete JSON object:

```json
{
  "timestamp": "2026-01-06T10:30:45.123Z",
  "level": "error",
  "origin": "API",
  "identifier": "request-handler",
  "message": "Request failed",
  "service": "my-app",
  "sessionID": "sid-abc",
  "errorID": "eid-def",
  "error": {
    "name": "Error",
    "message": "Database timeout",
    "stack": "Error: Database timeout\n  at ..."
  },
  "comment": "Should implement retry logic"
}
```

### Benefits of NDJSON

- **Streaming**: Process logs line-by-line
- **Append-Friendly**: Easy to append new entries
- **Tool Support**: Compatible with many log analysis tools

### Use Cases

- **Error Tracking**: Dedicated error log for monitoring
- **Alerting**: Monitor error file for critical issues
- **Analysis**: Parse errors for patterns
- **Compliance**: Separate error logs for auditing

### Best Practices

- Always enable in production
- Monitor error file size for issue detection
- Set up alerts when errors exceed threshold
- Include `error`, `errorID`, and `sessionID` in components

---

## Discord Webhook Transport

Sends logs to Discord channels via webhooks with rate limiting and failover.

### Configuration

```typescript
discord: {
  enabled: true,
  webhookUrls: [
    'https://discord.com/api/webhooks/123456789/abcdefghijklmnop',
    'https://discord.com/api/webhooks/987654321/zyxwvutsrqponmlk', // Backup
  ],
  level: 'error',
  entries: 'default',
  maxRetries: 3,
  retryDelay: 1000,
  maxMessageLength: 2000,
}
```

### Options

| Option             | Type                  | Default     | Description              |
| ------------------ | --------------------- | ----------- | ------------------------ |
| `enabled`          | boolean               | `false`     | Enable/disable transport |
| `webhookUrls`      | string[]              | `[]`        | Discord webhook URLs     |
| `level`            | LogLevel              | `'error'`   | Minimum log level        |
| `entries`          | string[] \| 'default' | `'default'` | Components to include    |
| `maxRetries`       | number                | `3`         | Retries per webhook      |
| `retryDelay`       | number                | `1000`      | Initial retry delay (ms) |
| `maxMessageLength` | number                | `2000`      | Max message length       |

### Default Components

- `timestamp`, `level`, `origin`, `identifier`, `message`, `sessionID`, `errorID`, `error`, `comment`

### Important: Opt-In Flag

**Only logs with `sendDiscordWebhook: true` are sent to Discord:**

```typescript
log.error("Critical error", "system", {
  error: err,
  sendDiscordWebhook: true, // Required to send to Discord
});
```

### Message Format

```
**[ERROR]** UserService > login-failed
Invalid credentials

errorID: eid-9d4c2b7a8e1f3c6d | sessionID: sid-a3f2d8c1b4e5f6a7

🚨 **Error**: Invalid credentials
Code: ERR_AUTH_FAILED
```

```
Error: Invalid credentials
  at authenticate (/app/auth.js:45:10)
  at login (/app/routes.js:23:5)
```

````

### Rate Limiting

Discord enforces strict rate limits:

- **~30 requests per minute** per webhook
- **5 requests per 2 seconds** per webhook bucket

The transport handles this automatically:

1. Tracks rate limit state per webhook
2. Respects `Retry-After` header from 429 responses
3. Queues messages when rate-limited
4. Waits for rate limit window to reset
5. Fails over to backup webhook if primary fails

### Failover Strategy

When multiple webhook URLs are provided:

1. Attempts to send to first webhook
2. If send fails after `maxRetries`, tries next webhook
3. Continues until successful or all webhooks exhausted

### Retry Strategy

For each webhook:
- Retry up to `maxRetries` times
- Exponential backoff: delay × 2^attempt
- On 429 (Too Many Requests): wait `Retry-After` seconds

### Message Truncation

Messages exceeding `maxMessageLength` are truncated with `...`.

### Use Cases

- **Critical Alerts**: Notify team of production errors
- **Monitoring**: Real-time error notifications
- **On-Call**: Alert on-call engineers
- **Incident Response**: Immediate visibility into issues

### Best Practices

- Use separate webhooks for different severities
- Set `level: 'error'` to avoid spam
- Configure backup webhooks for reliability
- Test rate limiting with low-volume logs first
- Use `sendDiscordWebhook: true` sparingly (only for critical events)

### Setting Up Discord Webhooks

1. Go to Discord Server Settings → Integrations → Webhooks
2. Click "New Webhook"
3. Choose channel and name
4. Copy webhook URL
5. Add to @0-jd/logger configuration

---

## Sentry Transport

Integrates with Sentry for error tracking and monitoring.

### Configuration

```typescript
sentry: {
  enabled: true,
  dsn: 'https://your-key@o12345.ingest.sentry.io/67890',
  environment: 'production',
  tracesSampleRate: 1.0,
  level: 'error',
  entries: 'default',
  sentryOptions: {
    release: '1.0.0',
    serverName: 'api-server-1',
  },
}
````

### Options

| Option             | Type                  | Default        | Description                   |
| ------------------ | --------------------- | -------------- | ----------------------------- |
| `enabled`          | boolean               | `false`        | Enable/disable transport      |
| `dsn`              | string                | `''`           | Sentry DSN (required)         |
| `environment`      | string                | `'production'` | Environment name              |
| `tracesSampleRate` | number                | `1.0`          | Traces sample rate (0.0-1.0)  |
| `level`            | LogLevel              | `'error'`      | Minimum log level             |
| `entries`          | string[] \| 'default' | `'default'`    | Components to include         |
| `sentryOptions`    | object                | `{}`           | Additional Sentry SDK options |

### Sentry Features

- **Error Grouping**: Automatically groups similar errors
- **Stack Traces**: Full stack trace capture
- **Breadcrumbs**: Event trail leading to error
- **Releases**: Track errors by version
- **User Context**: Associate errors with users

### Use Cases

- **Error Monitoring**: Centralized error tracking
- **Performance Monitoring**: Track application performance
- **Release Tracking**: Monitor errors per release
- **Team Collaboration**: Assign and triage errors

### Best Practices

- Use `environment` to separate dev/staging/prod
- Configure `release` for version tracking
- Set appropriate `tracesSampleRate` for performance monitoring
- Add user context in metadata
- Use Sentry's deduplication features

### Getting Sentry DSN

1. Create Sentry account at sentry.io
2. Create new project
3. Copy DSN from project settings
4. Add to @0-jd/logger configuration

---

## Google Cloud Logging Transport

Integrates with Google Cloud Platform's logging service.

### Configuration

```typescript
gcp: {
  enabled: true,
  projectId: 'my-gcp-project',
  keyFilename: '/path/to/service-account-key.json',
  logName: 'app-logs',
  level: 'info',
  entries: 'default',
  resource: {
    type: 'global',
    labels: {
      project_id: 'my-gcp-project',
    },
  },
}
```

### Options

| Option        | Type                  | Default     | Description                 |
| ------------- | --------------------- | ----------- | --------------------------- |
| `enabled`     | boolean               | `false`     | Enable/disable transport    |
| `projectId`   | string                | `''`        | GCP Project ID (required)   |
| `keyFilename` | string                | -           | Path to service account key |
| `logName`     | string                | -           | Log name in GCP             |
| `level`       | LogLevel              | `'info'`    | Minimum log level           |
| `entries`     | string[] \| 'default' | `'default'` | Components to include       |
| `resource`    | object                | -           | Monitored resource config   |
| `gcpOptions`  | object                | `{}`        | Additional GCP options      |

### GCP Features

- **Structured Logging**: Automatic JSON parsing
- **Log Viewer**: Powerful query interface
- **Log-Based Metrics**: Create metrics from logs
- **Export**: Export logs to BigQuery, Cloud Storage
- **Integration**: Integrates with GCP services

### Authentication

Option 1: Service Account Key File

```typescript
gcp: {
  keyFilename: '/path/to/service-account-key.json',
}
```

Option 2: Application Default Credentials

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

Then omit `keyFilename` from config.

### Use Cases

- **GCP Deployments**: Native logging for GCP apps
- **Cloud Run/Functions**: Automatic log aggregation
- **Multi-Service Apps**: Centralized logging across services
- **Compliance**: GCP's compliance features

### Best Practices

- Use Application Default Credentials in production
- Configure appropriate `logName` per service
- Use structured logging (JSON) for better querying
- Set up log-based alerts for critical errors
- Export logs for long-term retention

### Setting Up GCP Logging

1. Create GCP project
2. Enable Cloud Logging API
3. Create service account with "Logs Writer" role
4. Download service account key JSON
5. Add to @0-jd/logger configuration

---

## Multiple Transports

You can enable multiple transports simultaneously:

```typescript
const logger = new Logger({
  service: "my-app",
  transports: {
    console: { enabled: true, level: "debug" },
    file: { enabled: true, filename: "app.log" },
    errorFile: { enabled: true, filename: "errors.ndjson" },
    discord: { enabled: true, webhookUrls: ["..."] },
    sentry: { enabled: true, dsn: "..." },
  },
});
```

Each transport receives the same log entry but can filter components differently.
