# Configuration Guide

Comprehensive guide to configuring myLogger.

## Table of Contents

- [Basic Configuration](#basic-configuration)
- [Serialization Limits](#serialization-limits)
- [Transport Configuration](#transport-configuration)
- [Component Filtering](#component-filtering)
- [Environment-Specific Configuration](#environment-specific-configuration)

---

## Basic Configuration

### Minimal Configuration

The simplest configuration requires only a service name and at least one enabled transport:

```typescript
const logger = new Logger({
  service: "my-app",
  transports: {
    console: {
      enabled: true,
      entries: "default",
    },
  },
});
```

### Complete Configuration

```typescript
const logger = new Logger({
  // Required: Service name
  service: "my-service",

  // Optional: Default log level
  level: "debug",

  // Optional: Serialization limits
  limits: {
    stackLimit: 1000,
    responseDataLimit: 500,
    causeMaxDepth: 3,
  },

  // Optional: Transport configurations
  transports: {
    console: {
      /* ... */
    },
    file: {
      /* ... */
    },
    errorFile: {
      /* ... */
    },
    discord: {
      /* ... */
    },
    sentry: {
      /* ... */
    },
    gcp: {
      /* ... */
    },
  },
});
```

---

## Serialization Limits

Control how errors are truncated to prevent oversized logs.

### Configuration

```typescript
limits: {
  stackLimit: 1000,        // Stack trace max length
  responseDataLimit: 500,  // HTTP response data max length
  causeMaxDepth: 3,        // Max depth for error.cause chain
}
```

### Defaults

```typescript
{
  stackLimit: 1000,
  responseDataLimit: 500,
  causeMaxDepth: 3,
}
```

### Examples

#### Low Limits (for high-volume logging)

```typescript
limits: {
  stackLimit: 500,
  responseDataLimit: 200,
  causeMaxDepth: 2,
}
```

#### High Limits (for detailed debugging)

```typescript
limits: {
  stackLimit: 5000,
  responseDataLimit: 2000,
  causeMaxDepth: 10,
}
```

---

## Transport Configuration

### Console Transport

Logs to stdout/stderr with colors and formatting.

```typescript
console: {
  enabled: true,
  level: 'info',              // Minimum log level
  colorize: true,             // Enable colors
  entries: 'default',         // Components to include
}
```

**Default Components:**

- `timestamp`, `level`, `origin`, `identifier`, `message`, `sessionID`, `errorID`

**Example Output:**

```
2026-01-06 10:30:45 [info] UserService > create-user: User created successfully [sid-a3f2d8c1b4e5f6a7]
```

---

### File Transport

Logs all levels to a file in JSON format.

```typescript
file: {
  enabled: true,
  filename: 'app.log',
  level: 'silly',             // Log all levels
  entries: 'default',
  maxsize: 5242880,           // 5MB
  maxFiles: 5,                // Keep 5 files
  tailable: true,             // New logs at end
  zippedArchive: true,        // Compress rotated files
}
```

**Default Components:** All fields

**Example Entry:**

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
  "meta": { "userId": 123 }
}
```

---

### Error File Transport

Logs only error-level entries to NDJSON format.

```typescript
errorFile: {
  enabled: true,
  filename: 'errors.ndjson',
  entries: 'default',
  maxsize: 5242880,           // 5MB
  maxFiles: 5,
}
```

**Note:** Level is always `'error'` for this transport.

---

### Discord Webhook Transport

Sends logs to Discord webhooks with rate limiting and failover.

```typescript
discord: {
  enabled: true,
  webhookUrls: [
    'https://discord.com/api/webhooks/ID1/TOKEN1',
    'https://discord.com/api/webhooks/ID2/TOKEN2',
    'https://discord.com/api/webhooks/ID3/TOKEN3',
    // Add more backup webhooks as needed
  ],
  level: 'info',             // Only info and above
  entries: 'default',
  maxRetries: 3,              // Retries per webhook
  retryDelay: 1000,           // Initial retry delay (ms)
  maxMessageLength: 2000,     // Discord limit
}
```

**Important:** Only sends logs where `sendDiscordWebhook: true`

```typescript
log.error("Critical error", "system", {
  error: err,
  sendDiscordWebhook: true, // Must be true to send to Discord
});
```

**Default Components:**

- `timestamp`, `level`, `origin`, `identifier`, `message`, `sessionID`, `errorID`, `error`, `comment`

**Rate Limiting:**

- Enforces ~30 requests/minute per webhook
- Respects `Retry-After` header from Discord
- Automatic failover to backup webhooks

---

### Sentry Transport

Integrates with Sentry for error tracking.

```typescript
sentry: {
  enabled: true,
  dsn: 'https://your-key@sentry.io/project-id',
  environment: 'production',
  tracesSampleRate: 1.0,
  level: 'error',
  entries: 'default',
  sentryOptions: {
    // Additional Sentry SDK options
    release: '1.0.0',
  },
}
```

**Requirements:**

- `dsn` is required when enabled

---

### Google Cloud Logging Transport

Integrates with Google Cloud Platform logging.

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
  gcpOptions: {
    // Additional GCP logging options
  },
}
```

**Requirements:**

- `projectId` is required when enabled
- Must have GCP credentials configured

---

## Component Filtering

Control which log entry fields each transport receives.

### Using Defaults

```typescript
console: {
  enabled: true,
  entries: 'default', // Use transport-specific defaults
}
```

### Custom Components

```typescript
console: {
  enabled: true,
  entries: [
    'timestamp',
    'level',
    'message',
    'errorID',
  ],
}
```

**Available Components:**

- `timestamp`
- `level`
- `origin`
- `identifier`
- `sendDiscordWebhook`
- `message`
- `service`
- `sessionID`
- `errorID`
- `error`
- `comment`
- `meta`

### Use Cases

#### Minimal Console Output

```typescript
console: {
  enabled: true,
  entries: ['timestamp', 'level', 'message'],
}
```

Output: `2026-01-06 10:30:45 [info] User logged in`

#### Detailed File Logging

```typescript
file: {
  enabled: true,
  filename: 'detailed.log',
  entries: 'default', // All fields
}
```

#### Privacy-Conscious Logging

Exclude sensitive metadata from certain transports:

```typescript
discord: {
  enabled: true,
  entries: ['timestamp', 'level', 'origin', 'identifier', 'message', 'errorID'],
  // Excludes 'meta' to avoid sending sensitive data to Discord
}
```

---

## Environment-Specific Configuration

### Development

```typescript
const logger = new Logger({
  service: "my-app",
  level: "silly",
  transports: {
    console: {
      enabled: true,
      level: "debug",
      colorize: true,
      entries: "default",
    },
    file: {
      enabled: true,
      filename: "dev.log",
      level: "silly",
      entries: "default",
    },
  },
});
```

### Production

```typescript
const logger = new Logger({
  service: "my-app",
  level: "info",
  transports: {
    console: {
      enabled: false, // Disable console in production
    },
    file: {
      enabled: true,
      filename: "/var/log/myapp/app.log",
      level: "info",
      entries: "default",
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      zippedArchive: true,
    },
    errorFile: {
      enabled: true,
      filename: "/var/log/myapp/errors.ndjson",
      entries: "default",
    },
    sentry: {
      enabled: true,
      dsn: process.env.SENTRY_DSN!,
      environment: "production",
      level: "error",
      entries: "default",
    },
    gcp: {
      enabled: true,
      projectId: process.env.GCP_PROJECT_ID!,
      level: "info",
      entries: "default",
    },
  },
});
```

### Using Environment Variables

```typescript
const logger = new Logger({
  service: process.env.SERVICE_NAME || "my-app",
  level: (process.env.LOG_LEVEL as LogLevel) || "info",
  transports: {
    console: {
      enabled: process.env.NODE_ENV !== "production",
      entries: "default",
    },
    sentry: {
      enabled: !!process.env.SENTRY_DSN,
      dsn: process.env.SENTRY_DSN || "",
      environment: process.env.NODE_ENV || "development",
      entries: "default",
    },
  },
});
```

---

## Configuration Validation

The logger validates configuration on initialization:

```typescript
try {
  const logger = new Logger({
    service: "", // Invalid: empty service name
  });
} catch (err) {
  console.error(err.message);
  // "Invalid logger configuration:
  //  config.service is required and must be a non-empty string
  //  At least one transport must be enabled"
}
```

**Validation Rules:**

- `service` must be a non-empty string
- At least one transport must be enabled
- Required transport-specific fields must be provided
- Limits must be positive numbers

---

## Best Practices

1. **Use Environment Variables** for sensitive data (DSNs, API keys)
2. **Enable Different Transports** per environment
3. **Configure Appropriate Limits** based on log volume
4. **Use Component Filtering** to reduce noise in specific transports
5. **Always Test Discord Webhooks** with low-volume logs first
6. **Set Proper Log Levels** to avoid excessive logging
