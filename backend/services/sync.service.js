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
    }

    return {
      assets: assets || [],
      customers: customers || [],
      orders: orders || [],
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
