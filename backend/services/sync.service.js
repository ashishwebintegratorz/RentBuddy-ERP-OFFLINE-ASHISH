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

class SyncService {
  async loadAllState() {
    if (!getDbStatus()) {
      return null;
    }

    const [
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

    return {
      assets: assets || [],
      customers: customers || [],
      orders: orders || [],
      invoices: invoices || [],
      repairs: repairs || [],
      auditLogs: logs || [],
      notifications: notifications || [],
      drivers: drivers || [],
      cities: citiesConfig ? citiesConfig.value : null,
      currentCity: currentCityConfig ? currentCityConfig.value : null,
      currentUserRole: currentUserRoleConfig ? currentUserRoleConfig.value : null,
      expectedVsActualAudit: expectedVsActualAuditConfig ? expectedVsActualAuditConfig.value : null
    };
  }

  async syncState(payload) {
    if (!getDbStatus()) {
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

    if (assets) {
      tasks.push(
        Asset.deleteMany({}).then(() => (assets.length > 0 ? Asset.insertMany(assets) : null))
      );
    }
    if (customers) {
      tasks.push(
        Customer.deleteMany({}).then(() => (customers.length > 0 ? Customer.insertMany(customers) : null))
      );
    }
    if (orders) {
      tasks.push(
        Order.deleteMany({}).then(() => (orders.length > 0 ? Order.insertMany(orders) : null))
      );
    }
    if (invoices) {
      tasks.push(
        Invoice.deleteMany({}).then(() => (invoices.length > 0 ? Invoice.insertMany(invoices) : null))
      );
    }
    if (repairs) {
      tasks.push(
        Repair.deleteMany({}).then(() => (repairs.length > 0 ? Repair.insertMany(repairs) : null))
      );
    }
    if (auditLogs) {
      tasks.push(
        Log.deleteMany({}).then(() => (auditLogs.length > 0 ? Log.insertMany(auditLogs) : null))
      );
    }
    if (notifications) {
      tasks.push(
        Notif.deleteMany({}).then(() => (notifications.length > 0 ? Notif.insertMany(notifications) : null))
      );
    }
    if (drivers) {
      tasks.push(
        Driver.deleteMany({}).then(() => (drivers.length > 0 ? Driver.insertMany(drivers) : null))
      );
    }

    if (cities) {
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
