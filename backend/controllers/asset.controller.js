import { Asset, Order, AssetScanLog, DamageReport, Log } from '../models/index.js';

// Two-Way Barcode/QR Asset Verification
export const verifyAssetBarcode = async (req, res) => {
  try {
    const { orderId, barcode, scanType = 'CHECKOUT', driverId, driverName, latitude, longitude, deviceId } = req.body;

    if (!orderId || !barcode) {
      return res.status(400).json({ success: false, message: 'orderId and barcode are required for verification.' });
    }

    const cleanBarcode = barcode.trim().toUpperCase();

    // 1. Fetch the order
    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: `Order #${orderId} not found.` });
    }

    // 2. Fetch the physical asset
    const physicalAsset = await Asset.findOne({
      $or: [
        { barcode: cleanBarcode },
        { id: cleanBarcode },
        { barcode: cleanBarcode.replace('BAR-', '') }
      ]
    });

    // 3. Side 1: Does the order expect this asset?
    let matchedExpectedAsset = null;
    if (order.expectedAssets && order.expectedAssets.length > 0) {
      matchedExpectedAsset = order.expectedAssets.find(a => 
        (a.barcode && a.barcode.toUpperCase() === cleanBarcode) ||
        (a.assetId && a.assetId.toUpperCase() === cleanBarcode) ||
        (physicalAsset && a.assetId === physicalAsset.id)
      );
    } else if (order.items && order.items.length > 0) {
      matchedExpectedAsset = order.items.find(it => 
        (it.barcode && it.barcode.toUpperCase() === cleanBarcode) ||
        (it.id && it.id.toUpperCase() === cleanBarcode) ||
        (it.assetId && it.assetId.toUpperCase() === cleanBarcode)
      );
    }

    // 4. Two-Way Verification Comparison
    const logId = `SCAN-${Date.now()}`;

    if (!matchedExpectedAsset && !physicalAsset) {
      // Both sides failed
      await AssetScanLog.create({
        id: logId,
        orderId,
        assetBarcode: cleanBarcode,
        driverId: driverId || order.assignedDriverId,
        driverName: driverName || order.assignedDriverName,
        scanType,
        scanResult: 'REJECTED',
        latitude,
        longitude,
        deviceId,
        notes: `Barcode ${cleanBarcode} is not recognized in ERP inventory.`
      });

      return res.status(400).json({
        success: false,
        verified: false,
        code: 'UNKNOWN_ASSET',
        message: `INVALID ASSET: Barcode "${cleanBarcode}" does not exist in inventory system.`
      });
    }

    if (!matchedExpectedAsset) {
      // Asset exists in warehouse, but is NOT assigned to this order!
      await AssetScanLog.create({
        id: logId,
        assetId: physicalAsset ? physicalAsset.id : '',
        assetBarcode: cleanBarcode,
        orderId,
        driverId: driverId || order.assignedDriverId,
        driverName: driverName || order.assignedDriverName,
        scanType,
        scanResult: 'MISMATCH',
        latitude,
        longitude,
        deviceId,
        notes: `Asset ${physicalAsset?.id} scanned for Order ${orderId}, but belongs elsewhere.`
      });

      return res.status(400).json({
        success: false,
        verified: false,
        code: 'ASSET_ORDER_MISMATCH',
        message: `INVALID ASSET: "${physicalAsset?.model || cleanBarcode}" belongs to inventory, but is NOT assigned to Order #${order.id}.`,
        scannedAsset: physicalAsset ? { id: physicalAsset.id, name: physicalAsset.model } : null
      });
    }

    // 5. Success: Two-Way Match Verified!
    if (order.expectedAssets) {
      order.expectedAssets = order.expectedAssets.map(a => {
        if ((a.barcode && a.barcode.toUpperCase() === cleanBarcode) || (physicalAsset && a.assetId === physicalAsset.id)) {
          return { ...a, scannedAtCheckout: true, scannedAt: new Date().toISOString() };
        }
        return a;
      });
    }

    if (scanType === 'CHECKOUT') order.scannedAtLoading = true;
    if (scanType === 'DELIVERY') order.scannedAtDelivery = true;
    if (scanType === 'PICKUP') order.scannedAtPickup = true;
    if (scanType === 'CHECKIN') order.scannedAtWarehouseEntry = true;

    await order.save();

    // Create immutable audit log
    await AssetScanLog.create({
      id: logId,
      assetId: physicalAsset ? physicalAsset.id : matchedExpectedAsset.assetId,
      assetBarcode: cleanBarcode,
      orderId,
      driverId: driverId || order.assignedDriverId,
      driverName: driverName || order.assignedDriverName,
      scanType,
      scanResult: 'VERIFIED',
      latitude,
      longitude,
      deviceId,
      notes: `Two-way match verified for Order ${order.id}.`
    });

    const totalExpected = order.expectedAssets ? order.expectedAssets.length : (order.items?.length || 1);
    const totalScanned = order.expectedAssets ? order.expectedAssets.filter(a => a.scannedAtCheckout).length : 1;

    return res.json({
      success: true,
      verified: true,
      code: 'ASSET_VERIFIED',
      message: `VERIFIED: ${matchedExpectedAsset.assetName || physicalAsset?.model || cleanBarcode} matched with Order #${order.id}.`,
      data: {
        assetId: physicalAsset ? physicalAsset.id : matchedExpectedAsset.assetId,
        assetName: matchedExpectedAsset.assetName || physicalAsset?.model || 'Furniture Asset',
        barcode: cleanBarcode,
        totalExpected,
        totalScanned,
        allScanned: totalScanned >= totalExpected
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Asset Checkout: Prevents Partial Checkout & Updates Inventory to OUT_FOR_DELIVERY
export const checkoutAssets = async (req, res) => {
  try {
    const { orderId, driverId } = req.body;
    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Validate if any expected assets are missing
    if (order.expectedAssets && order.expectedAssets.length > 0) {
      const pendingAssets = order.expectedAssets.filter(a => !a.scannedAtCheckout);
      if (pendingAssets.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'PARTIAL_CHECKOUT_BLOCKED',
          message: `Cannot dispatch: ${pendingAssets.length} of ${order.expectedAssets.length} assets have NOT been scanned yet. Please scan all items before dispatching.`,
          pendingAssets
        });
      }
    }

    // Transition Order & Assets to OUT_FOR_DELIVERY
    order.status = 'OUT_FOR_DELIVERY';
    order.deliveryStatus = 'out_for_delivery';
    order.dispatchedAt = new Date().toISOString();
    await order.save();

    // Update physical assets to OUT_FOR_DELIVERY
    if (order.expectedAssets) {
      for (const item of order.expectedAssets) {
        if (item.assetId) {
          await Asset.findOneAndUpdate(
            { id: item.assetId },
            { status: 'OUT_FOR_DELIVERY', currentStatus: 'OUT_FOR_DELIVERY' }
          );
        }
      }
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Driver / Logistics',
      action: 'ASSETS_CHECKED_OUT',
      details: `All items for Order ${order.id} scanned and checked out from warehouse.`
    });

    return res.json({
      success: true,
      message: `Checkout Complete: Order #${order.id} is now OUT FOR DELIVERY.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Warehouse Check-In with Quality Inspection
export const checkinAssets = async (req, res) => {
  try {
    const { orderId, assetId, condition = 'GOOD', damageDescription, damagePhotos, severity = 'Minor' } = req.body;

    const asset = await Asset.findOne({ id: assetId }) || await Asset.findById(assetId);
    if (!asset) return res.status(404).json({ success: false, message: 'Asset not found' });

    let finalStatus = 'AVAILABLE';

    if (condition.toUpperCase() === 'GOOD') {
      finalStatus = 'AVAILABLE';
      asset.status = 'AVAILABLE';
      asset.currentStatus = 'AVAILABLE';
      asset.condition = 'GOOD';
    } else {
      // Condition is Damaged
      finalStatus = 'DAMAGE_REVIEW';
      asset.status = 'DAMAGE_REVIEW';
      asset.currentStatus = 'DAMAGE_REVIEW';
      asset.condition = condition;

      // Auto-file Damage Report
      await DamageReport.create({
        id: `DMG-${Date.now().toString().slice(-6)}`,
        assetId: asset.id,
        assetBarcode: asset.barcode,
        assetName: asset.model,
        orderId,
        damageType: condition,
        severity,
        description: damageDescription || 'Reported during return quality inspection',
        photos: damagePhotos || [],
        status: 'PENDING_REVIEW'
      });
    }

    await asset.save();

    await AssetScanLog.create({
      id: `SCAN-${Date.now()}`,
      assetId: asset.id,
      assetBarcode: asset.barcode,
      orderId,
      scanType: 'CHECKIN',
      scanResult: 'VERIFIED',
      notes: `Warehouse check-in condition: ${condition}`
    });

    return res.json({
      success: true,
      message: `Asset ${asset.id} successfully checked in. Status: ${finalStatus}`,
      data: { assetId: asset.id, status: finalStatus, condition }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
