# Usage Examples

Real-world usage examples for vanta-logger across different scenarios.

## Table of Contents

- [Express.js API Server](#expressjs-api-server)
- [Microservice with Session Tracking](#microservice-with-session-tracking)
- [Background Job Processor](#background-job-processor)
- [WebSocket Server](#websocket-server)
- [Multi-Environment Setup](#multi-environment-setup)

---

## Express.js API Server

Complete Express.js integration with request logging, error handling, and session tracking.

```typescript
import express from "express";
import { Logger } from "vanta-logger";

// Initialize logger
const logger = new Logger({
  service: "api-server",
  transports: {
    console: {
      enabled: process.env.NODE_ENV !== "production",
      level: "debug",
      entries: "default",
    },
    file: {
      enabled: true,
      filename: "logs/api.log",
      level: "info",
      entries: "default",
    },
    errorFile: {
      enabled: true,
      filename: "logs/errors.ndjson",
      entries: "default",
    },
    discord: {
      enabled: !!process.env.DISCORD_WEBHOOK,
      webhookUrls: process.env.DISCORD_WEBHOOK
        ? [process.env.DISCORD_WEBHOOK]
        : [],
      level: "error",
      entries: "default",
    },
  },
});

const app = express();
const serverLog = logger.createLogger("Server");
const requestLog = logger.createLogger("Request");
const errorLog = logger.createLogger("Error");

app.use(express.json());

// Session ID middleware
app.use((req, res, next) => {
  (req as any).sessionID = Logger.createSessionID();
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const sessionID = (req as any).sessionID;

  requestLog.info("Request received", "incoming", {
    sessionID,
    meta: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? "warn" : "info";

    requestLog[level]("Request completed", "response", {
      sessionID,
      meta: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
    });
  });

  next();
});

// Routes
app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.post("/api/users", async (req, res, next) => {
  const sessionID = (req as any).sessionID;
  const userLog = logger.createLogger("UserService");

  try {
    userLog.debug("Validating user data", "validate", {
      sessionID,
      meta: { userData: req.body },
    });

    // Validation
    if (!req.body.email) {
      const error = new Error("Email is required");
      (error as any).code = "VALIDATION_ERROR";
      throw error;
    }

    // Simulate user creation
    const user = {
      id: Math.random().toString(36).substr(2, 9),
      ...req.body,
      createdAt: new Date(),
    };

    userLog.info("User created", "create-success", {
      sessionID,
      meta: { userId: user.id },
    });

    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    const sessionID = (req as any).sessionID;
    const errorID = Logger.createErrorID();

    // Determine severity
    const isCritical = err.code !== "VALIDATION_ERROR";

    errorLog.error("Request error", "error-handler", {
      error: err,
      errorID,
      sessionID,
      sendDiscordWebhook: isCritical,
      comment: isCritical
        ? "Investigate server error"
        : "Client validation error",
      meta: {
        method: req.method,
        url: req.url,
        body: req.body,
      },
    });

    const statusCode = err.code === "VALIDATION_ERROR" ? 400 : 500;

    res.status(statusCode).json({
      error: err.message,
      errorID,
    });
  }
);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  serverLog.info("Server started", "startup", {
    meta: {
      port: PORT,
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
    },
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  serverLog.info("SIGTERM received", "shutdown");
  process.exit(0);
});
```

---

## Microservice with Session Tracking

Demonstrates session tracking across multiple service calls.

```typescript
import { Logger } from "vanta-logger";
import axios from "axios";

const logger = new Logger({
  service: "order-service",
  transports: {
    file: {
      enabled: true,
      filename: "order-service.log",
      entries: "default",
    },
  },
});

const log = logger.createLogger("OrderProcessor");
const paymentLog = logger.createLogger("PaymentClient");
const inventoryLog = logger.createLogger("InventoryClient");

interface Order {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
  totalAmount: number;
}

async function processOrder(order: Order) {
  // Create session ID for this order processing flow
  const sessionID = Logger.createSessionID();

  log.info("Processing order", "process-start", {
    sessionID,
    meta: {
      orderId: order.id,
      userId: order.userId,
      itemCount: order.items.length,
    },
  });

  try {
    // Step 1: Reserve inventory
    inventoryLog.info("Reserving inventory", "reserve-start", {
      sessionID,
      meta: { orderId: order.id, items: order.items },
    });

    await axios.post("https://inventory-service/reserve", {
      orderId: order.id,
      items: order.items,
    });

    inventoryLog.info("Inventory reserved", "reserve-success", {
      sessionID,
      meta: { orderId: order.id },
    });

    // Step 2: Process payment
    paymentLog.info("Processing payment", "payment-start", {
      sessionID,
      meta: {
        orderId: order.id,
        amount: order.totalAmount,
      },
    });

    const paymentResponse = await axios.post("https://payment-service/charge", {
      orderId: order.id,
      amount: order.totalAmount,
      userId: order.userId,
    });

    paymentLog.info("Payment processed", "payment-success", {
      sessionID,
      meta: {
        orderId: order.id,
        transactionId: paymentResponse.data.transactionId,
      },
    });

    // Step 3: Confirm order
    log.info("Order completed successfully", "process-complete", {
      sessionID,
      meta: {
        orderId: order.id,
        transactionId: paymentResponse.data.transactionId,
      },
    });

    return {
      success: true,
      orderId: order.id,
      transactionId: paymentResponse.data.transactionId,
    };
  } catch (error) {
    const errorID = Logger.createErrorID();

    // Determine which service failed
    let failedService = "unknown";
    if (axios.isAxiosError(error)) {
      failedService = error.config?.url?.includes("inventory")
        ? "inventory"
        : error.config?.url?.includes("payment")
        ? "payment"
        : "unknown";
    }

    log.error("Order processing failed", "process-error", {
      error,
      errorID,
      sessionID,
      sendDiscordWebhook: true, // Alert on all order failures
      comment: `Failed at ${failedService} service - initiate rollback`,
      meta: {
        orderId: order.id,
        failedService,
      },
    });

    // Initiate rollback (simplified)
    try {
      await rollbackOrder(order.id, sessionID);
    } catch (rollbackError) {
      log.error("Rollback failed", "rollback-error", {
        error: rollbackError,
        sessionID,
        sendDiscordWebhook: true,
        comment: "CRITICAL: Manual intervention required",
      });
    }

    throw new Error(`Order processing failed: ${errorID}`);
  }
}

async function rollbackOrder(orderId: string, sessionID: any) {
  log.warn("Initiating rollback", "rollback-start", {
    sessionID,
    meta: { orderId },
  });

  // Release inventory, refund payment, etc.
  // ...

  log.info("Rollback completed", "rollback-complete", {
    sessionID,
    meta: { orderId },
  });
}
```

---

## Background Job Processor

Using logger in a background job processor with job-specific tracking.

```typescript
import { Logger } from "vanta-logger";

const logger = new Logger({
  service: "job-processor",
  transports: {
    console: { enabled: true, level: "info", entries: "default" },
    file: {
      enabled: true,
      filename: "jobs.log",
      level: "debug",
      entries: "default",
    },
    errorFile: {
      enabled: true,
      filename: "job-errors.ndjson",
      entries: "default",
    },
  },
});

const processorLog = logger.createLogger("JobProcessor");

interface Job {
  id: string;
  type: string;
  data: any;
  retries: number;
}

async function processJob(job: Job) {
  // Use job ID as session ID for grouping all job-related logs
  const sessionID = `sid-job-${job.id}` as any;

  processorLog.info("Job started", "job-start", {
    sessionID,
    meta: {
      jobId: job.id,
      jobType: job.type,
      attempt: job.retries + 1,
    },
  });

  const startTime = Date.now();

  try {
    // Process based on job type
    switch (job.type) {
      case "email":
        await sendEmail(job.data, sessionID);
        break;
      case "report":
        await generateReport(job.data, sessionID);
        break;
      case "cleanup":
        await performCleanup(job.data, sessionID);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    const duration = Date.now() - startTime;

    processorLog.info("Job completed", "job-complete", {
      sessionID,
      meta: {
        jobId: job.id,
        jobType: job.type,
        duration: `${duration}ms`,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorID = Logger.createErrorID();

    // Determine if should retry
    const shouldRetry = job.retries < 3;

    processorLog.error("Job failed", "job-error", {
      error,
      errorID,
      sessionID,
      sendDiscordWebhook: !shouldRetry, // Only alert if no more retries
      comment: shouldRetry
        ? `Will retry (attempt ${job.retries + 2}/4)`
        : "Max retries exceeded",
      meta: {
        jobId: job.id,
        jobType: job.type,
        duration: `${duration}ms`,
        retries: job.retries,
      },
    });

    if (shouldRetry) {
      // Re-queue job with incremented retries
      await requeueJob({ ...job, retries: job.retries + 1 });
    } else {
      // Move to dead letter queue
      await moveToDeadLetterQueue(job, errorID);
    }
  }
}

async function sendEmail(data: any, sessionID: any) {
  const emailLog = logger.createLogger("EmailService");

  emailLog.debug("Sending email", "send-start", {
    sessionID,
    meta: { to: data.to, subject: data.subject },
  });

  // Email sending logic...

  emailLog.info("Email sent", "send-complete", {
    sessionID,
    meta: { to: data.to },
  });
}

async function generateReport(data: any, sessionID: any) {
  const reportLog = logger.createLogger("ReportService");

  reportLog.info("Generating report", "generate-start", {
    sessionID,
    meta: { reportType: data.type },
  });

  // Report generation logic...

  reportLog.info("Report generated", "generate-complete", {
    sessionID,
    meta: { reportType: data.type, size: "1.2MB" },
  });
}

async function performCleanup(data: any, sessionID: any) {
  const cleanupLog = logger.createLogger("CleanupService");

  cleanupLog.info("Starting cleanup", "cleanup-start", {
    sessionID,
    meta: { targetDate: data.before },
  });

  // Cleanup logic...

  cleanupLog.info("Cleanup completed", "cleanup-complete", {
    sessionID,
    meta: { deletedCount: 42 },
  });
}

async function requeueJob(job: Job) {
  // Re-queue implementation
}

async function moveToDeadLetterQueue(job: Job, errorID: any) {
  processorLog.warn("Moving job to DLQ", "dlq", {
    meta: { jobId: job.id, errorID },
  });
}
```

---

## WebSocket Server

Logging WebSocket connections and messages.

```typescript
import { WebSocketServer } from "ws";
import { Logger } from "vanta-logger";

const logger = new Logger({
  service: "websocket-server",
  transports: {
    console: { enabled: true, level: "debug", entries: "default" },
    file: { enabled: true, filename: "websocket.log", entries: "default" },
  },
});

const serverLog = logger.createLogger("WSServer");
const connectionLog = logger.createLogger("Connection");
const messageLog = logger.createLogger("Message");

const wss = new WebSocketServer({ port: 8080 });

wss.on("listening", () => {
  serverLog.info("WebSocket server started", "startup", {
    meta: { port: 8080 },
  });
});

wss.on("connection", (ws, req) => {
  // Create session ID for this connection
  const sessionID = Logger.createSessionID();

  connectionLog.info("Client connected", "connect", {
    sessionID,
    meta: {
      ip: req.socket.remoteAddress,
      userAgent: req.headers["user-agent"],
    },
  });

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());

      messageLog.debug("Message received", "message-in", {
        sessionID,
        meta: {
          type: message.type,
          size: data.length,
        },
      });

      // Handle message
      handleMessage(ws, message, sessionID);
    } catch (error) {
      messageLog.error("Invalid message format", "parse-error", {
        error,
        sessionID,
        meta: {
          rawData: data.toString().substring(0, 100),
        },
      });
    }
  });

  ws.on("close", (code, reason) => {
    connectionLog.info("Client disconnected", "disconnect", {
      sessionID,
      meta: {
        code,
        reason: reason.toString(),
      },
    });
  });

  ws.on("error", (error) => {
    connectionLog.error("Connection error", "error", {
      error,
      sessionID,
    });
  });
});

function handleMessage(ws: any, message: any, sessionID: any) {
  messageLog.info("Processing message", "process", {
    sessionID,
    meta: { type: message.type },
  });

  // Message handling logic...

  ws.send(JSON.stringify({ status: "ok" }));
}
```

---

## Multi-Environment Setup

Configuration pattern for different environments.

```typescript
import { Logger, LoggerConfig } from "vanta-logger";

function createLogger(): Logger {
  const env = process.env.NODE_ENV || "development";

  const baseConfig: LoggerConfig = {
    service: process.env.SERVICE_NAME || "my-app",
    limits: {
      stackLimit: 1000,
      responseDataLimit: 500,
      causeMaxDepth: 3,
    },
  };

  // Development configuration
  if (env === "development") {
    return new Logger({
      ...baseConfig,
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
  }

  // Staging configuration
  if (env === "staging") {
    return new Logger({
      ...baseConfig,
      level: "debug",
      transports: {
        console: {
          enabled: false,
        },
        file: {
          enabled: true,
          filename: "/var/log/myapp/staging.log",
          level: "debug",
          entries: "default",
          maxsize: 10485760,
          maxFiles: 5,
        },
        errorFile: {
          enabled: true,
          filename: "/var/log/myapp/staging-errors.ndjson",
          entries: "default",
        },
        discord: {
          enabled: !!process.env.DISCORD_WEBHOOK,
          webhookUrls: process.env.DISCORD_WEBHOOK
            ? [process.env.DISCORD_WEBHOOK]
            : [],
          level: "error",
          entries: "default",
        },
      },
    });
  }

  // Production configuration
  return new Logger({
    ...baseConfig,
    level: "info",
    transports: {
      console: {
        enabled: false,
      },
      file: {
        enabled: true,
        filename: "/var/log/myapp/app.log",
        level: "info",
        entries: "default",
        maxsize: 20971520, // 20MB
        maxFiles: 10,
        zippedArchive: true,
      },
      errorFile: {
        enabled: true,
        filename: "/var/log/myapp/errors.ndjson",
        entries: "default",
        maxsize: 10485760,
        maxFiles: 5,
      },
      discord: {
        enabled: !!process.env.DISCORD_WEBHOOK,
        webhookUrls: process.env.DISCORD_WEBHOOK
          ? [process.env.DISCORD_WEBHOOK]
          : [],
        level: "error",
        entries: "default",
      },
      sentry: {
        enabled: !!process.env.SENTRY_DSN,
        dsn: process.env.SENTRY_DSN || "",
        environment: "production",
        tracesSampleRate: 0.1, // Sample 10% in production
        level: "error",
        entries: "default",
      },
      gcp: {
        enabled: !!process.env.GCP_PROJECT_ID,
        projectId: process.env.GCP_PROJECT_ID || "",
        logName: `${process.env.SERVICE_NAME}-logs`,
        level: "info",
        entries: "default",
      },
    },
  });
}

export const logger = createLogger();
```
