import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

// Global Middlewares
app.use(cors({
  origin: '*', // Allow Flutter Rider App, React Web Frontend & local tools
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-platform']
}));

// Body Parsers (Support up to 50mb payloads for large JSON sync blobs)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Apply rate limiting across general API endpoints
app.use('/api', apiLimiter);

// Mount Modular API Routes
app.use('/api', routes);

// Global 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
