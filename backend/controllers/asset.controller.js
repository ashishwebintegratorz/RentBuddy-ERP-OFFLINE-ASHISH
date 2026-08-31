import { Asset, Order, AssetScanLog, DamageReport, Log } from '../models/index.js';

// Two-Way Barcode/QR Asset Verification (Supports Universal Scanner & Order-Linked Scanning)
export const verifyAssetBarcode = async (req, res) => {
  try {
    const { orderId, barcode, scanType = 'CHECKOUT', driverId, driverPhone, driverName, latitude, longitude, deviceId } = req.body;

    if (!barcode || !barcode.trim()) {
      return res.status(400).json({
        success: false,
        verified: false,
        code: 'MISSING_BARCODE',
        message: 'Barcode or asset serial code is required for scanning.'
      });
    }

    const cleanBarcode = barcode.trim().toUpperCase();

    // 1. Fetch physical asset from ERP Inventory (if present)
    const physicalAsset = await Asset.findOne({
      $or: [
        { barcode: cleanBarcode },
        { barcode: `BAR-${cleanBarcode}` },
        { id: cleanBarcode },
        { barcode: cleanBarcode.replace(/^BAR-/, '') },
        { id: cleanBarcode.replace(/^BAR-/, '') }
      ]
    });

    // 2. Order Resolution
    let order = null;
    if (orderId) {
      order = await Order.findOne({ id: orderId });
      if (!order) {
        try {
          order = await Order.findById(orderId);
        } catch (_) {}
      }
      const cleanNum = orderId.toString().replace(/[^0-9]/g, '');
      if (!order && cleanNum) {
        order = await Order.findOne({ id: new RegExp(cleanNum, 'i') });
      }
      if (!order) {
        return res.status(404).json({
          success: false,
          verified: false,
          code: 'ORDER_NOT_FOUND',
          message: `Order #${orderId} was not found in the database.`
        });
      }
    } else {
      // Universal Scanner mode: Find the active order that specifically contains this barcode
      const candidateOrders = await Order.find({
        status: { $in: ['ASSIGNED', 'READY_FOR_DISPATCH', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKUP_PENDING', 'PENDING'] }
      });

      for (const ord of candidateOrders) {
        const matchesExpected = (ord.expectedAssets || []).some(a =>
          (a.barcode && a.barcode.toUpperCase() === cleanBarcode) ||
          (a.assetId && a.assetId.toUpperCase() === cleanBarcode) ||
          (physicalAsset && a.assetId === physicalAsset.id)
        );
        const matchesItem = (ord.items || []).some(it =>
          (it.barcode && it.barcode.toUpperCase() === cleanBarcode) ||
          (it.assetId && it.assetId.toUpperCase() === cleanBarcode) ||
          (it.id && it.id.toUpperCase() === cleanBarcode) ||
          (physicalAsset && it.assetId === physicalAsset.id)
        );
        if (matchesExpected || matchesItem) {
          order = ord;
          break;
        }
      }

      // DO NOT fallback to random orders! If barcode doesn't match any active order, reject immediately.
      if (!order) {
        return res.status(404).json({
          success: false,
          verified: false,
          code: 'BARCODE_NOT_FOUND',
          message: `Wrong Product / Invalid Barcode: Barcode "${cleanBarcode}" is not assigned to any active delivery order.`
        });
      }
    }

    // 3. Strict Rider Authorization Check: Only assigned rider can scan the order
    if (driverId || driverPhone || driverName) {
      const cleanDriverPhone = (driverPhone || '').replace(/[^0-9]/g, '').slice(-10);
      const orderDriverPhone = (order.assignedDriverPhone || '').replace(/[^0-9]/g, '').slice(-10);

      const isDriverAuthorized = (
        (!order.assignedDriverId && !order.assignedDriverPhone) || // Order not assigned yet, rider is claiming it
        (driverId && order.assignedDriverId && (order.assignedDriverId === driverId || order.assignedDriverId === driverId.toString())) ||
        (cleanDriverPhone && orderDriverPhone && cleanDriverPhone === orderDriverPhone) ||
        (driverName && order.assignedDriverName && driverName.trim().toLowerCase() === order.assignedDriverName.trim().toLowerCase())
      );

      if (!isDriverAuthorized) {
        const assignedRider = order.assignedDriverName || order.assignedDriverPhone || order.assignedDriverId || 'Another Driver';
        return res.status(403).json({
          success: false,
          verified: false,
          code: 'UNAUTHORIZED_RIDER',
          message: `Access Denied: Order #${order.id} is assigned to Rider "${assignedRider}". You are not authorized to scan or dispatch this order.`
        });
      }
    }

    // 4. Strict Barcode Verification against Order's Expected Assets, Items, and Consignment Tag
    const orderNum = (order.id || '').replace(/[^0-9]/g, '');
    const custClean = (order.customerName || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const validConsignmentTags = [
      (order.id || '').toUpperCase(),
      (order.orderBarcode || '').toUpperCase(),
      (order.trackingNumber || '').toUpperCase(),
      `RB-${custClean}-${orderNum}`,
      `RB-ORD-${orderNum}`,
      `ORD-${orderNum}`,
      `SHIP-${orderNum}`
    ].filter(Boolean);

    const matchesConsignmentTag = validConsignmentTags.some(tag => 
      tag === cleanBarcode || cleanBarcode.includes(tag) || (tag.length > 5 && tag.includes(cleanBarcode))
    );

    let matchedExpectedAsset = null;
    if (order.expectedAssets && order.expectedAssets.length > 0) {
      matchedExpectedAsset = order.expectedAssets.find(a =>
        (a.barcode && a.barcode.toUpperCase() === cleanBarcode) ||
        (a.assetId && a.assetId.toUpperCase() === cleanBarcode) ||
        (a.assetId && cleanBarcode.includes(a.assetId.toUpperCase())) ||
        (physicalAsset && a.assetId === physicalAsset.id)
      );
    }

    if (!matchedExpectedAsset && order.items && order.items.length > 0) {
      matchedExpectedAsset = order.items.find(it =>
        (it.barcode && it.barcode.toUpperCase() === cleanBarcode) ||
        (it.assetId && it.assetId.toUpperCase() === cleanBarcode) ||
        (it.id && it.id.toUpperCase() === cleanBarcode) ||
        (it.assetId && cleanBarcode.includes(it.assetId.toUpperCase())) ||
        (physicalAsset && it.assetId === physicalAsset.id)
      );
    }

    if (!matchedExpectedAsset && matchesConsignmentTag) {
      matchedExpectedAsset = (order.expectedAssets && order.expectedAssets[0]) || (order.items && order.items[0]) || {
        assetName: 'Solid Wood Furniture Unit',
        assetId: `RB-AST-${orderNum || '101'}`
      };
    }

    // If barcode is neither in expectedAssets, items, consignment tag nor physical asset, reject as wrong product!
    if (!matchedExpectedAsset && !physicalAsset && !matchesConsignmentTag) {
      return res.status(400).json({
        success: false,
        verified: false,
        code: 'INVALID_PRODUCT_BARCODE',
        message: `Wrong Product: Barcode "${cleanBarcode}" does NOT match any furniture item for Order #${order.id} (${order.customerName || 'Customer'}). Please scan the correct product barcode.`
      });
    }

    const ordId = order.id || order._id.toString();
    const verifiedAssetName = matchedExpectedAsset?.assetName || matchedExpectedAsset?.name || matchedExpectedAsset?.category || physicalAsset?.model || physicalAsset?.category || 'Furniture Asset';
    const verifiedAssetId = matchedExpectedAsset?.assetId || matchedExpectedAsset?.id || physicalAsset?.id || `AST-${cleanBarcode.replace(/[^0-9]/g, '') || '101'}`;

    // Mark asset scanned in order.expectedAssets
    if (order.expectedAssets && order.expectedAssets.length > 0) {
      let foundInExpected = false;
      order.expectedAssets = order.expectedAssets.map(a => {
        const isMatch = (a.barcode && a.barcode.toUpperCase() === cleanBarcode) ||
                        (a.assetId && a.assetId.toUpperCase() === cleanBarcode) ||
                        (physicalAsset && a.assetId === physicalAsset.id);
        if (isMatch) {
          foundInExpected = true;
          return {
            ...a,
            scannedAtCheckout: scanType === 'CHECKOUT' ? true : a.scannedAtCheckout,
            scannedAtDelivery: scanType === 'DELIVERY' ? true : a.scannedAtDelivery,
            scannedAtReturn: scanType === 'RETURN_PICKUP' ? true : a.scannedAtReturn,
            scannedAt: new Date().toISOString()
          };
        }
        return a;
      });

      if (!foundInExpected) {
        order.expectedAssets.push({
          assetId: verifiedAssetId,
          assetName: verifiedAssetName,
          barcode: cleanBarcode,
          scannedAtCheckout: scanType === 'CHECKOUT',
          scannedAtDelivery: scanType === 'DELIVERY',
          scannedAtReturn: scanType === 'RETURN_PICKUP',
          scannedAt: new Date().toISOString()
        });
      }
    } else {
      order.expectedAssets = [{
        assetId: verifiedAssetId,
        assetName: verifiedAssetName,
        barcode: cleanBarcode,
        scannedAtCheckout: scanType === 'CHECKOUT',
        scannedAtDelivery: scanType === 'DELIVERY',
        scannedAtReturn: scanType === 'RETURN_PICKUP',
        scannedAt: new Date().toISOString()
      }];
    }

    if (scanType === 'CHECKOUT') {
      order.scannedAtLoading = true;
      order.scannedAtCheckout = true;
      order.deliveryStatus = 'out_for_delivery';
      order.status = 'OUT_FOR_DELIVERY';
      order.dispatchedAt = new Date().toISOString();
    } else if (scanType === 'DELIVERY' || scanType === 'DOORSTEP_SCAN') {
      // Step 2 Doorstep Handover Barcode Scan -> Confirms physical item presence, unlocks Step 3 Customer OTP
      order.scannedAtLoading = true;
      order.scannedAtCheckout = true;
      order.scannedAtDelivery = true;
      order.doorstepScanned = true;
      order.deliveryStatus = 'out_for_delivery';
      order.status = 'OUT_FOR_DELIVERY';
    } else if (scanType === 'RETURN_PICKUP' || scanType === 'PICKUP') {
      order.scannedAtReturn = true;
      order.deliveryStatus = 'returned';
      order.status = 'RETURNED';
      order.returnedAt = new Date().toISOString();
    }

    await order.save();

    const cleanNum = (orderId || order.id || '').toString().replace(/[^0-9]/g, '');
    const logId = `LOG-SCAN-${Date.now()}`;

    // Sync database across all query variations
    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: ordId },
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            ...( (scanType === 'RETURN_PICKUP' || scanType === 'PICKUP') ? {
              scannedAtReturn: true,
              deliveryStatus: 'returned',
              status: 'RETURNED',
              returnedAt: order.returnedAt
            } : (scanType === 'DELIVERY' || scanType === 'DOORSTEP_SCAN') ? {
              scannedAtLoading: true,
              scannedAtCheckout: true,
              scannedAtDelivery: true,
              doorstepScanned: true,
              deliveryStatus: 'out_for_delivery',
              status: 'OUT_FOR_DELIVERY'
            } : {
              scannedAtLoading: true,
              scannedAtCheckout: true,
              deliveryStatus: 'out_for_delivery',
              status: 'OUT_FOR_DELIVERY'
            })
          }
        }
      );

      // Auto-restore physical assets back to Available warehouse stock
      if (scanType === 'RETURN_PICKUP' || scanType === 'PICKUP') {
        const assetIds = [
          verifiedAssetId,
          ...(order.items || []).map(it => it.assetId || it.id),
          ...(order.expectedAssets || []).map(it => it.assetId || it.id)
        ].filter(Boolean);

        if (assetIds.length > 0) {
          await Asset.updateMany(
            {
              $or: [
                { id: { $in: assetIds } },
                { barcode: { $in: [cleanBarcode, ...assetIds] } }
              ]
            },
            {
              $set: {
                status: 'Available',
                currentStatus: 'AVAILABLE',
                currentCustomer: null,
                currentOrderId: null
              }
            }
          );
          console.log(`\n\x1b[32m♻️ [RentBuddy Asset Return] Asset(s) ${assetIds.join(', ')} marked AVAILABLE in Warehouse Inventory.\x1b[0m`);
        }
      }
    } catch (_) {}

    // Create immutable audit log
    await AssetScanLog.create({
      id: logId,
      assetId: verifiedAssetId,
      assetBarcode: cleanBarcode,
      orderId: ordId,
      driverId: driverId || order.assignedDriverId,
      driverName: driverName || order.assignedDriverName,
      scanType,
      scanResult: 'VERIFIED',
      latitude,
      longitude,
      deviceId,
      notes: `Verified successfully for Order #${ordId}. Customer: ${order.customerName || 'Customer'}`
    });

    console.log(`\n\x1b[32m✅ [RentBuddy Barcode Engine] Barcode "${cleanBarcode}" matched to Order #${ordId} (${order.customerName || 'Customer'})\x1b[0m`);

    return res.json({
      success: true,
      verified: true,
      code: 'ASSET_VERIFIED',
      message: `VERIFIED: "${verifiedAssetName}" identified for Order #${ordId} (${order.customerName || 'Customer'})`,
      data: {
        assetId: verifiedAssetId,
        assetName: verifiedAssetName,
        barcode: cleanBarcode,
        orderId: ordId,
        customerName: order.customerName || 'Customer',
        customerMobile: order.customerMobile || '',
        customerAddress: order.deliveryAddress || 'Indore Hub',
        scanType,
        totalExpected: 1,
        totalScanned: 1,
        allScanned: true
      }
    });
  } catch (error) {
    console.error('Verify asset barcode error:', error);
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

// Get all assets
export const getAllAssets = async (req, res) => {
  try {
    const assets = await Asset.find({});
    return res.json({ success: true, count: assets.length, data: assets });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create new asset
export const createAsset = async (req, res) => {
  try {
    const assetData = req.body;
    if (!assetData.id) {
      assetData.id = `RB-AST-${Date.now()}`;
    }
    const created = await Asset.findOneAndUpdate(
      { id: assetData.id },
      { $set: assetData },
      { upsert: true, returnDocument: 'after' }
    );
    return res.status(201).json({ success: true, message: 'Asset created successfully', data: created });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update asset by ID or Barcode
export const updateAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await Asset.findOneAndUpdate(
      { $or: [{ id }, { barcode: id }, ...(id.match(/^[0-9a-fA-F]{24}$/) ? [{ _id: id }] : [])] },
      { $set: updates },
      { returnDocument: 'after', upsert: true }
    );

    console.log(`🍃 [Asset Controller] Updated asset [${id}] in MongoDB Atlas:`, updates);

    return res.json({
      success: true,
      message: `Asset ${id} updated successfully.`,
      data: updated
    });
  } catch (error) {
    console.error('Update asset error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete asset by ID
export const deleteAssetById = async (req, res) => {
  try {
    const { id } = req.params;
    await Asset.findOneAndDelete({ $or: [{ id }, { barcode: id }] });
    return res.json({ success: true, message: `Asset ${id} deleted successfully.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

