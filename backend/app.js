import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { CORS_ORIGIN } from './config/constants.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Global Middlewares
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-platform']
}));

// Body Parsers (Support up to 50mb payloads for large JSON sync blobs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Live Terminal Request Logger
app.use((req, res, next) => {
  console.log(`📡 [RentBuddy Gateway] ${req.method} ${req.originalUrl}`);
  next();
});

// Apply rate limiting across general API endpoints
app.use('/api', apiLimiter);

// Mount Modular API Routes
app.use('/api', routes);

// Global 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
