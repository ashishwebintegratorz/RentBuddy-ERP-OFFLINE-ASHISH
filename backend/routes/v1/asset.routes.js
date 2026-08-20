import express from 'express';
import {
  verifyAssetBarcode,
  checkoutAssets,
  checkinAssets
} from '../../controllers/asset.controller.js';

const router = express.Router();

router.post('/scan/verify', verifyAssetBarcode);
router.post('/scan/checkout', checkoutAssets);
router.post('/scan/checkin', checkinAssets);

export default router;
