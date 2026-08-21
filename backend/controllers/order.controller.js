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

// Create Order with KYC Gate
export const createOrder = async (req, res) => {
  try {
    const { customerId, items, deliveryAddress, city, zone, durationMonths, startDate, endDate, totalDeposit, totalMonthlyRent } = req.body;

    // 1. Check Customer KYC Status (KYC Gate)
    const customer = await Customer.findOne({ id: customerId }) || await Customer.findById(customerId);
    if (customer && customer.verificationStatus !== 'Verified') {
      return res.status(400).json({
        success: false,
        message: `KYC Pending: Customer ${customer.fullName || customerId} is not verified yet. Order cannot enter logistics queue until KYC is completed.`,
        kycStatus: customer.verificationStatus
      });
    }

    const orderId = `ORD-${Date.now().toString().slice(-6)}`;
    const newOrder = new Order({
      id: orderId,
      customerId,
      customerName: customer ? customer.fullName : (req.body.customerName || 'Customer'),
      customerMobile: customer ? customer.mobileNumber : (req.body.customerMobile || ''),
      deliveryAddress: deliveryAddress || (customer ? customer.deliveryAddress : ''),
      city: city || (customer ? customer.city : 'Indore'),
      zone: zone || 'Zone A (North)',
      items: items || [],
      durationMonths: durationMonths || 6,
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
      totalDeposit: totalDeposit || 0,
      totalMonthlyRent: totalMonthlyRent || 0,
      status: 'CONFIRMED', // Eligible for logistics
      deliveryStatus: 'READY_FOR_DISPATCH',
      expectedAssets: (items || []).map(it => ({
        assetId: it.assetId || it.id,
        assetName: it.name || it.title || it.assetName,
        barcode: it.barcode || it.assetBarcode || `BAR-${it.assetId || it.id || '001'}`,
        scannedAtCheckout: false,
        scannedAtDelivery: false
      }))
    });

    await newOrder.save();

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Admin',
      action: 'ORDER_CREATED',
      details: `Order ${orderId} created for customer ${newOrder.customerName}`
    });

    return res.status(201).json({ success: true, message: 'Order created successfully', data: newOrder });
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
    let query = {};

    if (driverId) {
      const cleanPhone = driverId.replace(/[^0-9]/g, '');
      query = {
        $or: [
          { assignedDriverId: driverId },
          { assignedDriverPhone: cleanPhone },
          { assignedDriverPhone: driverId },
          { status: { $in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'PICKUP_PENDING'] } }
        ]
      };
    } else {
      query = { status: { $in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'CONFIRMED'] } };
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });

    // Format orders for Flutter Driver App
    const formattedOrders = orders.map(ord => ({
      _id: ord.id || ord._id.toString(),
      orderNumber: ord.id,
      customer: {
        name: ord.customerName || 'Customer',
        phone: ord.customerMobile || '',
        address: ord.deliveryAddress || ord.city || 'Indore Hub'
      },
      store: {
        name: `RentBuddy ${ord.city || 'Indore'} Central Hub Depot`,
        address: `Plot 45, Scheme 54 Logistics Park, ${ord.city || 'Indore'}`
      },
      items: ord.items || [],
      expectedAssets: (ord.items && ord.items.length > 0) ? ord.items.map((it, idx) => ({
        assetId: it.assetId || it.id || `AST-${String(idx + 1).padStart(3, '0')}`,
        assetName: it.name || it.productName || it.title || it.assetName || 'Solid Wood Furniture Unit',
        category: it.category || 'Living Room Furniture',
        quantity: it.quantity || 1,
        barcode: it.barcode || it.assetTag || `RB-${(ord.city || 'IND').slice(0, 3).toUpperCase()}-${it.assetId || String(idx + 1).padStart(3, '0')}`,
        scannedAtCheckout: it.scannedAtCheckout || false
      })) : [{
        assetId: 'RB-FUR-101',
        assetName: 'Royal Velvet 3-Seater Sofa & Center Table',
        category: 'Living Room Furniture',
        quantity: 1,
        barcode: `RB-ASSET-${(ord.id || '857969').replace(/[^0-9]/g, '').slice(-4) || '1001'}`,
        scannedAtCheckout: false
      }],
      deliveryStatus: ord.deliveryStatus || 'driver_notified',
      status: ord.status,
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

// Driver Order History
export const getDriverOrderHistory = async (req, res) => {
  try {
    const driverId = req.query.driverId || req.query.phone;
    const query = { status: { $in: ['DELIVERED', 'COMPLETED', 'RETURNED'] } };
    if (driverId) {
      query.$or = [
        { assignedDriverId: driverId },
        { assignedDriverPhone: driverId }
      ];
    }

    const orders = await Order.find(query).sort({ updatedAt: -1 }).limit(50);
    return res.json({ success: true, data: { orders } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
