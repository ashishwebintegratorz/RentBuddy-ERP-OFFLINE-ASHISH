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
        name: `${ord.city || 'Indore'} Central Warehouse Hub`,
        address: `Hub Warehouse, Scheme 54, ${ord.city || 'Indore'}`
      },
      items: ord.items || [],
      expectedAssets: ord.expectedAssets || (ord.items || []).map(it => ({
        assetId: it.assetId || it.id || 'AST-001',
        assetName: it.name || it.title || 'Furniture Asset',
        barcode: it.barcode || `BAR-${it.id || '001'}`,
        scannedAtCheckout: it.scannedAtCheckout || false
      })),
      deliveryStatus: ord.deliveryStatus || 'driver_notified',
      status: ord.status,
      payableAmount: ord.totalDeposit || ord.totalMonthlyRent || 0,
      totalAmount: ord.totalDeposit || ord.totalMonthlyRent || 0,
      driverEarnings: 150.0,
      rentalPeriod: `${ord.durationMonths || 6} Months (${ord.startDate || ''})`,
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
