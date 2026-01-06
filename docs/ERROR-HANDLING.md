# Error Handling Guide

Comprehensive guide to error logging and serialization in myLogger.

## Table of Contents

- [Error Object Structure](#error-object-structure)
- [Basic Error Logging](#basic-error-logging)
- [Error Serialization](#error-serialization)
- [HTTP Errors](#http-errors)
- [Error Cause Chains](#error-cause-chains)
- [Automatic Error IDs](#automatic-error-ids)
- [Best Practices](#best-practices)

---

## Error Object Structure

All errors are serialized into a structured `ErrorObject`:

```typescript
interface ErrorObject {
  name?: string; // Error name (e.g., "TypeError")
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

---

## Basic Error Logging

### Try-Catch Blocks

The most common pattern:

```typescript
try {
  await riskyOperation();
} catch (error) {
  log.error("Operation failed", "operation", {
    error, // Automatically serialized
  });
}
```

### With Context

Include additional context:

```typescript
try {
  await database.query(sql);
} catch (error) {
  log.error("Database query failed", "db-query", {
    error,
    comment: "Check database connection",
    meta: {
      query: sql,
      database: "users",
    },
  });
}
```

### With IDs

Track errors across systems:

```typescript
const sessionID = Logger.createSessionID();

try {
  await processRequest(req);
} catch (error) {
  const errorID = Logger.createErrorID();

  log.error("Request processing failed", "request-handler", {
    error,
    errorID,
    sessionID,
  });

  // Return errorID to client for support
  res.status(500).json({ errorID });
}
```

---

## Error Serialization

### Automatic Serialization

Most errors are automatically serialized:

```typescript
const error = new Error("Something failed");
log.error("Error occurred", "handler", { error });
// ✅ Automatically serialized
```

### Manual Serialization

For unknown or complex errors, use `serializeError`:

```typescript
import { serializeError } from "@mylogger/core";

try {
  throw { custom: "error", code: 500 }; // Non-Error object
} catch (err) {
  log.error("Custom error", "handler", {
    error: serializeError(err),
  });
}
```

### With Custom Limits

Override default truncation limits:

```typescript
import { serializeError } from "@mylogger/core";

const error = new Error("Long stack trace error");

log.error("Error with custom limits", "handler", {
  error: serializeError(error, {
    stackLimit: 5000,
    responseDataLimit: 2000,
    causeMaxDepth: 10,
  }),
});
```

---

## HTTP Errors

### Axios Errors

Axios errors include HTTP response details:

```typescript
import axios from "axios";

try {
  await axios.get("https://api.example.com/users");
} catch (error) {
  if (axios.isAxiosError(error)) {
    log.error("HTTP request failed", "http-client", {
      error, // Includes response.status, response.statusText, response.data
      meta: {
        url: error.config?.url,
        method: error.config?.method,
      },
    });
  }
}
```

### Custom HTTP Errors

Create errors with response details manually:

```typescript
const error: any = new Error("Request failed");
error.code = "ERR_HTTP_500";
error.response = {
  status: 500,
  statusText: "Internal Server Error",
  data: {
    message: "Database connection failed",
    timestamp: Date.now(),
  },
};

log.error("API error", "api-call", { error });
```

**Logged as:**

```json
{
  "error": {
    "name": "Error",
    "message": "Request failed",
    "code": "ERR_HTTP_500",
    "response": {
      "status": 500,
      "statusText": "Internal Server Error",
      "data": "{\"message\":\"Database connection failed\",\"timestamp\":1704537045123}"
    }
  }
}
```

---

## Error Cause Chains

### Nested Errors

JavaScript errors can have a `cause` property:

```typescript
const databaseError = new Error("Connection timeout");

const serviceError = new Error("Failed to fetch user", {
  cause: databaseError,
});

const apiError = new Error("Request failed", {
  cause: serviceError,
});

log.error("Nested error", "api", { error: apiError });
```

**Logged as:**

```json
{
  "error": {
    "name": "Error",
    "message": "Request failed",
    "cause": {
      "name": "Error",
      "message": "Failed to fetch user",
      "cause": {
        "name": "Error",
        "message": "Connection timeout"
      }
    }
  }
}
```

### Depth Limiting

To prevent massive logs from deep error chains, the logger limits cause depth:

```typescript
// Default: causeMaxDepth = 3

limits: {
  causeMaxDepth: 3,
}
```

If the chain exceeds the limit:

```json
{
  "cause": {
    "cause": {
      "cause": {
        "message": "[Max Cause Depth Reached]",
        "name": "DepthLimitError"
      }
    }
  }
}
```

---

## Automatic Error IDs

### Auto-Generation

For `logger.error()` calls, if no `errorID` is provided, one is **automatically generated**:

```typescript
log.error("Something failed", "handler", {
  error: new Error("Database error"),
  // errorID not provided
});

// Logger auto-generates: errorID = "eid-a3f2d8c1b4e5f6a7"
```

### Explicit Error IDs

You can provide your own:

```typescript
const errorID = Logger.createErrorID();

log.error("Something failed", "handler", {
  error: new Error("Database error"),
  errorID, // Explicitly provided
});
```

### Other Log Levels

For non-error levels, `errorID` is optional and **not** auto-generated:

```typescript
log.warn("Potential issue", "monitor", {
  // No errorID - will be null
});

log.warn("Tracked warning", "monitor", {
  errorID: Logger.createErrorID(), // Explicitly provided
});
```

---

## Best Practices

### 1. Always Log Errors

Never silently swallow errors:

```typescript
// ❌ Bad
try {
  await riskyOperation();
} catch (err) {
  // Silent failure
}

// ✅ Good
try {
  await riskyOperation();
} catch (err) {
  log.error("Operation failed", "operation", { error: err });
}
```

### 2. Include Context

Add metadata to help debug:

```typescript
log.error("User creation failed", "create-user", {
  error: err,
  meta: {
    username: user.username,
    email: user.email,
    timestamp: Date.now(),
  },
});
```

### 3. Track Errors Across Boundaries

Use error IDs to track errors across services:

```typescript
// Service A
const errorID = Logger.createErrorID();
log.error("Service A failed", "service-a", { error: err, errorID });

// Pass errorID to Service B
await serviceB.handle({ errorID });

// Service B
log.error("Service B cascade", "service-b", {
  error: newErr,
  errorID, // Same errorID
});
```

### 4. Group Related Logs

Use session IDs to group related operations:

```typescript
const sessionID = Logger.createSessionID();

log.info("Starting operation", "operation-start", { sessionID });

try {
  await step1();
  log.info("Step 1 complete", "step-1", { sessionID });

  await step2();
  log.info("Step 2 complete", "step-2", { sessionID });
} catch (err) {
  log.error("Operation failed", "operation-error", {
    error: err,
    sessionID, // Links error to operation
  });
}
```

### 5. Sanitize Sensitive Data

Don't log passwords, tokens, or PII:

```typescript
// ❌ Bad
log.error("Auth failed", "auth", {
  meta: { password: user.password },
});

// ✅ Good
log.error("Auth failed", "auth", {
  meta: { username: user.username },
});
```

### 6. Use Comments Wisely

Add actionable comments:

```typescript
log.error("Rate limit exceeded", "api-call", {
  error: err,
  comment: "Implement exponential backoff",
});
```

### 7. Configure Limits Appropriately

For high-volume logging, reduce limits:

```typescript
limits: {
  stackLimit: 500,
  responseDataLimit: 200,
  causeMaxDepth: 2,
}
```

For detailed debugging, increase limits:

```typescript
limits: {
  stackLimit: 5000,
  responseDataLimit: 2000,
  causeMaxDepth: 10,
}
```

### 8. Return Error IDs to Clients

Help users report issues:

```typescript
app.use((err, req, res, next) => {
  const errorID = Logger.createErrorID();

  log.error("Request error", "error-middleware", {
    error: err,
    errorID,
  });

  res.status(500).json({
    error: "Internal Server Error",
    errorID, // User can reference this ID
  });
});
```

### 9. Send Critical Errors to Discord

Use `sendDiscordWebhook` for critical alerts:

```typescript
log.error("Database connection lost", "db-monitor", {
  error: err,
  sendDiscordWebhook: true, // Alert team on Discord
});
```

### 10. Monitor Error Logs

Set up monitoring and alerts:

- Monitor `errors.ndjson` file size
- Alert on error rate spikes
- Review top errors weekly
- Set up Sentry for automatic grouping

---

## Complete Example

```typescript
import { Logger, createSessionID, createErrorID } from "@mylogger/core";
import axios from "axios";

const logger = new Logger({
  service: "user-service",
  transports: {
    console: { enabled: true, entries: "default" },
    errorFile: { enabled: true, filename: "errors.ndjson", entries: "default" },
    discord: { enabled: true, webhookUrls: ["..."], entries: "default" },
  },
});

const log = logger.createLogger("UserController");

async function createUser(userData: any) {
  const sessionID = createSessionID();

  log.info("Creating user", "create-user-start", {
    sessionID,
    meta: { username: userData.username },
  });

  try {
    // Validate
    if (!userData.email) {
      throw new Error("Email is required");
    }

    // Call external API
    const response = await axios.post(
      "https://api.example.com/users",
      userData
    );

    log.info("User created successfully", "create-user-success", {
      sessionID,
      meta: { userId: response.data.id },
    });

    return response.data;
  } catch (error) {
    const errorID = createErrorID();

    // Determine if critical
    const isCritical =
      axios.isAxiosError(error) && error.response?.status === 500;

    log.error("User creation failed", "create-user-error", {
      error,
      errorID,
      sessionID,
      sendDiscordWebhook: isCritical,
      comment: isCritical
        ? "Critical: External API down"
        : "Investigate validation",
      meta: {
        username: userData.username,
        apiUrl: axios.isAxiosError(error) ? error.config?.url : undefined,
      },
    });

    // Re-throw with context
    throw new Error(`User creation failed: ${errorID}`);
  }
}
```
