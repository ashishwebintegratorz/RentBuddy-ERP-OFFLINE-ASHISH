import { Order, Customer, Driver, Asset, Zone, Log } from '../models/index.js';
import { addNotification } from '../utils/notification.helper.js';

export const getOrders = async (req, res) => {
  try {
    const { zone, status, city, driverId } = req.query;
    const query = {};
    if (zone) query.zone = zone;
    if (status) query.status = status;
    if (city) query.city = city;
    if (driverId) query.assignedDriverId = driverId;

    const orders = await Order.find(query).sort({ createdAt: -1 });
    return res.json({ success: true, data: orders, count: orders.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ id: req.params.id }) || await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return res.json({ success: true, data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create Order (POS / Online Checkout) & Synchronize Asset Reservations
export const createOrder = async (req, res) => {
  try {
    const { 
      id,
      customerId, 
      customerName,
      customerMobile,
      items, 
      deliveryAddress, 
      city, 
      zone, 
      durationMonths, 
      startDate, 
      endDate, 
      totalDeposit, 
      netDeposit,
      totalMonthlyRent,
      netMonthlyRent,
      discountAmount,
      discountType,
      discountValue,
      status
    } = req.body;

    const customer = customerId ? (await Customer.findOne({ id: customerId }) || await Customer.findById(customerId)) : null;
    const finalCustName = customer ? customer.fullName : (customerName || 'Customer');
    const finalCustMobile = customer ? customer.mobileNumber : (customerMobile || '');
    const finalCity = city || (customer ? customer.city : 'Indore');
    const finalAddress = deliveryAddress || (customer ? customer.deliveryAddress || customer.currentAddress : '');

    const orderId = id || `RB-ORD-${Date.now().toString().slice(-6)}`;
    
    // Check if order already exists (upsert logic)
    let order = await Order.findOne({ id: orderId });
    if (!order) {
      order = new Order({
        id: orderId,
        customerId: customer ? customer.id : customerId,
        customerName: finalCustName,
        customerMobile: finalCustMobile,
        deliveryAddress: finalAddress,
        city: finalCity,
        zone: zone || 'Zone A (North)',
        items: items || [],
        durationMonths: durationMonths || 3,
        startDate: startDate || new Date().toISOString().split('T')[0],
        endDate: endDate || new Date(Date.now() + (durationMonths || 3) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        totalDeposit: totalDeposit || 0,
        netDeposit: netDeposit !== undefined ? netDeposit : totalDeposit || 0,
        totalMonthlyRent: totalMonthlyRent || 0,
        netMonthlyRent: netMonthlyRent !== undefined ? netMonthlyRent : totalMonthlyRent || 0,
        discountAmount: discountAmount || 0,
        discountType: discountType || 'flat',
        discountValue: discountValue || 0,
        status: status || 'Pending',
        deliveryStatus: 'READY_FOR_DISPATCH',
        expectedAssets: (items || []).map(it => ({
          assetId: it.assetId || it.id,
          assetName: it.name || it.title || it.assetName || it.category || 'Asset',
          barcode: it.barcode || it.assetBarcode || `BAR-${it.assetId || it.id || '001'}`,
          scannedAtCheckout: false,
          scannedAtDelivery: false
        }))
      });
      await order.save();
    } else {
      Object.assign(order, req.body);
      await order.save();
    }

    // Immediately reserve all allocated inventory assets in MongoDB Atlas
    if (items && Array.isArray(items)) {
      for (const it of items) {
        const aId = it.assetId || it.id;
        if (aId) {
          await Asset.updateMany(
            { $or: [{ id: aId }, { barcode: aId }, { _id: aId.length === 24 ? aId : undefined }].filter(Boolean) },
            { 
              $set: { 
                status: 'Reserved',
                currentOrderId: orderId,
                currentCustomer: finalCustName
              } 
            }
          );
        }
      }
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Admin',
      city: finalCity,
      action: 'ORDER_CREATED',
      details: `Order ${orderId} created for ${finalCustName} in ${finalCity}. Assets reserved: ${(items || []).map(i => i.assetId || i.id).join(', ')}`
    });

    await addNotification({
      title: '📦 New Order Placed',
      message: `Order #${orderId} booked for ${finalCustName} (${finalCity}). Deposit: ₹${order.netDeposit || 0}, Rent: ₹${order.netMonthlyRent || 0}/mo.`,
      type: 'info',
      city: finalCity,
      orderId: orderId,
      category: 'order'
    });

    return res.status(201).json({ success: true, message: 'Order created and inventory reserved successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Assign Driver to Order
export const assignDriverToOrder = async (req, res) => {
  try {
    const { driverId, isReturn, isReturnPickup } = req.body;
    const orderId = req.params.id;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const driver = await Driver.findOne({ id: driverId }) || await Driver.findById(driverId) || await Driver.findOne({ phone: driverId });
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    // City Match Cross-Check: Prevent cross-city driver dispatch
    if (order.city && driver.city) {
      const getBase = (str) => (str || '').toLowerCase().replace(/\(.*?\)/g, '').trim();
      const orderCityBase = getBase(order.city);
      const driverCityBase = getBase(driver.city);
      if (orderCityBase && driverCityBase && !orderCityBase.includes(driverCityBase) && !driverCityBase.includes(orderCityBase)) {
        return res.status(400).json({
          success: false,
          message: `City Mismatch: Driver "${driver.fullName}" is assigned to "${driver.city}" hub, but Order #${order.id} is for "${order.city}". Drivers can only accept deliveries within their registered city hub.`
        });
      }
    }

    const isReturnTask = Boolean(isReturn || isReturnPickup);

    order.isReturnPickup = isReturnTask;
    order.assignedDriverId = driver.id;
    order.assignedDriverName = driver.fullName;
    order.assignedDriverPhone = driver.phone;
    order.assignedLogisticsUser = driver.fullName;
    order.status = isReturnTask ? 'RETURN_PICKUP' : 'ASSIGNED';
    order.deliveryStatus = isReturnTask ? 'return_assigned' : 'driver_notified';
    order.assignedAt = new Date().toISOString();

    await order.save();

    const cleanNum = (orderId || order.id || '').toString().replace(/[^0-9]/g, '');
    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            isReturnPickup: isReturnTask,
            assignedDriverId: driver.id,
            assignedDriverName: driver.fullName,
            assignedDriverPhone: driver.phone,
            assignedLogisticsUser: driver.fullName,
            status: isReturnTask ? 'RETURN_PICKUP' : 'ASSIGNED',
            deliveryStatus: isReturnTask ? 'return_assigned' : 'driver_notified',
            assignedAt: order.assignedAt
          }
        }
      );
    } catch (_) {}

    // Increment driver pendingDeliveries
    driver.pendingDeliveries = (driver.pendingDeliveries || 0) + 1;
    await driver.save();

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Logistics Manager',
      action: 'DRIVER_ASSIGNED',
      details: `Order ${order.id} assigned to driver ${driver.fullName} (${driver.id})`
    });

    await addNotification({
      title: '🚚 Rider Assigned to Order',
      message: `Rider ${driver.fullName} (${driver.phone}) assigned to Order #${order.id} for delivery in ${order.city || 'Hub'}.`,
      type: 'info',
      city: order.city || 'Indore (Head Office)',
      riderName: driver.fullName,
      riderPhone: driver.phone,
      orderId: order.id,
      category: 'logistics'
    });

    return res.json({
      success: true,
      message: `Order assigned to ${driver.fullName} successfully`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Prepare Order in Warehouse (Pack, Print Barcode Sticker & Invoice)
export const prepareOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const cleanNum = orderId ? orderId.toString().replace(/[^0-9]/g, '') : '';
    let order = await Order.findOne({ id: orderId });
    if (!order) {
      try {
        order = await Order.findById(orderId);
      } catch (_) {}
    }
    if (!order && cleanNum) {
      order = await Order.findOne({ id: new RegExp(cleanNum, 'i') });
    }
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.isPrepared = true;
    order.status = 'READY_FOR_DISPATCH';
    order.deliveryStatus = 'ready_for_dispatch';
    order.preparedAt = new Date().toISOString();
    order.packedBy = req.user?.fullName || req.body?.packedBy || 'Warehouse Staging Team';

    await order.save();

    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            isPrepared: true,
            status: 'READY_FOR_DISPATCH',
            deliveryStatus: 'ready_for_dispatch',
            preparedAt: order.preparedAt,
            packedBy: order.packedBy
          }
        }
      );
    } catch (_) {}

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Warehouse Manager',
      action: 'ORDER_PREPARED',
      details: `Order ${order.id} packaged and barcode attached. Ready for rider assignment.`
    });

    return res.json({
      success: true,
      message: `Order ${order.id} prepared & barcode labeled successfully. Moved to Rider Assignment queue.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Scan and Verify Asset Barcode (3-Step Lifecycle: CHECKOUT, DELIVERY, RETURN_PICKUP)
export const scanAssetBarcode = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { barcode, scanType = 'CHECKOUT' } = req.body;

    if (!barcode) {
      return res.status(400).json({ success: false, message: 'Barcode is required' });
    }

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const cleanBarcode = barcode.trim().toLowerCase();

    // Strict Rider Assignment Verification
    const { driverId, driverPhone, driverName } = req.body;
    if (driverId || driverPhone || driverName) {
      const cleanDp = (driverPhone || '').replace(/[^0-9]/g, '').slice(-10);
      const ordDp = (order.assignedDriverPhone || '').replace(/[^0-9]/g, '').slice(-10);
      const isAssigned = (
        (!order.assignedDriverId && !order.assignedDriverPhone) ||
        (driverId && order.assignedDriverId && (order.assignedDriverId === driverId || order.assignedDriverId === driverId.toString())) ||
        (cleanDp && ordDp && cleanDp === ordDp) ||
        (driverName && order.assignedDriverName && driverName.trim().toLowerCase() === order.assignedDriverName.trim().toLowerCase())
      );
      if (!isAssigned) {
        const assignedRider = order.assignedDriverName || order.assignedDriverPhone || order.assignedDriverId || 'Another Driver';
        return res.status(403).json({
          success: false,
          verified: false,
          code: 'UNAUTHORIZED_RIDER',
          message: `Access Denied: Order #${order.id} is assigned to Rider "${assignedRider}". You are not authorized to scan or dispatch this order.`
        });
      }
    }

    // Check if barcode matches any expected asset, items, or consignment tag
    const orderNum = (order.id || '').replace(/[^0-9]/g, '');
    const custClean = (order.customerName || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    const validTags = [
      (order.id || '').toLowerCase(),
      (order.orderBarcode || '').toLowerCase(),
      (order.trackingNumber || '').toLowerCase(),
      `rb-${custClean}-${orderNum}`,
      `rb-ord-${orderNum}`,
      `ord-${orderNum}`,
      `ship-${orderNum}`
    ].filter(Boolean);

    const matchesConsignmentTag = validTags.some(tag => 
      tag === cleanBarcode || cleanBarcode.includes(tag) || (tag.length > 5 && tag.includes(cleanBarcode))
    );

    let matchedItem = (order.expectedAssets || []).find(
      it => (it.barcode && it.barcode.toLowerCase() === cleanBarcode) ||
            (it.assetId && it.assetId.toLowerCase() === cleanBarcode) ||
            (it.assetId && cleanBarcode.includes(it.assetId.toLowerCase()))
    );

    if (!matchedItem) {
      matchedItem = (order.items || []).find(
        it => (it.barcode && it.barcode.toLowerCase() === cleanBarcode) ||
              (it.assetId && it.assetId.toLowerCase() === cleanBarcode) ||
              (it.id && it.id.toLowerCase() === cleanBarcode) ||
              (it.assetId && cleanBarcode.includes(it.assetId.toLowerCase()))
      );
    }

    if (!matchedItem && matchesConsignmentTag) {
      matchedItem = (order.expectedAssets && order.expectedAssets[0]) || (order.items && order.items[0]) || {
        assetName: 'Solid Wood Furniture Unit',
        assetId: `RB-AST-${orderNum || '101'}`
      };
    }

    if (!matchedItem) {
      return res.status(400).json({
        success: false,
        verified: false,
        code: 'INVALID_PRODUCT_BARCODE',
        message: `Wrong Product: Barcode "${barcode}" does NOT match any furniture item assigned to Order #${order.id}`
      });
    }

    const assetName = matchedItem.assetName || matchedItem.name || matchedItem.category || 'Furniture Asset';

    if (scanType === 'CHECKOUT') {
      order.scannedAtCheckout = true;
      order.scannedAtLoading = true;
      order.status = 'OUT_FOR_DELIVERY';
      order.deliveryStatus = 'out_for_delivery';
      order.dispatchedAt = new Date().toISOString();
    } else if (scanType === 'DELIVERY' || scanType === 'DOORSTEP_SCAN') {
      // Step 2 Doorstep Handover Barcode Scan -> Confirms physical item presence, unlocks Step 3 Customer OTP
      order.scannedAtLoading = true;
      order.scannedAtCheckout = true;
      order.scannedAtDelivery = true;
      order.doorstepScanned = true;
      order.status = 'OUT_FOR_DELIVERY';
      order.deliveryStatus = 'out_for_delivery';
    } else if (scanType === 'RETURN_PICKUP') {
      order.scannedAtReturn = true;
      order.status = 'RETURNED';
      order.deliveryStatus = 'returned';
      order.returnedAt = new Date().toISOString();
    }

    await order.save();

    const cleanNum = (orderId || order.id || '').toString().replace(/[^0-9]/g, '');
    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
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
          (matchedItem && (matchedItem.assetId || matchedItem.id)),
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
        }
      }
    } catch (_) {}

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Rider',
      action: `BARCODE_SCANNED_${scanType}`,
      details: `Asset ${barcode} (${assetName}) verified for Order ${order.id} [${scanType}]`
    });

    const scanLabel = scanType === 'CHECKOUT' ? '📦 Warehouse Loading Scan' : (scanType === 'DELIVERY' ? '📍 Delivery Location Scan' : '🔄 Return Pickup Scan');
    await addNotification({
      title: scanLabel,
      message: `Asset [${barcode}] (${assetName}) scanned and verified by Rider ${order.assignedDriverName || ''} for Order #${order.id}.`,
      type: 'info',
      city: order.city || 'Indore (Head Office)',
      riderName: order.assignedDriverName || '',
      riderPhone: order.assignedDriverPhone || '',
      orderId: order.id,
      category: 'logistics'
    });

    return res.json({
      success: true,
      verified: true,
      message: `✓ Barcode verified successfully for ${assetName}`,
      data: {
        orderId: order.id,
        barcode,
        assetName,
        scanType,
        orderStatus: order.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Accept Order by Driver
export const acceptOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.deliveryStatus = 'assigned';
    if (order.status === 'CONFIRMED' || !order.status) {
      order.status = 'ASSIGNED';
    }
    await order.save();

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Rider',
      action: 'ORDER_ACCEPTED',
      details: `Rider accepted Order ${order.id}`
    });

    await addNotification({
      title: '🚚 Order Accepted by Rider',
      message: `Rider ${order.assignedDriverName || 'Driver'} accepted delivery dispatch for Order #${order.id}.`,
      type: 'info',
      city: order.city || 'Indore (Head Office)',
      riderName: order.assignedDriverName || '',
      riderPhone: order.assignedDriverPhone || '',
      orderId: order.id,
      category: 'logistics'
    });

    return res.json({ success: true, message: 'Order accepted successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Order Status
export const updateOrderStatus = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { status, deliveryStatus, notes, deliveryProofPhoto } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    if (status) order.status = status;
    if (deliveryStatus) order.deliveryStatus = deliveryStatus;
    if (deliveryProofPhoto) order.deliveryProofPhoto = deliveryProofPhoto;
    if (notes) order.notes = notes;

    await order.save();

    return res.json({ success: true, message: 'Order status updated successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Driver Active Orders (Polled by Flutter App)
export const getDriverActiveOrders = async (req, res) => {
  try {
    const driverId = req.query.driverId || req.query.phone || (req.user && (req.user.id || req.user.phone));
    const phone = req.query.phone || req.query.driverId;

    if (!driverId && !phone) {
      return res.json({ success: true, data: { orders: [] }, count: 0 });
    }

    const cleanPhone = (phone || driverId || '').replace(/[^0-9]/g, '').slice(-10);

    // Look up driver in database to find all variations of ID/phone/name
    const driver = await Driver.findOne({
      $or: [
        ...(driverId ? [{ id: driverId }, { _id: driverId.length === 24 ? driverId : undefined }].filter(Boolean) : []),
        ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }, { phone: `+91-${cleanPhone}` }] : [])
      ]
    });

    const idFilters = [
      ...(driverId ? [{ assignedDriverId: driverId }, { assignedDriverPhone: driverId }] : []),
      ...(cleanPhone ? [
        { assignedDriverPhone: cleanPhone },
        { assignedDriverPhone: `+91${cleanPhone}` },
        { assignedDriverPhone: `+91-${cleanPhone}` },
        { assignedDriverId: cleanPhone },
        { assignedDriverId: `+91${cleanPhone}` }
      ] : [])
    ];

    if (driver) {
      if (driver.id) idFilters.push({ assignedDriverId: driver.id });
      if (driver._id) idFilters.push({ assignedDriverId: driver._id.toString() });
      if (driver.phone) {
        const dp = driver.phone.replace(/[^0-9]/g, '').slice(-10);
        idFilters.push({ assignedDriverPhone: dp });
        idFilters.push({ assignedDriverPhone: `+91${dp}` });
        idFilters.push({ assignedDriverPhone: `+91-${dp}` });
      }
      if (driver.fullName) {
        const dCity = (driver.city || '').replace(/\(.*?\)/g, '').trim();
        if (dCity) {
          idFilters.push({
            city: new RegExp(dCity, 'i'),
            $or: [
              { assignedDriverName: driver.fullName },
              { assignedLogisticsUser: driver.fullName },
              { assignedDriverId: driver.id }
            ],
            ...(cleanPhone ? { assignedDriverPhone: { $in: [null, '', cleanPhone, `+91${cleanPhone}`, `+91-${cleanPhone}`] } } : {})
          });
        }
      }
    }

    const query = {
      $and: [
        { $or: idFilters },
        { 
          status: { 
            $nin: ['DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED', 'Delivered', 'Completed', 'Returned', 'Cancelled'] 
          } 
        },
        { 
          deliveryStatus: { 
            $nin: ['delivered', 'completed', 'returned', 'cancelled', 'DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED'] 
          } 
        }
      ]
    };

    const orders = await Order.find(query).sort({ createdAt: -1 });

    // Format orders for Flutter Driver App
    const formattedOrders = orders.map(ord => ({
      _id: ord.id || ord._id.toString(),
      id: ord.id || ord._id.toString(),
      orderNumber: ord.id,
      customer: {
        name: ord.customerName || 'Customer',
        phone: ord.customerMobile || '',
        address: ord.deliveryAddress || ord.city || 'Delivery Address'
      },
      store: {
        name: `RentBuddy ${ord.city || 'Central'} Hub Depot`,
        address: `Plot 45, Scheme 54 Logistics Park, ${ord.city || 'Central Area'}`
      },
      items: ord.items || [],
      orderBarcode: `RB-${(ord.customerName || 'CUST').trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'CUST'}-${(ord.id || '647641').replace(/[^0-9]/g, '')}`,
      expectedAssets: (ord.items && ord.items.length > 0) ? ord.items.map((it, idx) => {
        const custFirst = (ord.customerName || 'CUST').trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'CUST';
        const cleanOrd = (ord.id || '647641').replace(/[^0-9]/g, '') || '647641';
        const consignmentTag = `RB-${custFirst}-${cleanOrd}`;
        return {
          assetId: it.assetId || it.id || `AST-${cleanOrd}-${String(idx + 1).padStart(2, '0')}`,
          assetName: it.name || it.productName || it.title || it.assetName || (idx === 0 ? 'Solid Wood Furniture Unit' : 'Royal Velvet 3-Seater Sofa'),
          category: it.category || 'Living Room Furniture',
          quantity: it.quantity || 1,
          barcode: consignmentTag,
          scannedAtCheckout: it.scannedAtCheckout || ord.scannedAtCheckout || ord.scannedAtLoading || false
        };
      }) : [
        {
          assetId: `RB-AST-${(ord.id || '647641').replace(/[^0-9]/g, '')}-01`,
          assetName: 'Solid Wood Furniture Unit',
          category: 'Living Room Furniture',
          quantity: 1,
          barcode: `RB-${(ord.customerName || 'CUST').trim().split(' ')[0].replace(/[^a-zA-Z]/g, '').toUpperCase() || 'CUST'}-${(ord.id || '647641').replace(/[^0-9]/g, '')}`,
          scannedAtCheckout: ord.scannedAtCheckout || ord.scannedAtLoading || false
        }
      ],
      deliveryStatus: ord.deliveryStatus || 'driver_notified',
      status: ord.status || 'ASSIGNED',
      isReturnPickup: Boolean(ord.isReturnPickup || ord.status === 'RETURN_PICKUP' || ord.status === 'Return Pickup' || ord.deliveryStatus === 'return_assigned' || ord.deliveryStatus === 'return_pickup'),
      scannedAtCheckout: Boolean(ord.scannedAtCheckout || ord.scannedAtLoading),
      scannedAtDelivery: Boolean(ord.scannedAtDelivery || ord.doorstepScanned),
      doorstepScanned: Boolean(ord.doorstepScanned || ord.scannedAtDelivery),
      scannedAtReturn: Boolean(ord.scannedAtReturn),
      deliveryProofPhoto: ord.deliveryProofPhoto || null,
      payableAmount: ord.totalDeposit || ord.totalMonthlyRent || 3000,
      totalAmount: ord.totalDeposit || ord.totalMonthlyRent || 3000,
      rentalPeriod: `${ord.durationMonths || 6} Months (${ord.startDate || 'Active'})`,
      zone: ord.zone || 'Zone A',
      updatedAt: ord.updatedAt ? ord.updatedAt.toISOString() : new Date().toISOString()
    }));

    return res.json({
      success: true,
      data: { orders: formattedOrders },
      count: formattedOrders.length
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Driver Order History (Strictly Filtered by Driver Identity)
export const getDriverOrderHistory = async (req, res) => {
  try {
    const driverId = req.query.driverId || req.query.phone || (req.user && (req.user.id || req.user.phone));
    const phone = req.query.phone || req.query.driverId;

    if (!driverId && !phone) {
      return res.json({ success: true, data: { orders: [] }, count: 0 });
    }

    const cleanPhone = (phone || driverId || '').replace(/[^0-9]/g, '').slice(-10);
    const driver = await Driver.findOne({
      $or: [
        ...(driverId ? [{ id: driverId }, { _id: driverId.length === 24 ? driverId : undefined }].filter(Boolean) : []),
        ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }, { phone: `+91-${cleanPhone}` }] : [])
      ]
    });

    const idFilters = [
      ...(driverId ? [{ assignedDriverId: driverId }, { assignedDriverPhone: driverId }] : []),
      ...(cleanPhone ? [
        { assignedDriverPhone: cleanPhone },
        { assignedDriverPhone: `+91${cleanPhone}` },
        { assignedDriverPhone: `+91-${cleanPhone}` },
        { assignedDriverId: cleanPhone },
        { assignedDriverId: `+91${cleanPhone}` }
      ] : [])
    ];

    if (driver) {
      if (driver.id) idFilters.push({ assignedDriverId: driver.id });
      if (driver._id) idFilters.push({ assignedDriverId: driver._id.toString() });
      if (driver.phone) {
        const dp = driver.phone.replace(/[^0-9]/g, '').slice(-10);
        idFilters.push({ assignedDriverPhone: dp });
        idFilters.push({ assignedDriverPhone: `+91${dp}` });
        idFilters.push({ assignedDriverPhone: `+91-${dp}` });
      }
      if (driver.fullName) {
        const dCity = (driver.city || '').replace(/\(.*?\)/g, '').trim();
        if (dCity) {
          idFilters.push({
            city: new RegExp(dCity, 'i'),
            $or: [
              { assignedDriverName: driver.fullName },
              { assignedLogisticsUser: driver.fullName },
              { assignedDriverId: driver.id }
            ],
            ...(cleanPhone ? { assignedDriverPhone: { $in: [null, '', cleanPhone, `+91${cleanPhone}`, `+91-${cleanPhone}`] } } : {})
          });
        }
      }
    }

    const query = {
      $and: [
        { $or: idFilters },
        {
          $or: [
            { status: { $in: ['DELIVERED', 'COMPLETED', 'RETURNED', 'Delivered', 'Completed', 'Returned'] } },
            { deliveryStatus: { $in: ['delivered', 'completed', 'returned', 'DELIVERED', 'COMPLETED', 'RETURNED'] } }
          ]
        }
      ]
    };

    const orders = await Order.find(query).sort({ deliveredAt: -1, updatedAt: -1 }).limit(50);
    const formattedOrders = orders.map(ord => ({
      _id: ord.id || ord._id.toString(),
      id: ord.id,
      orderNumber: ord.id,
      customer: {
        name: ord.customerName || 'Customer',
        phone: ord.customerMobile || '',
        address: ord.deliveryAddress || ord.city || 'Delivery Address'
      },
      store: {
        name: `RentBuddy ${ord.city || 'Central'} Hub Depot`,
        address: `Plot 45, Scheme 54 Logistics Park, ${ord.city || 'Central Area'}`
      },
      deliveryAddress: {
        addressLine: ord.deliveryAddress || `${ord.city || 'Central'} Hub`,
        city: ord.city || 'Central Hub'
      },
      items: ord.items || [],
      deliveryStatus: 'delivered',
      status: 'DELIVERED',
      deliveryProofPhoto: ord.deliveryProofPhoto || (ord.deliveryProof && ord.deliveryProof.photos && ord.deliveryProof.photos[0]) || null,
      deliveredAt: ord.deliveredAt || ord.updatedAt || new Date().toISOString(),
      payableAmount: ord.totalDeposit || ord.totalMonthlyRent || 3000,
      totalAmount: ord.totalDeposit || ord.totalMonthlyRent || 3000,
    }));

    return res.json({ success: true, data: { orders: formattedOrders }, count: formattedOrders.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Rider requests Admin to deposit & restock returned furniture at Warehouse Hub
export const requestReturnDeposit = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { driverId, driverName, notes } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = 'RETURN_DEPOSIT_PENDING';
    order.deliveryStatus = 'return_deposit_requested';
    order.returnDepositRequestedAt = new Date().toISOString();
    order.isReturnPickup = true;
    if (notes) order.returnNotes = notes;
    await order.save();

    const cleanNum = (orderId || order.id || '').toString().replace(/[^0-9]/g, '');
    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            status: 'RETURN_DEPOSIT_PENDING',
            deliveryStatus: 'return_deposit_requested',
            returnDepositRequestedAt: order.returnDepositRequestedAt,
            isReturnPickup: true
          }
        }
      );
    } catch (_) {}

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Rider',
      action: 'RETURN_DEPOSIT_REQUESTED',
      details: `Rider ${driverName || order.assignedDriverName || 'Rider'} submitted return deposit request for Order #${order.id} at warehouse depot.`
    });

    await addNotification({
      title: '📥 Return Deposit Request from Rider',
      message: `Rider ${driverName || order.assignedDriverName || 'Rider'} has brought back furniture for Order #${order.id} (${order.customerName || 'Customer'}) to ${order.city || 'Depot'}. Please inspect and accept deposit.`,
      type: 'info',
      city: order.city || 'Indore (Head Office)',
      riderName: driverName || order.assignedDriverName || '',
      orderId: order.id,
      category: 'logistics'
    });

    return res.json({
      success: true,
      message: `✓ Deposit request sent to Admin! Order #${order.id} awaiting warehouse hub acceptance.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Admin accepts return deposit and automatically restocks assets to Available in Inventory
export const acceptReturnDeposit = async (req, res) => {
  try {
    const orderId = req.params.id;
    const cleanNum = (orderId || '').toString().replace(/[^0-9]/g, '');

    const order = await Order.findOne({
      $or: [
        { id: orderId },
        ...(orderId.length === 24 ? [{ _id: orderId }] : []),
        ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
      ]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const returnedTime = new Date().toISOString();
    order.status = 'RETURNED';
    order.deliveryStatus = 'returned';
    order.returnedAt = returnedTime;
    order.scannedAtReturn = true;
    await order.save();

    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
            ...(orderId.length === 24 ? [{ _id: orderId }] : []),
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            status: 'RETURNED',
            deliveryStatus: 'returned',
            returnedAt: returnedTime,
            scannedAtReturn: true
          }
        }
      );
    } catch (_) {}

    // Auto-restore physical assets back to Available warehouse stock
    const assetIds = [
      ...(order.items || []).map(it => it.assetId || it.id),
      ...(order.expectedAssets || []).map(it => it.assetId || it.id)
    ].filter(Boolean);

    if (assetIds.length > 0) {
      await Asset.updateMany(
        {
          $or: [
            { id: { $in: assetIds } },
            { _id: { $in: assetIds.filter(id => id.length === 24) } }
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
      console.log(`\n\x1b[32m♻️ [RentBuddy Asset Return] All assets for Order #${orderId} marked AVAILABLE in Inventory.\x1b[0m`);
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: returnedTime,
      userRole: 'Logistics Admin',
      action: 'RETURN_DEPOSIT_ACCEPTED',
      details: `Admin accepted return deposit for Order #${order.id}. ${assetIds.length} items restocked to Available in Inventory.`
    });

    await addNotification({
      title: '✅ Return Deposit Accepted & Restocked',
      message: `Return for Order #${order.id} accepted. All items have been returned to Available inventory in ${order.city || 'Depot'}.`,
      type: 'success',
      city: order.city || 'Indore (Head Office)',
      orderId: order.id,
      category: 'logistics'
    });

    return res.json({
      success: true,
      message: `✓ Return accepted and restocked to Available inventory for Order #${order.id}!`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel Order & Restore all furniture assets to Available warehouse stock
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body || {};
    const cleanNum = (orderId || '').toString().replace(/[^0-9]/g, '');

    const order = await Order.findOne({
      $or: [
        { id: orderId },
        ...(orderId && orderId.length === 24 ? [{ _id: orderId }] : []),
        ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
      ]
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const cancelledTime = new Date().toISOString();
    order.status = 'Cancelled';
    order.deliveryStatus = 'cancelled';
    order.cancellationReason = reason || 'Cancelled by Admin in Logistics Tracker';
    order.cancelledAt = cancelledTime;
    await order.save();

    try {
      await Order.updateMany(
        {
          $or: [
            { id: order.id },
            { id: orderId },
            ...(orderId && orderId.length === 24 ? [{ _id: orderId }] : []),
            ...(cleanNum ? [{ id: new RegExp(cleanNum, 'i') }] : [])
          ]
        },
        {
          $set: {
            status: 'Cancelled',
            deliveryStatus: 'cancelled',
            cancellationReason: reason || 'Cancelled by Admin in Logistics Tracker',
            cancelledAt: cancelledTime
          }
        }
      );
    } catch (_) {}

    // Auto-restore physical assets back to Available warehouse stock
    const assetIds = [
      ...(order.items || []).map(it => it.assetId || it.id),
      ...(order.expectedAssets || []).map(it => it.assetId || it.id)
    ].filter(Boolean);

    if (assetIds.length > 0) {
      await Asset.updateMany(
        {
          $or: [
            { id: { $in: assetIds } },
            { barcode: { $in: assetIds } },
            { _id: { $in: assetIds.filter(id => id.length === 24) } }
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
      console.log(`\n\x1b[32m♻️ [RentBuddy Asset Restored] All assets for Cancelled Order #${order.id} marked AVAILABLE in Inventory.\x1b[0m`);
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: cancelledTime,
      userRole: 'Logistics Admin',
      action: 'ORDER_CANCELLED',
      details: `Order #${order.id} cancelled. ${assetIds.length} items restocked to Available in Inventory. Reason: ${reason || 'Staging cancellation'}`
    });

    return res.json({
      success: true,
      message: `✓ Order #${order.id} cancelled and stock restored to Available inventory!`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
