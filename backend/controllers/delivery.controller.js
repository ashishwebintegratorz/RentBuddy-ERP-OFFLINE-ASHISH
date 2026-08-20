import { Order, Asset, Driver, Log } from '../models/index.js';

// Record Delivery Proof & Property / Security Details
export const uploadDeliveryProof = async (req, res) => {
  try {
    const { orderId, photoUrls, receiverType, receiverName, receiverPhone, propertyDetails, latitude, longitude } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.deliveryProof = {
      photos: photoUrls || [],
      receiverType: receiverType || 'Customer',
      receiverName: receiverName || order.customerName,
      receiverPhone: receiverPhone || order.customerMobile,
      propertyDetails: propertyDetails || {},
      latitude,
      longitude,
      capturedAt: new Date().toISOString()
    };

    await order.save();

    return res.json({
      success: true,
      message: 'Delivery proof & property details recorded successfully',
      data: order.deliveryProof
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Complete Delivery (Verify OTP / COD & Mark Delivered)
export const completeDelivery = async (req, res) => {
  try {
    const { orderId, otp, paymentConfirmed, driverId } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // Transition Order to DELIVERED
    order.status = 'DELIVERED';
    order.deliveryStatus = 'delivered';
    order.deliveredAt = new Date().toISOString();
    order.scannedAtDelivery = true;

    await order.save();

    // Update physical assets to ON_RENT / DELIVERED
    if (order.expectedAssets) {
      for (const item of order.expectedAssets) {
        if (item.assetId) {
          await Asset.findOneAndUpdate(
            { id: item.assetId },
            { status: 'DELIVERED', currentStatus: 'ON_RENT' }
          );
        }
      }
    }

    // Update Driver delivered stats
    if (order.assignedDriverId || driverId) {
      const dId = order.assignedDriverId || driverId;
      await Driver.findOneAndUpdate(
        { $or: [{ id: dId }, { phone: dId }] },
        {
          $inc: { totalDelivered: 1, pendingDeliveries: -1 }
        }
      );
    }

    await Log.create({
      id: `LOG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userRole: 'Driver / Logistics',
      action: 'DELIVERY_COMPLETED',
      details: `Order ${order.id} delivered successfully at customer doorstep.`
    });

    return res.json({
      success: true,
      message: `Delivery Complete! Order #${order.id} has been delivered successfully.`,
      data: order
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Customer Experience Feedback
export const submitFeedback = async (req, res) => {
  try {
    const { orderId, rating, comments, categories, driverId } = req.body;

    const order = await Order.findOne({ id: orderId }) || await Order.findById(orderId);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    order.feedback = {
      rating: rating || 5,
      comments: comments || '',
      categories: categories || ['Furniture Condition', 'Driver Behaviour'],
      submittedAt: new Date().toISOString()
    };

    await order.save();

    // Update driver rating average
    const dId = driverId || order.assignedDriverId;
    if (dId && rating) {
      const driver = await Driver.findOne({ $or: [{ id: dId }, { phone: dId }] });
      if (driver) {
        const curRating = driver.rating || 5.0;
        const newRating = Number(((curRating + rating) / 2).toFixed(1));
        driver.rating = newRating;
        await driver.save();
      }
    }

    return res.json({
      success: true,
      message: 'Thank you! Customer feedback submitted successfully.',
      data: order.feedback
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
