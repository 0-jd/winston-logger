/**
 * Express.js Integration Example
 * 
 * Demonstrates logger integration with Express.js for request/error logging
 */

import express from 'express';
import { Logger } from '../src';

// Initialize logger
const logger = new Logger({
  service: 'express-api',
  transports: {
    console: {
      enabled: true,
      level: 'info',
      entries: 'default',
    },
    file: {
      enabled: true,
      filename: 'express-app.log',
      level: 'debug',
      entries: 'default',
    },
    errorFile: {
      enabled: true,
      filename: 'express-errors.ndjson',
      entries: 'default',
    },
  },
});

const app = express();
const serverLog = logger.createLogger('ExpressServer');
const requestLog = logger.createLogger('RequestHandler');
const errorLog = logger.createLogger('ErrorHandler');

// Middleware to add sessionID to each request
app.use((req, res, next) => {
  (req as any).sessionID = Logger.createSessionID();
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const sessionID = (req as any).sessionID;

  requestLog.info('Incoming request', 'request-start', {
    sessionID,
    meta: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    },
  });

  // Log response
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    requestLog[level]('Request completed', 'request-end', {
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

// Body parser
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/users/:id', (req, res) => {
  const sessionID = (req as any).sessionID;
  const userId = req.params.id;

  requestLog.debug('Fetching user', 'get-user', {
    sessionID,
    meta: { userId },
  });

  // Simulate user fetch
  res.json({
    id: userId,
    name: 'John Doe',
    email: 'john@example.com',
  });
});

app.post('/users', (req, res) => {
  const sessionID = (req as any).sessionID;

  requestLog.info('Creating new user', 'create-user', {
    sessionID,
    meta: {
      userData: req.body,
    },
  });

  res.status(201).json({
    id: '12345',
    ...req.body,
  });
});

// Route that throws an error
app.get('/error', (req, res, next) => {
  const error = new Error('Intentional error for testing');
  next(error);
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionID = (req as any).sessionID;
  const errorID = Logger.createErrorID();

  errorLog.error('Request error', 'error-middleware', {
    error: err,
    errorID,
    sessionID,
    meta: {
      method: req.method,
      url: req.url,
      body: req.body,
    },
  });

  res.status(500).json({
    error: 'Internal Server Error',
    errorID, // Return errorID to client for support tracking
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  const sessionID = (req as any).sessionID;

  requestLog.warn('Route not found', '404-handler', {
    sessionID,
    meta: {
      method: req.method,
      url: req.url,
    },
  });

  res.status(404).json({ error: 'Not Found' });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  serverLog.info('Server started', 'startup', {
    meta: {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
    },
  });
  
  console.log(`\nServer running on http://localhost:${PORT}`);
  console.log('Try these endpoints:');
  console.log(`  GET  http://localhost:${PORT}/`);
  console.log(`  GET  http://localhost:${PORT}/users/123`);
  console.log(`  POST http://localhost:${PORT}/users`);
  console.log(`  GET  http://localhost:${PORT}/error (triggers error)\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  serverLog.info('SIGTERM received, shutting down gracefully', 'shutdown');
  process.exit(0);
});
