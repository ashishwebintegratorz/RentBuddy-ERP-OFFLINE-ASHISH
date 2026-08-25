import express from 'express';
import {
  verifyAssetBarcode,
  checkoutAssets,
  checkinAssets,
  getAllAssets,
  createAsset,
  updateAssetById,
  deleteAssetById
} from '../../controllers/asset.controller.js';

const router = express.Router();

router.get('/', getAllAssets);
router.post('/', createAsset);
router.put('/:id', updateAssetById);
router.patch('/:id', updateAssetById);
router.delete('/:id', deleteAssetById);

router.post('/scan/verify', verifyAssetBarcode);
router.post('/verify-scan', verifyAssetBarcode);
router.post('/verify', verifyAssetBarcode);
router.post('/scan/checkout', checkoutAssets);
router.post('/scan/checkin', checkinAssets);

export default router;

