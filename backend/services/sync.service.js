import {
  Asset,
  Customer,
  Order,
  Invoice,
  Repair,
  Log,
  Notif,
  Driver,
  Config
} from '../models/index.js';
import { getDbStatus } from '../config/db.js';
import { initialAssets, initialCustomers, initialCities } from '../config/initialData.js';

class SyncService {
  async loadAllState() {
    if (!getDbStatus()) {
      return null;
    }

    let [
      assets,
      customers,
      orders,
      invoices,
      repairs,
      logs,
      notifications,
      drivers,
      citiesConfig,
      currentCityConfig,
      currentUserRoleConfig,
      expectedVsActualAuditConfig
    ] = await Promise.all([
      Asset.find({}),
      Customer.find({}),
      Order.find({}),
      Invoice.find({}),
      Repair.find({}),
      Log.find({}),
      Notif.find({}),
      Driver.find({}),
      Config.findOne({ key: 'cities' }),
      Config.findOne({ key: 'currentCity' }),
      Config.findOne({ key: 'currentUserRole' }),
      Config.findOne({ key: 'expectedVsActualAudit' })
    ]);

    // Auto-seed initial enterprise inventory if database is clean/empty
    // Auto-seed initial enterprise inventory if database is clean/empty
    if ((!assets || assets.length === 0) && (!customers || customers.length === 0)) {
      console.log('🍃 [DB] Seeding genuine enterprise asset & customer collections in MongoDB Atlas...');
      await Promise.all([
        Asset.insertMany(initialAssets),
        Customer.insertMany(initialCustomers),
        Config.findOneAndUpdate({ key: 'cities' }, { value: initialCities }, { upsert: true })
      ]);
      assets = await Asset.find({});
      customers = await Customer.find({});
      citiesConfig = { value: initialCities };
    } else if (customers && customers.length > 0) {
      // Ensure all customer records have their appropriate city populated
      for (const cust of customers) {
        if (!cust.city || cust.city === 'Indore Hub Area') {
          let assignedCity = 'Indore (Head Office)';
          if (cust.id === 'RB-CUST-1002' || (cust.fullName && cust.fullName.includes('Priya')) || (cust.deliveryAddress && cust.deliveryAddress.includes('Surat'))) {
            assignedCity = 'Surat';
          } else if (cust.id === 'RB-CUST-1003' || (cust.fullName && cust.fullName.includes('Amitabh')) || (cust.deliveryAddress && (cust.deliveryAddress.includes('Bhopal') || cust.deliveryAddress.includes('Arera')))) {
            assignedCity = 'Bhopal';
          } else if (cust.id === 'RB-CUST-1004' || (cust.fullName && cust.fullName.includes('Ananya')) || (cust.deliveryAddress && (cust.deliveryAddress.includes('Ahmedabad') || cust.deliveryAddress.includes('Prahlad')))) {
            assignedCity = 'Ahmedabad';
          }
          cust.city = assignedCity;
          await Customer.updateOne({ _id: cust._id }, { $set: { city: assignedCity } });
        }
      }
    }

    // Auto-derive live enterprise notifications dynamically from real database orders, drivers, and repairs
    if (!notifications || notifications.length === 0) {
      const generatedNotifs = [];
      const genuineOrders = orders || [];
      const genuineDrivers = drivers || [];

      // 1. Rider assignment & logistics notifications from real database orders
      for (const ord of genuineOrders.slice(0, 5)) {
        const ordId = ord.id || (ord._id ? ord._id.toString() : '');
        const driverName = ord.assignedDriverName || ord.assignedLogisticsUser || (genuineDrivers[0] ? (genuineDrivers[0].fullName || genuineDrivers[0].name) : '');
        const driverPhone = ord.assignedDriverPhone || (genuineDrivers[0] ? genuineDrivers[0].phone : '');
        const city = ord.city || 'Indore (Head Office)';

        if (ord.status === 'DELIVERED') {
          generatedNotifs.push({
            id: `NTF-DEL-${ordId}`,
            title: '✅ Order Handover & Delivery Completed',
            message: `Order #${ordId} successfully delivered to ${ord.customerName || 'Customer'} by Rider ${driverName || 'Assigned Driver'}.`,
            type: 'success',
            category: 'logistics',
            city,
            riderName: driverName,
            riderPhone: driverPhone,
            orderId: ordId,
            read: true,
            timestamp: ord.deliveredAt || new Date(Date.now() - 30 * 60 * 1000).toISOString()
          });
        } else if (ord.status === 'OUT_FOR_DELIVERY') {
          generatedNotifs.push({
            id: `NTF-OUT-${ordId}`,
            title: '🚀 Order Out for Delivery',
            message: `Order #${ordId} is out for delivery with Rider ${driverName || 'Driver'} heading to ${ord.customerName || 'Customer'}.`,
            type: 'info',
            category: 'logistics',
            city,
            riderName: driverName,
            riderPhone: driverPhone,
            orderId: ordId,
            read: false,
            timestamp: ord.dispatchedAt || new Date(Date.now() - 15 * 60 * 1000).toISOString()
          });
        } else if (ord.assignedDriverName || ord.assignedDriverId) {
          generatedNotifs.push({
            id: `NTF-ASN-${ordId}`,
            title: '🚚 Rider Assigned to Order',
            message: `Rider ${driverName}${driverPhone ? ` (${driverPhone})` : ''} assigned to Order #${ordId} for ${city} delivery.`,
            type: 'info',
            category: 'logistics',
            city,
            riderName: driverName,
            riderPhone: driverPhone,
            orderId: ordId,
            read: false,
            timestamp: ord.assignedAt || new Date(Date.now() - 45 * 60 * 1000).toISOString()
          });
        } else {
          generatedNotifs.push({
            id: `NTF-ORD-${ordId}`,
            title: '📦 New Order Booked',
            message: `Order #${ordId} booked for ${ord.customerName || 'Customer'} in ${city}. Deposit: ₹${ord.netDeposit || 0}.`,
            type: 'info',
            category: 'order',
            city,
            orderId: ordId,
            read: false,
            timestamp: ord.createdAt || new Date(Date.now() - 60 * 60 * 1000).toISOString()
          });
        }
      }

      // 2. Damage & Quality notifications from real repairs collection
      const genuineRepairs = repairs || [];
      for (const rep of genuineRepairs.slice(0, 2)) {
        generatedNotifs.push({
          id: `NTF-REP-${rep.id || Math.random().toString().slice(2, 8)}`,
          title: '⚠️ Asset Quality & Repair Ticket',
          message: `Asset ${rep.assetBarcode || rep.assetName || 'Item'} logged for ${rep.defectDescription || rep.issueType || 'Inspection'}. Status: ${rep.status || 'Under Repair'}`,
          type: 'warning',
          category: 'damage',
          city: rep.city || 'Indore (Head Office)',
          read: false,
          timestamp: rep.createdAt || new Date(Date.now() - 90 * 60 * 1000).toISOString()
        });
      }

      if (generatedNotifs.length > 0) {
        try {
          await Notif.insertMany(generatedNotifs);
          notifications = await Notif.find({});
        } catch (nErr) {
          console.warn('DB Notif note:', nErr.message);
        }
      }
    }

    // Normalize orders to have consistent id, city, and proof photo
    const normalizedOrders = (orders || []).map(o => {
      const doc = o.toObject ? o.toObject() : o;
      let city = doc.city;
      if (!city || city === 'undefined') {
        const cust = (doc.customerName || '').toLowerCase();
        if (cust.includes('rahul')) city = 'Indore (Head Office)';
        else if (cust.includes('priya')) city = 'Surat';
        else if (cust.includes('amitabh')) city = 'Bhopal';
        else if (cust.includes('ananya')) city = 'Ahmedabad';
        else city = 'Indore (Head Office)';
      }
      return {
        ...doc,
        id: doc.id || (doc._id ? doc._id.toString() : ''),
        city,
        deliveryProofPhoto: doc.deliveryProofPhoto || doc.deliveryProof?.photos?.[0] || doc.deliveryProof?.photoUrl || '',
        isPrepared: doc.isPrepared ?? (doc.status === 'READY_FOR_DISPATCH' || doc.status === 'Ready for Dispatch' || Boolean(doc.preparedAt)),
        items: doc.items || []
      };
    });

    return {
      assets: assets || [],
      customers: customers || [],
      orders: normalizedOrders,
      invoices: invoices || [],
      repairs: repairs || [],
      auditLogs: logs || [],
      notifications: notifications || [],
      drivers: drivers || [],
      cities: citiesConfig ? citiesConfig.value : initialCities,
      currentCity: currentCityConfig ? currentCityConfig.value : 'Indore (Head Office)',
      currentUserRole: currentUserRoleConfig ? currentUserRoleConfig.value : 'Super Admin',
      expectedVsActualAudit: expectedVsActualAuditConfig ? expectedVsActualAuditConfig.value : {
        expectedCount: (assets || []).length,
        actualCount: (assets || []).length,
        missingCount: 0,
        duplicateBarcodes: [],
        fraudAlertCount: 0
      }
    };
  }

  async syncState(payload) {
    if (!getDbStatus() || !payload) {
      return 'Offline cache mode active.';
    }

    const {
      assets,
      customers,
      orders,
      invoices,
      repairs,
      auditLogs,
      notifications,
      drivers,
      cities,
      currentCity,
      currentUserRole,
      expectedVsActualAudit
    } = payload;

    const tasks = [];

    // Safe upsert for assets (never erase unless empty)
    if (assets && Array.isArray(assets) && assets.length > 0) {
      for (const item of assets) {
        if (item.id) {
          tasks.push(Asset.findOneAndUpdate({ id: item.id }, item, { upsert: true }));
        }
      }
    }

    // Safe upsert for customers
    if (customers && Array.isArray(customers) && customers.length > 0) {
      for (const item of customers) {
        if (item.id) {
          tasks.push(Customer.findOneAndUpdate({ id: item.id }, item, { upsert: true }));
        }
      }
    }

    // Safe upsert for orders
    if (orders && Array.isArray(orders) && orders.length > 0) {
      for (const item of orders) {
        if (item.id) {
          tasks.push(Order.findOneAndUpdate({ id: item.id }, item, { upsert: true }));
        }
      }
    }

    // Safe upsert for invoices
    if (invoices && Array.isArray(invoices) && invoices.length > 0) {
      for (const item of invoices) {
        if (item.id) {
          tasks.push(Invoice.findOneAndUpdate({ id: item.id }, item, { upsert: true }));
        }
      }
    }

    // Safe upsert for repairs
    if (repairs && Array.isArray(repairs) && repairs.length > 0) {
      for (const item of repairs) {
        if (item.id) {
          tasks.push(Repair.findOneAndUpdate({ id: item.id }, item, { upsert: true }));
        }
      }
    }

    // Safe upsert for drivers (NEVER delete drivers, preserve Flutter onboarding)
    if (drivers && Array.isArray(drivers) && drivers.length > 0) {
      for (const d of drivers) {
        if (d.phone || d.id) {
          const cleanPhone = (d.phone || '').replace(/[^0-9]/g, '').slice(-10);
          const filter = {
            $or: [
              ...(d.id ? [{ id: d.id }] : []),
              ...(d.phone ? [{ phone: d.phone }] : []),
              ...(cleanPhone ? [{ phone: cleanPhone }, { phone: `+91${cleanPhone}` }, { phone: `+91-${cleanPhone}` }] : [])
            ]
          };
          tasks.push(
            Driver.findOneAndUpdate(
              filter,
              { $set: d },
              { upsert: true, new: true }
            )
          );
        }
      }
    }

    if (auditLogs && Array.isArray(auditLogs) && auditLogs.length > 0) {
      for (const log of auditLogs) {
        if (log.id) {
          tasks.push(Log.findOneAndUpdate({ id: log.id }, log, { upsert: true }));
        }
      }
    }

    // Safe upsert for notifications
    if (notifications && Array.isArray(notifications) && notifications.length > 0) {
      for (const notif of notifications) {
        if (notif.id) {
          tasks.push(Notif.findOneAndUpdate({ id: notif.id }, notif, { upsert: true }));
        }
      }
    }

    if (cities && Array.isArray(cities)) {
      tasks.push(Config.findOneAndUpdate({ key: 'cities' }, { value: cities }, { upsert: true }));
    }
    if (currentCity) {
      tasks.push(Config.findOneAndUpdate({ key: 'currentCity' }, { value: currentCity }, { upsert: true }));
    }
    if (currentUserRole) {
      tasks.push(Config.findOneAndUpdate({ key: 'currentUserRole' }, { value: currentUserRole }, { upsert: true }));
    }
    if (expectedVsActualAudit) {
      tasks.push(Config.findOneAndUpdate({ key: 'expectedVsActualAudit' }, { value: expectedVsActualAudit }, { upsert: true }));
    }

    await Promise.all(tasks);
    return 'Database state synchronized successfully.';
  }
}

export default new SyncService();
