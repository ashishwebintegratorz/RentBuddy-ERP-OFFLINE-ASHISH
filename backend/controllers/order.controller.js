import { Order, Customer, Driver, Asset, Zone, Log } from '../models/index.js';

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

    return res.status(201).json({ success: true, message: 'Order created and inventory reserved successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Assign Driver to Order
export const assignDriverToOrder = async (req, res) => {
  try {
    const { driverId } = req.body;
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

    order.assignedDriverId = driver.id;
    order.assignedDriverName = driver.fullName;
    order.assignedDriverPhone = driver.phone;
    order.assignedLogisticsUser = driver.fullName;
    order.status = 'ASSIGNED';
    order.deliveryStatus = 'driver_notified';
    order.assignedAt = new Date().toISOString();

    await order.save();

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
    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.isPrepared = true;
    order.status = 'READY_FOR_DISPATCH';
    order.deliveryStatus = 'ready_for_dispatch';
    order.preparedAt = new Date().toISOString();
    order.packedBy = req.user?.fullName || req.body?.packedBy || 'Warehouse Staging Team';

    await order.save();

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

    // Check if barcode matches any expected asset in order or items list
    let matchedItem = (order.expectedAssets || []).find(
      it => (it.barcode && it.barcode.toLowerCase() === cleanBarcode) ||
            (it.assetId && it.assetId.toLowerCase() === cleanBarcode)
    );

    if (!matchedItem) {
      matchedItem = (order.items || []).find(
        it => (it.barcode && it.barcode.toLowerCase() === cleanBarcode) ||
              (it.assetId && it.assetId.toLowerCase() === cleanBarcode) ||
              (it.id && it.id.toLowerCase() === cleanBarcode)
      );
    }

    if (!matchedItem) {
      return res.status(400).json({
        success: false,
        verified: false,
        message: `Barcode ${barcode} does not match any furniture item assigned to Order ${order.id}`
      });
    }

    const assetName = matchedItem.assetName || matchedItem.name || matchedItem.category || 'Furniture Asset';

    if (scanType === 'CHECKOUT') {
      order.scannedAtCheckout = true;
      order.scannedAtLoading = true;
      order.status = 'OUT_FOR_DELIVERY';
      order.deliveryStatus = 'out_for_delivery';
      order.dispatchedAt = new Date().toISOString();
    } else if (scanType === 'DELIVERY') {
      order.scannedAtDelivery = true;
      order.status = 'DELIVERED';
      order.deliveryStatus = 'delivered';
      order.deliveredAt = new Date().toISOString();
    } else if (scanType === 'RETURN_PICKUP') {
      order.scannedAtReturn = true;
      order.status = 'RETURNED';
      order.deliveryStatus = 'returned';
      order.returnedAt = new Date().toISOString();
    }

    await order.save();

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Rider',
      action: `BARCODE_SCANNED_${scanType}`,
      details: `Asset ${barcode} (${assetName}) verified for Order ${order.id} [${scanType}]`
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

    return res.json({ success: true, message: 'Order accepted successfully', data: order });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel Order & Restore Inventory Assets to Available Stock
export const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { reason } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.status = 'CANCELLED';
    order.deliveryStatus = 'cancelled';
    order.cancellationReason = reason || 'Customer requested cancellation at staging';
    order.cancelledAt = new Date();
    await order.save();

    // Restore assets in database
    if (order.items && order.items.length > 0) {
      const assetIds = order.items.map(it => it.assetId || it.id).filter(Boolean);
      if (assetIds.length > 0) {
        await Asset.updateMany(
          { $or: [{ id: { $in: assetIds } }, { _id: { $in: assetIds } }] },
          { $set: { status: 'Available', currentCustomer: null, currentOrderId: null } }
        );
      }
    }

    console.log(`\n🛑 [RentBuddy Order Engine] Order #${orderId} CANCELLED. All items restored to Available stock.`);

    return res.json({
      success: true,
      message: `Order #${orderId} cancelled and stock restored to Available inventory`,
      data: order
    });
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
      }
      if (driver.fullName || driver.name) {
        const dName = driver.fullName || driver.name;
        idFilters.push({ assignedDriverName: dName });
        idFilters.push({ assignedLogisticsUser: dName });
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
      scannedAtCheckout: ord.scannedAtCheckout || ord.scannedAtLoading || false,
      scannedAtDelivery: ord.scannedAtDelivery || false,
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
      }
      if (driver.fullName || driver.name) {
        const dName = driver.fullName || driver.name;
        idFilters.push({ assignedDriverName: dName });
        idFilters.push({ assignedLogisticsUser: dName });
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
