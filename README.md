# Vanta Logger

A production-ready, reusable Winston-based logger module with clean architecture, structured error logging, and comprehensive transport support.

## Features

- ✨ **Clean Architecture** - Modular design with clear separation of concerns
- 🎯 **Scoped Loggers** - Create isolated logger instances that share transports
- 🔒 **Type-Safe** - Full TypeScript support with branded types for IDs
- 📊 **Structured Logging** - Consistent log entry format across all transports
- 🚨 **Automatic Error IDs** - Auto-generates error IDs for all error-level logs
- 🔄 **Multiple Transports** - Console, File, Discord, Sentry, Google Cloud Logging
- ⚡ **Discord Rate Limiting** - Built-in rate limiting and failover for Discord webhooks
- 🎨 **Configurable Components** - Filter which log fields each transport receives
- 🛡️ **Error Serialization** - Robust error handling with truncation and depth limiting

## Installation

```bash
npm install
npm run build
```

## Quick Start

```typescript
import { Logger } from "vanta-logger";

// Create logger instance
const logger = new Logger({
  service: "my-app",
  transports: {
    console: {
      enabled: true,
      level: "info",
      entries: "default",
    },
  },
});

// Create scoped logger
const log = logger.createLogger("MyModule");

// Log messages
log.info("Application started", "startup");
log.error("Something went wrong", "error-handler", {
  error: new Error("Database connection failed"),
});
```

## Core Concepts

### Logger Initialization

Always create a single `Logger` instance and share it across your application:

```typescript
// logger.ts
import { Logger } from "vanta-logger";

const logger = new Logger({
  service: "my-service",
  transports: {
    /* ... */
  },
});

export default logger;
```

### Scoped Loggers

Create scoped loggers for different modules/files:

```typescript
// user-service.ts
import logger from "./logger";

const log = logger.createLogger("UserService");

log.info("User created", "create-user", {
  meta: { userId: 123 },
});
```

### Log Method Signature

All log methods follow the same signature:

```typescript
logger.<level>(message, identifier, entries?)
```

- **message** (string, required): Primary log message
- **identifier** (string, required): Short code location identifier
- **entries** (object, optional): Additional log data

### Session and Error IDs

Generate IDs for tracking sessions and errors:

```typescript
const sessionID = Logger.createSessionID(); // sid-a3f2d8c1b4e5f6a7
const errorID = Logger.createErrorID(); // eid-9d4c2b7a8e1f3c6d

log.info("User logged in", "login", {
  sessionID,
  meta: { username: "john" },
});

log.error("Login failed", "login-error", {
  error: err,
  errorID,
  sessionID,
});
```

**Note**: Error-level logs automatically generate an `errorID` if not provided.

## Transport Configuration

### Console Transport

```typescript
console: {
  enabled: true,
  level: 'info',
  colorize: true,
  entries: ['timestamp', 'origin', 'identifier', 'message', 'errorID'],
}
```

### File Transports

```typescript
file: {
  enabled: true,
  filename: 'app.log',
  level: 'silly',
  entries: 'default',
  maxsize: 5242880, // 5MB
  maxFiles: 5,
  tailable: true,
  zippedArchive: true,
}
```

### Discord Webhook

```typescript
discord: {
  enabled: true,
  webhookUrls: [
    'https://discord.com/api/webhooks/PRIMARY/TOKEN',
    'https://discord.com/api/webhooks/BACKUP/TOKEN',
  ],
  level: 'error',
  entries: 'default',
  maxRetries: 3,
}
```

**Only sends logs where `sendDiscordWebhook: true`**:

```typescript
log.error("Critical error", "system", {
  error: err,
  sendDiscordWebhook: true, // Sends to Discord
});
```

### Sentry

```typescript
sentry: {
  enabled: true,
  dsn: 'https://your-dsn@sentry.io/project',
  environment: 'production',
  level: 'error',
  entries: 'default',
}
```

### Google Cloud Logging

```typescript
gcp: {
  enabled: true,
  projectId: 'your-gcp-project',
  keyFilename: '/path/to/key.json',
  logName: 'app-logs',
  entries: 'default',
}
```

## Error Handling

### Basic Error Logging

```typescript
try {
  // risky operation
} catch (err) {
  log.error("Operation failed", "operation", {
    error: err, // Automatically serialized
  });
}
```

### HTTP Errors

The logger extracts HTTP response details:

```typescript
const httpError = new Error("Request failed");
httpError.response = {
  status: 500,
  statusText: "Internal Server Error",
  data: { message: "Database error" },
};

log.error("API call failed", "api-client", {
  error: httpError,
});
```

### Error Serialization

For complex or unknown errors, use `serializeError`:

```typescript
import { serializeError } from "vanta-logger";

log.error("Unknown error", "handler", {
  error: serializeError(unknownValue),
});
```

## Configuration Options

### Serialization Limits

Control how errors are truncated:

```typescript
limits: {
  stackLimit: 1000,        // Stack trace truncation
  responseDataLimit: 500,  // HTTP response data truncation
  causeMaxDepth: 3,        // Error cause chain depth
}
```

### Component Filtering

Control which fields each transport receives:

```typescript
console: {
  enabled: true,
  entries: ['timestamp', 'level', 'message', 'errorID'], // Only these fields
}
```

Use `'default'` for transport-specific defaults.

## Examples

See the [examples/](examples) directory for complete examples:

- [`basic-usage.ts`](examples/basic-usage.ts) - Basic logging patterns
- [`advanced-config.ts`](examples/advanced-config.ts) - Advanced configuration
- [`express-integration.ts`](examples/express-integration.ts) - Express.js integration

## Documentation

- [API Reference](docs/API.md)
- [Configuration Guide](docs/CONFIGURATION.md)
- [Transport Guide](docs/TRANSPORTS.md)
- [Error Handling](docs/ERROR-HANDLING.md)
- [Usage Examples](docs/EXAMPLES.md)

## Running Examples

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run examples
npm run example:basic
npm run example:advanced
npm run example:express
```

## Architecture

The logger follows a **layered architecture**:

1. **Core Layer** - Types and interfaces
2. **Utility Layer** - ID generation, serialization, validation
3. **Transport Layer** - Individual transport implementations
4. **Logger Layer** - Main logger and scoped logger classes

## License

MIT
