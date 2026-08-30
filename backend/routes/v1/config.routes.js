import { Router } from 'express';
import { GOOGLE_MAPS_API_KEY, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT } from '../../config/constants.js';

const router = Router();

// GET /api/v1/config/maps (or /api/v1/config/app)
router.get('/maps', (req, res) => {
  return res.json({
    success: true,
    data: {
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      googleApiKey: GOOGLE_MAPS_API_KEY,
      mapProvider: 'google_maps',
      isConfigured: Boolean(GOOGLE_MAPS_API_KEY)
    }
  });
});

router.get('/app', (req, res) => {
  return res.json({
    success: true,
    data: {
      appName: 'RentBuddy Logistics',
      companyName: 'RentBuddy Furnishing & Appliances',
      googleMapsApiKey: GOOGLE_MAPS_API_KEY,
      imageKit: {
        publicKey: IMAGEKIT_PUBLIC_KEY,
        urlEndpoint: IMAGEKIT_URL_ENDPOINT
      }
    }
  });
});

export default router;
