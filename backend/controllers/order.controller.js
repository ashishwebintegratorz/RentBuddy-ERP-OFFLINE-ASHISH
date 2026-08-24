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
    let query = {};

    if (driverId) {
      const cleanPhone = driverId.replace(/[^0-9]/g, '');
      query = {
        $and: [
          {
            $or: [
              { assignedDriverId: driverId },
              { assignedDriverPhone: cleanPhone },
              { assignedDriverPhone: driverId }
            ]
          },
          { status: { $nin: ['DELIVERED', 'COMPLETED', 'RETURNED', 'CANCELLED'] } },
          { deliveryStatus: { $nin: ['delivered', 'completed', 'returned', 'cancelled'] } }
        ]
      };
    } else {
      query = {
        status: { $in: ['ASSIGNED', 'OUT_FOR_DELIVERY', 'IN_TRANSIT', 'CONFIRMED'] },
        deliveryStatus: { $nin: ['delivered', 'completed', 'returned', 'cancelled'] }
      };
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
      deliveryStatus: ord.deliveryStatus || (ord.scannedAtLoading ? 'out_for_delivery' : (ord.status === 'OUT_FOR_DELIVERY' ? 'out_for_delivery' : 'assigned')),
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
    const driverId = req.query.driverId || req.query.phone || (req.user && (req.user.id || req.user.phone));
    let query = {
      $or: [
        { status: { $in: ['DELIVERED', 'COMPLETED', 'RETURNED'] } },
        { deliveryStatus: { $in: ['delivered', 'completed', 'returned'] } }
      ]
    };

    if (driverId) {
      const cleanPhone = driverId.replace(/[^0-9]/g, '');
      query = {
        $and: [
          {
            $or: [
              { assignedDriverId: driverId },
              { assignedDriverPhone: cleanPhone },
              { assignedDriverPhone: driverId },
              { assignedLogisticsUser: { $exists: true } }
            ]
          },
          {
            $or: [
              { status: { $in: ['DELIVERED', 'COMPLETED', 'RETURNED'] } },
              { deliveryStatus: { $in: ['delivered', 'completed', 'returned'] } }
            ]
          }
        ]
      };
    }

    const orders = await Order.find(query).sort({ deliveredAt: -1, updatedAt: -1 }).limit(50);
    const formattedOrders = orders.map(ord => ({
      _id: ord.id || ord._id.toString(),
      id: ord.id,
      orderNumber: ord.id,
      status: ord.status,
      deliveryStatus: 'delivered',
      customer: {
        name: ord.customerName || 'Customer',
        phone: ord.customerMobile || '',
        address: (ord.deliveryProof && ord.deliveryProof.propertyDetails && ord.deliveryProof.propertyDetails.fullAddress) || 'Customer Destination'
      },
      customerName: ord.customerName || 'Customer',
      customerMobile: ord.customerMobile || '',
      payableAmount: ord.netDeposit || ord.totalDeposit || ord.totalMonthlyRent || 3000,
      totalAmount: ord.netDeposit || ord.totalDeposit || ord.totalMonthlyRent || 3000,
      store: {
        name: 'RentBuddy Indore Central Hub Depot',
        address: 'Plot 45, Scheme 54 Logistics Park, Indore'
      },
      deliveryAddress: {
        addressLine: 'Indore Hub',
        city: 'Indore'
      },
      items: ord.items || [],
      deliveredAt: ord.deliveredAt || ord.updatedAt
    }));

    return res.json({ success: true, data: { orders: formattedOrders } });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
