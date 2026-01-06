# API Reference

Complete API documentation for jdlogger.

## Table of Contents

- [Logger Class](#logger-class)
- [Scoped Logger](#scoped-logger)
- [Utility Functions](#utility-functions)
- [Types](#types)
- [Constants](#constants)

---

## Logger Class

### Constructor

```typescript
new Logger(config: LoggerConfig)
```

Creates a new logger instance with the specified configuration.

**Parameters:**

- `config` (LoggerConfig): Logger configuration object

**Throws:**

- Error if configuration is invalid

**Example:**

```typescript
const logger = new Logger({
  service: "my-app",
  transports: {
    console: { enabled: true, level: "info", entries: "default" },
  },
});
```

### Methods

#### `createLogger(origin, options?)`

Creates a scoped logger instance.

```typescript
createLogger(origin: string, options?: ScopedLoggerOptions): ScopedLogger
```

**Parameters:**

- `origin` (string): Origin identifier (typically module/file name)
- `options` (ScopedLoggerOptions, optional): Scoped logger options

**Returns:** ScopedLogger instance

**Example:**

```typescript
const log = logger.createLogger("UserService");
```

### Static Methods

#### `Logger.createSessionID()`

Generates a cryptographically secure session ID.

```typescript
static createSessionID(): SessionID
```

**Returns:** SessionID with format `sid-{16-char-hex}`

**Example:**

```typescript
const sessionID = Logger.createSessionID();
// => "sid-a3f2d8c1b4e5f6a7"
```

#### `Logger.createErrorID()`

Generates a cryptographically secure error ID.

```typescript
static createErrorID(): ErrorID
```

**Returns:** ErrorID with format `eid-{16-char-hex}`

**Example:**

```typescript
const errorID = Logger.createErrorID();
// => "eid-9d4c2b7a8e1f3c6d"
```

---

## Scoped Logger

Scoped logger instances created via `logger.createLogger()`.

### Methods

All logging methods follow the same signature:

```typescript
<level>(message: string, identifier: string, entries?: LogEntries): void
```

#### `silly(message, identifier, entries?)`

Logs at silly level (most verbose).

**Example:**

```typescript
log.silly("Trace message", "trace-point", {
  meta: { value: 123 },
});
```

#### `debug(message, identifier, entries?)`

Logs at debug level.

**Example:**

```typescript
log.debug("Debug information", "debug-point", {
  meta: { state: "initialized" },
});
```

#### `info(message, identifier, entries?)`

Logs at info level.

**Example:**

```typescript
log.info("Operation completed", "operation", {
  sessionID: Logger.createSessionID(),
});
```

#### `warn(message, identifier, entries?)`

Logs at warn level.

**Example:**

```typescript
log.warn("Deprecated API used", "api-check", {
  comment: "Please update to v2 API",
});
```

#### `error(message, identifier, entries?)`

Logs at error level. Automatically generates `errorID` if not provided.

**Example:**

```typescript
try {
  throw new Error("Something failed");
} catch (err) {
  log.error("Operation failed", "error-handler", {
    error: err,
    // errorID auto-generated if not provided
  });
}
```

---

## Utility Functions

### `createSessionID()`

Standalone function to create session IDs.

```typescript
import { createSessionID } from "jdlogger";

const sessionID = createSessionID();
```

### `createErrorID()`

Standalone function to create error IDs.

```typescript
import { createErrorID } from "jdlogger";

const errorID = createErrorID();
```

### `serializeError(error, limits?)`

Serializes an error into a structured ErrorObject.

```typescript
import { serializeError } from "jdlogger";

const errorObj = serializeError(unknownError, {
  stackLimit: 1000,
  responseDataLimit: 500,
  causeMaxDepth: 3,
});
```

**Parameters:**

- `error` (unknown): Error or error-like value
- `limits` (SerializationLimits, optional): Truncation limits

**Returns:** ErrorObject

### `isErrorLike(value)`

Type guard to check if a value is error-like.

```typescript
import { isErrorLike } from "jdlogger";

if (isErrorLike(someValue)) {
  // TypeScript knows someValue is Error-like
}
```

### `isValidSessionID(id)`

Validates session ID format.

```typescript
import { isValidSessionID } from "jdlogger";

if (isValidSessionID(id)) {
  // id matches sid-* format
}
```

### `isValidErrorID(id)`

Validates error ID format.

```typescript
import { isValidErrorID } from "jdlogger";

if (isValidErrorID(id)) {
  // id matches eid-* format
}
```

---

## Types

### LoggerConfig

Main logger configuration.

```typescript
interface LoggerConfig {
  service: string; // Required: Service name
  transports?: TransportConfigs; // Transport configurations
  limits?: Partial<SerializationLimits>; // Serialization limits
  level?: LogLevel; // Default log level
}
```

### LogEntries

Optional entries passed to log methods.

```typescript
interface LogEntries {
  error?: ErrorObject | unknown; // Error to log
  sendDiscordWebhook?: boolean; // Send to Discord
  comment?: string; // Additional comment
  meta?: Record<string, unknown>; // Metadata
  sessionID?: SessionID; // Session ID
  errorID?: ErrorID; // Error ID
}
```

### LogEntry

Complete log entry structure.

```typescript
interface LogEntry {
  timestamp: string; // ISO 8601 timestamp
  level: LogLevel; // Log level
  origin: string; // Origin from createLogger
  identifier: string; // Code location identifier
  sendDiscordWebhook: boolean; // Discord flag
  message: string; // Log message
  service: string; // Service name
  sessionID: SessionID | null; // Session ID or null
  errorID: ErrorID | null; // Error ID or null
  error?: ErrorObject; // Structured error
  comment?: string; // User comment
  meta?: Record<string, unknown>; // Metadata
}
```

### ErrorObject

Structured error representation.

```typescript
interface ErrorObject {
  name?: string; // Error name
  message: string; // Error message (required)
  stack?: string; // Stack trace (truncated)
  code?: string | number; // Error code
  cause?: ErrorObject; // Causal error (depth-limited)
  response?: {
    // HTTP response details
    status?: number;
    statusText?: string;
    data?: string; // Truncated
  };
}
```

### Transport Configurations

See [CONFIGURATION.md](docs/CONFIGURATION.md) for detailed transport configuration types.

---

## Constants

### DEFAULT_LIMITS

Default serialization limits.

```typescript
import { DEFAULT_LIMITS } from "jdlogger";

console.log(DEFAULT_LIMITS);
// {
//   stackLimit: 1000,
//   responseDataLimit: 500,
//   causeMaxDepth: 3,
// }
```

---

## Complete Example

```typescript
import {
  Logger,
  createSessionID,
  createErrorID,
  serializeError,
  isErrorLike,
} from "jdlogger";

// Create logger
const logger = new Logger({
  service: "api-service",
  limits: {
    stackLimit: 2000,
    responseDataLimit: 1000,
    causeMaxDepth: 5,
  },
  transports: {
    console: {
      enabled: true,
      level: "info",
      entries: "default",
    },
    file: {
      enabled: true,
      filename: "app.log",
      level: "silly",
      entries: "default",
    },
  },
});

// Create scoped logger
const log = logger.createLogger("APIController");

// Generate IDs
const sessionID = createSessionID();
const errorID = createErrorID();

// Log with all features
try {
  throw new Error("API call failed");
} catch (err) {
  if (isErrorLike(err)) {
    log.error("Request processing failed", "request-handler", {
      error: serializeError(err),
      errorID,
      sessionID,
      comment: "Investigate database connection",
      meta: {
        endpoint: "/api/users",
        method: "POST",
      },
    });
  }
}
```
