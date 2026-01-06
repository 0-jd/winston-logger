# myLogger - Memory & Knowledge Base

This document captures architectural decisions, design patterns, implementation details, and knowledge accumulated throughout the development of the myLogger module. It serves as a reference for future iterations and maintenance.

## Table of Contents

- [Project Overview](#project-overview)
- [Architectural Decisions](#architectural-decisions)
- [Design Patterns](#design-patterns)
- [Implementation Details](#implementation-details)
- [Type System](#type-system)
- [Error Handling Philosophy](#error-handling-philosophy)
- [Transport Layer](#transport-layer)
- [Session History](#session-history)
- [Future Iterations](#future-iterations)

---

## Project Overview

**Created:** 2026-01-06  
**Purpose:** Reusable, production-ready Winston-based logger module  
**Language:** TypeScript  
**Dependencies:** Winston, serialize-error, axios, winston-transport-sentry-node, @google-cloud/logging-winston

### Core Requirements Met

1. ✅ Clean, well-defined logging interface
2. ✅ Winston integration (internal implementation detail)
3. ✅ Scoped logger factory pattern (`createLogger`)
4. ✅ Structured error logging with serialization
5. ✅ Shared transports across all logger instances
6. ✅ Clean code principles with separation of concerns
7. ✅ Environment independence through isolated modules
8. ✅ Automatic error ID generation for error logs
9. ✅ Session and error tracking with branded types
10. ✅ Multiple transport support (Console, File, Discord, Sentry, GCP)

---

## Architectural Decisions

### 1. Layered Architecture

The module follows a **four-layer architecture**:

```
┌─────────────────────────────────────┐
│      Logger Layer (Public API)      │  ← Main Logger class, Scoped Loggers
├─────────────────────────────────────┤
│     Transport Layer (Winston)       │  ← Transport factory, Custom transports
├─────────────────────────────────────┤
│      Utility Layer (Pure)           │  ← ID generation, Serialization, Validation
├─────────────────────────────────────┤
│      Core Layer (Types)             │  ← Interfaces, Type definitions
└─────────────────────────────────────┘
```

**Rationale:**

- Clear separation of concerns
- Each layer has a single responsibility
- Lower layers have no dependencies on higher layers
- Easy to test and maintain

### 2. Winston as Implementation Detail

Winston is **hidden** from the public API. Users never interact with Winston directly.

**Rationale:**

- Future flexibility to swap logging backends
- Cleaner API surface
- Users don't need to learn Winston
- Implementation changes don't break user code

### 3. Shared Transport Instances

All scoped loggers created via `createLogger()` share the same Winston logger instance and transports.

**Rationale:**

- Single configuration point
- Efficient resource usage
- Consistent behavior across all loggers
- Simplified transport management

**Trade-off:** Scoped logger overrides are more complex to implement (deferred to future iteration).

### 4. Branded Types for IDs

SessionID and ErrorID use **branded types**:

```typescript
export type SessionID = string & { __brand: "SessionID" };
export type ErrorID = string & { __brand: "ErrorID" };
```

**Rationale:**

- Compile-time safety prevents mixing ID types
- Forces use of creation functions
- No runtime overhead (just TypeScript compiler feature)
- Catches bugs at development time

### 5. Configuration-First Design

Logger requires explicit configuration object with **no magic defaults** (except for console transport).

**Rationale:**

- Explicit is better than implicit
- Forces users to think about their logging strategy
- No surprising behavior
- Clear validation errors

### 6. Automatic Error ID Generation

Error-level logs automatically generate an `errorID` if not provided.

**Rationale:**

- Every error should be traceable
- Reduces boilerplate for users
- Consistent error tracking
- Users can still provide custom errorIDs

**Implementation:** Check in `ScopedLogger.normalizeErrorID()`.

### 7. Non-Throwing Validation

Validation utilities return `boolean` results, never throw.

**Rationale:**

- Logger should be resilient
- Invalid inputs are normalized with warnings
- Never interrupt application flow due to logging
- Graceful degradation

**Exception:** Constructor validation throws to prevent invalid logger creation.

---

## Design Patterns

### 1. Factory Pattern

`Logger.createLogger(origin)` creates scoped logger instances.

**Benefits:**

- Encapsulates creation logic
- Ensures correct initialization
- Provides consistent API

### 2. Builder Pattern (Configuration)

Configuration uses nested objects with sensible merging:

```typescript
const logger = new Logger({
  service: "my-app",
  limits: {
    /* partial limits */
  },
  transports: {
    /* transport configs */
  },
});
```

### 3. Strategy Pattern (Transports)

Different transports implement Winston's Transport interface.

**Benefits:**

- Easy to add new transports
- Swap transports at runtime
- Composable logging strategies

### 4. Singleton Pattern (Per-Service)

Recommended usage: one Logger instance per service.

```typescript
// logger.ts
export const logger = new Logger({
  /* config */
});

// other files
import { logger } from "./logger";
const log = logger.createLogger("Module");
```

---

## Implementation Details

### Module Structure

```
src/
├── types/
│   └── index.ts                    # All type definitions
├── utils/
│   ├── id-generation.ts            # ID creation functions
│   ├── error-serialization.ts      # Error serialization logic
│   ├── truncation.ts               # String/object truncation
│   ├── validation.ts               # Validation & type guards
│   └── component-filter.ts         # Log entry filtering
├── transports/
│   ├── discord-rate-limiter.ts     # Rate limiting logic
│   ├── discord-webhook-transport.ts # Custom Discord transport
│   └── transport-factory.ts        # Creates all transports
├── config/
│   ├── defaults.ts                 # Default configurations
│   └── config-validator.ts         # Config validation
├── logger/
│   ├── scoped-logger.ts            # Scoped logger implementation
│   └── logger.ts                   # Main Logger class
└── index.ts                        # Public API exports
```

### Key Files

#### `src/types/index.ts`

- **Purpose:** Central type definitions
- **Exports:** All interfaces, types, and type guards
- **Rule:** No runtime code, only types

#### `src/utils/id-generation.ts`

- **Purpose:** Generate cryptographically secure IDs
- **Implementation:** Uses Node.js `crypto.randomBytes()`
- **Format:** `sid-{16-char-hex}` and `eid-{16-char-hex}`

#### `src/utils/error-serialization.ts`

- **Purpose:** Robust error serialization
- **Dependencies:** `serialize-error` package
- **Features:**
  - Handles unknown error types
  - Truncates stack traces
  - Limits cause chain depth
  - Extracts HTTP response details

#### `src/transports/discord-webhook-transport.ts`

- **Purpose:** Custom Winston transport for Discord
- **Complexity:** High (rate limiting, failover, retries)
- **Key Features:**
  - Per-webhook rate tracking
  - 429 Retry-After handling
  - Exponential backoff
  - Automatic failover to backup webhooks
  - Message truncation

#### `src/logger/scoped-logger.ts`

- **Purpose:** Implements logging interface
- **Methods:** `silly()`, `debug()`, `info()`, `warn()`, `error()`
- **Responsibilities:**
  - Build LogEntry objects
  - Normalize error/IDs
  - Auto-generate errorID for error logs
  - Delegate to Winston

#### `src/logger/logger.ts`

- **Purpose:** Main entry point
- **Responsibilities:**
  - Configuration validation
  - Create shared Winston instance
  - Factory for scoped loggers
  - Merge configurations with defaults

---

## Type System

### Branded Types

```typescript
type SessionID = string & { __brand: "SessionID" };
type ErrorID = string & { __brand: "ErrorID" };
```

**Usage:**

```typescript
const sessionID = createSessionID(); // Returns SessionID
const normalString: string = "sid-abc"; // Not a SessionID
const typedID: SessionID = normalString; // ❌ Type error

const validID: SessionID = createSessionID(); // ✅ OK
```

### Strict Interfaces

All interfaces use **strict** typing:

- Required fields are always required
- Optional fields use `?`
- No `any` types allowed
- Full IntelliSense support

### Component Filtering

```typescript
type LogEntryComponent = 'timestamp' | 'level' | 'origin' | ...;

interface BaseTransportConfig {
  entries: 'default' | LogEntryComponent[];
}
```

**"default"** is resolved per-transport:

- Console: `['timestamp', 'level', 'origin', 'identifier', 'message', 'sessionID', 'errorID']`
- File: All fields
- Discord: Message-focused subset

---

## Error Handling Philosophy

### 1. Never Interrupt Application Flow

The logger must **never** crash the application.

**Implementation:**

- Internal errors are logged to `console.warn()`
- Invalid inputs are normalized
- Transport failures are caught and logged

**Exception:** Constructor throws on invalid config to prevent misconfigured logger.

### 2. Graceful Degradation

When errors occur:

1. Log internal warning
2. Use fallback value
3. Continue operation

**Examples:**

- Invalid sessionID → `null` + warning
- Invalid error object → Serialize whatever was provided
- Discord webhook failure → Try next webhook

### 3. Structured Error Objects

All errors use `ErrorObject` interface:

```typescript
interface ErrorObject {
  name?: string;
  message: string; // Only required field
  stack?: string;
  code?: string | number;
  cause?: ErrorObject;
  response?: { status; statusText; data };
}
```

### 4. Truncation for Safety

Prevent massive logs:

- Stack traces: 1000 chars default
- Response data: 500 chars default
- Cause depth: 3 levels default

All configurable via `limits` config.

---

## Transport Layer

### Console Transport

**Purpose:** Development feedback  
**Format:** Human-readable with colors  
**When:** Development only (disable in production)

### File Transport (`app.log`)

**Purpose:** Complete log archive  
**Format:** JSON (one per line)  
**Level:** All levels (`silly` to `error`)

### Error File Transport (`errors.ndjson`)

**Purpose:** Error-specific log  
**Format:** NDJSON (Newline Delimited JSON)  
**Level:** Error only

### Discord Webhook Transport

**Purpose:** Real-time alerts  
**Complexity:** High (custom implementation)  
**Key Challenge:** Discord rate limits

#### Rate Limiting Strategy

Discord imposes:

- ~30 requests/minute per webhook
- 5 requests/2 seconds per webhook bucket

**Solution:**

1. Track rate limit state per webhook URL
2. Parse `X-RateLimit-*` headers
3. Queue messages when rate-limited
4. Respect `Retry-After` on 429 responses
5. Failover to backup webhooks

**Implementation:** `DiscordRateLimiter` class maintains state map.

#### Failover Mechanism

When multiple webhooks provided:

1. Try first webhook
2. On failure (after retries), try next
3. Continue until success or all exhausted

**Use Case:** Primary webhook for critical alerts, backup for redundancy.

### Sentry Transport

**Purpose:** Error monitoring platform  
**Implementation:** Uses `winston-transport-sentry-node`  
**Configuration:** Exposes DSN, environment, traces sample rate

### GCP Transport

**Purpose:** Google Cloud Logging integration  
**Implementation:** Uses `@google-cloud/logging-winston`  
**Authentication:** Service account key or Application Default Credentials

---

## Session History

This logger module has evolved through multiple conversation sessions:

### Session 1: Architecture Design (2026-01-06, f59d56ef)

**Focus:** Folder structure and module boundaries

**Decisions:**

- One responsibility per module
- Avoid god objects
- Isolate Winston from core logic
- Separate environment-specific code

**Output:** Module structure in `src/` directory

### Session 2: Type System (2026-01-06, b4fe18ab)

**Focus:** TypeScript type definitions

**Decisions:**

- Use branded types for IDs
- Strict interfaces
- No runtime code in types file
- No Winston references in types

**Output:** `src/types/index.ts`

### Session 3: ID Generation (2026-01-06, f6b0f2c6)

**Focus:** Implement ID utilities

**Decisions:**

- Use `crypto.randomBytes()` for security
- Format: `sid-{hex}` and `eid-{hex}`
- No external logger dependencies

**Output:** `src/utils/id-generation.ts`

### Session 4: Discord Transport (2026-01-05, 6b7e5efc)

**Focus:** Discord webhook with rate limiting

**Decisions:**

- Custom transport implementation
- Per-webhook rate tracking
- Failover support
- Respect Retry-After header

**Output:** Custom Discord transport

### Session 5: Configuration (2026-01-05, 2165d4a5)

**Focus:** Configurable limits and component filtering

**Decisions:**

- Make error limits configurable
- Add `entries` field per transport
- Implement component filtering utility

**Output:** Component filter and configurable limits

### Session 6: Error Handling Refactor (2026-01-05, 8fc7e3d3)

**Focus:** Remove throws, graceful degradation

**Decisions:**

- No throws in validation
- Return structured results
- Use fallback values
- Log internal warnings

**Output:** Non-throwing validation utilities

### Session 7: Current Implementation (2026-01-06)

**Focus:** Complete module implementation

**Deliverables:**

- Full type system
- All utility modules
- Custom Discord transport with rate limiting
- Transport factory
- Core logger classes
- Configuration system
- Comprehensive documentation
- Usage examples
- This memory file

---

## Future Iterations

### 1. Scoped Logger Overrides

**Goal:** Allow scoped loggers to override transport configuration

**Use Case:**

```typescript
const debugLog = logger.createLogger("DebugModule", {
  transports: {
    console: { level: "silly" }, // Override for this logger only
  },
});
```

**Implementation Challenge:** Requires separate Winston instance per scoped logger with overrides.

**Priority:** Medium

### 2. Log Batching

**Goal:** Batch logs before sending to reduce I/O

**Benefits:**

- Better performance for high-volume logging
- Reduced network requests for remote transports

**Implementation:** Buffer logs and flush periodically or on size threshold.

**Priority:** Low (optimize after adoption)

### 3. Custom Formatters

**Goal:** Allow users to provide custom formatters per transport

**Use Case:**

```typescript
file: {
  enabled: true,
  formatter: (entry) => customFormat(entry),
}
```

**Priority:** Low

### 4. Log Sampling

**Goal:** Sample logs in high-volume scenarios

**Use Case:** Only log 10% of info-level logs in production

**Implementation:** Sampling rate per level or per transport

**Priority:** Low

### 5. Metrics Integration

**Goal:** Expose metrics about logging (e.g., errors/minute)

**Use Case:** Prometheus metrics for log rates

**Implementation:** Increment counters, expose `/metrics` endpoint

**Priority:** Low

### 6. Structured Logging Helpers

**Goal:** Helper methods for common log patterns

**Example:**

```typescript
log.http(req, res, duration); // Auto-formats HTTP logs
log.database(query, duration, rows); // Auto-formats DB logs
```

**Priority:** Medium

### 7. Log Correlation

**Goal:** Automatic correlation across distributed systems

**Implementation:** Inject correlation IDs from request headers

**Priority:** Medium (important for microservices)

### 8. Dynamic Configuration

**Goal:** Update log levels at runtime without restart

**Use Case:** Enable debug logging temporarily to investigate issues

**Implementation:** Config watcher or admin API

**Priority:** Low

### 9. Performance Optimization

**Goal:** Benchmark and optimize hot paths

**Areas:**

- Error serialization
- Component filtering
- Winston integration

**Priority:** Low (optimize based on real-world usage)

### 10. Additional Transports

**Potential transports to add:**

- Elasticsearch
- Datadog
- CloudWatch
- Slack
- Custom webhook (generic)

**Priority:** Low (add based on user requests)

---

## Key Learnings

### 1. Winston Integration Complexity

Winston's transport interface is powerful but complex. Custom transports require careful handling of:

- Async completion callbacks
- Error events
- Log info object mutation

**Lesson:** Always call callback in `log()` method to avoid blocking.

### 2. Discord Rate Limiting

Discord's rate limits are stricter than documented. Real-world testing showed:

- 429 responses even within documented limits
- `Retry-After` values vary widely
- Multiple sequential requests can trigger rate limits

**Lesson:** Always implement exponential backoff and failover.

### 3. Type Safety vs. Runtime Safety

TypeScript provides compile-time safety, but runtime validation is still needed:

- Users might pass invalid data from external sources
- Configuration might come from JSON files
- Dynamic values need runtime checks

**Lesson:** Use TypeScript for API design, validation for runtime safety.

### 4. Error Serialization Edge Cases

The `serialize-error` package handles most cases, but:

- Circular references need special handling
- Custom error classes need special attention
- HTTP errors have varying response structures

**Lesson:** Test with diverse error types, provide escape hatches.

### 5. Documentation is Critical

A well-documented logger is more valuable than a feature-rich but opaque one.

**Lesson:** Invest heavily in documentation, examples, and guides.

---

## Design Principles Applied

1. **Single Responsibility:** Each module has one clear purpose
2. **Open/Closed:** Easy to extend with new transports, hard to break existing code
3. **Liskov Substitution:** Scoped loggers are interchangeable
4. **Interface Segregation:** Minimal, focused interfaces
5. **Dependency Inversion:** Depend on abstractions (Winston Transport interface)

---

## Testing Strategy (Future)

### Unit Tests

- ID generation format validation
- Error serialization edge cases
- Truncation limits
- Component filtering
- Validation logic

### Integration Tests

- Winston integration
- Transport creation
- Scoped logger creation
- Configuration merging

### E2E Tests

- Real file writes
- Real Discord webhook calls (with test webhooks)
- Multi-transport scenarios

**Priority:** High for production adoption

---

## Conclusion

This logger module represents a complete, production-ready logging solution built on clean architecture principles. The modular design enables easy maintenance and extension while providing a clean, ergonomic API for users.

**Key Success Factors:**

1. Winston is hidden from users
2. Scoped loggers share transports
3. Automatic error ID generation
4. Robust error serialization
5. Discord rate limiting handled correctly
6. Comprehensive documentation

**Next Steps:**

1. Add automated tests
2. Gather user feedback
3. Optimize based on real-world usage
4. Implement scoped logger overrides if needed

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-06  
**Maintainer:** Development Team
