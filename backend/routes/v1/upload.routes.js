import { Router } from 'express';
import {
  getImageKitAuth,
  uploadSingleFile,
  uploadDriverKycDocument
} from '../../controllers/upload.controller.js';
import { uploadSingle } from '../../middlewares/upload.middleware.js';

const router = Router();

// Endpoint for client-side SDK direct ImageKit upload (Flutter Rider App & Web)
// GET /api/v1/upload/imagekit-auth
router.get('/imagekit-auth', getImageKitAuth);

// Direct server-side stream upload endpoints
// POST /api/v1/upload/file
router.post('/file', uploadSingle('file'), uploadSingleFile);

// POST /api/v1/upload/driver-kyc
router.post('/driver-kyc', uploadSingle('file'), uploadDriverKycDocument);

export default router;
