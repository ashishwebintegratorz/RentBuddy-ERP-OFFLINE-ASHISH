import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import routes from './routes/index.js';
import { CORS_ORIGIN } from './config/constants.js';
import { sanitizeInputs } from './middlewares/sanitize.middleware.js';
import { apiLimiter } from './middlewares/rateLimiter.middleware.js';
import { notFoundHandler, errorHandler } from './middlewares/error.middleware.js';

const app = express();

// 1. HTTP Security Headers (Helmet)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // Allows dynamic ImageKit & Map tile assets in dev/webview
}));

// 2. CORS Allowed Origins
app.use(cors({
  origin: CORS_ORIGIN === '*' ? '*' : CORS_ORIGIN.split(',').map(s => s.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-client-platform']
}));

// 3. Body Parsers with limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. HTTP Parameter Pollution Protection
app.use(hpp());

// 5. NoSQL Injection & Input Sanitization
app.use(sanitizeInputs);

// 6. Quiet logger (Keeps terminal clean for critical events & OTP banners)

// 7. Health Check & Load Balancer Probes
app.get(['/healthz', '/health', '/api/health'], (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// 8. Apply rate limiting across general API endpoints
app.use('/api', apiLimiter);

// 9. Mount Modular API Routes
app.use('/api', routes);

// Global 404 Not Found Handler
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);

export default app;
