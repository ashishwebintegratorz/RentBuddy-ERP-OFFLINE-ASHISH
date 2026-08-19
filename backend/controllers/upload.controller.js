import imageKitService from '../services/imagekit.service.js';
import { successResponse, errorResponse } from '../utils/response.js';

/**
 * Endpoint for Rider Mobile App / Frontend direct client SDK upload auth
 * GET /api/upload/imagekit-auth
 */
export const getImageKitAuth = (req, res) => {
  try {
    if (!imageKitService.isConfigured()) {
      return errorResponse(
        res,
        'ImageKit credentials are not configured in backend .env. Please set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT.',
        500
      );
    }

    const authParams = imageKitService.getAuthenticationParameters();
    return successResponse(res, 'ImageKit authentication parameters generated', {
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
    });
  } catch (err) {
    return errorResponse(res, `Failed to generate ImageKit auth: ${err.message}`, 500);
  }
};

/**
 * Endpoint to upload a single file (image/pdf) via server stream
 * POST /api/upload/file
 */
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file was uploaded', 400);
    }

    const folder = req.body.folder || 'general';
    const originalName = req.file.originalname || `upload_${Date.now()}.jpg`;

    const uploadResult = await imageKitService.uploadBuffer({
      fileBuffer: req.file.buffer,
      fileName: originalName,
      folder,
      tags: req.body.tags ? req.body.tags.split(',') : []
    });

    return successResponse(res, 'File uploaded to ImageKit CDN successfully', uploadResult, 201);
  } catch (err) {
    return errorResponse(res, `Upload failed: ${err.message}`, 500);
  }
};

/**
 * Dedicated endpoint for driver KYC document upload
 * POST /api/upload/driver-kyc
 */
export const uploadDriverKycDocument = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No document file uploaded', 400);
    }

    const { driverId, docType } = req.body;
    if (!driverId || !docType) {
      return errorResponse(res, 'Both driverId and docType (e.g., aadhaarFront, licenseFront) are required', 400);
    }

    const uploadResult = await imageKitService.uploadDriverKYC(
      driverId,
      docType,
      req.file.buffer,
      req.file.originalname
    );

    return successResponse(res, `Driver KYC [${docType}] uploaded successfully`, uploadResult, 201);
  } catch (err) {
    return errorResponse(res, `Driver KYC upload failed: ${err.message}`, 500);
  }
};
