import { Driver } from '../models/index.js';
import { getDbStatus } from '../config/db.js';

class DriverService {
  async getAllDrivers() {
    if (!getDbStatus()) {
      return [];
    }
    return await Driver.find({}).sort({ createdAt: -1 });
  }

  async getDriverById(id) {
    if (!getDbStatus()) return null;
    return await Driver.findOne({ id });
  }

  async getDriverByPhone(phone) {
    if (!getDbStatus()) return null;
    return await Driver.findOne({ phone });
  }

  async createDriver(driverData) {
    if (!getDbStatus()) {
      return driverData;
    }
    const driver = new Driver(driverData);
    return await driver.save();
  }

  async updateDriver(id, updates) {
    if (!getDbStatus()) return { id, ...updates };
    return await Driver.findOneAndUpdate({ id }, { $set: updates }, { new: true, upsert: true });
  }

  async updateDriverStatus(id, { status, verificationStatus, verificationNotes }) {
    if (!getDbStatus()) return { id, status, verificationStatus };
    return await Driver.findOneAndUpdate(
      { id },
      { $set: { status, verificationStatus, verificationNotes } },
      { new: true }
    );
  }

  async blockDriver(id, { isBlocked, blockedReason }) {
    if (!getDbStatus()) return { id, isBlocked, blockedReason };
    return await Driver.findOneAndUpdate(
      { id },
      {
        $set: {
          isBlocked,
          blockedReason: isBlocked ? blockedReason : '',
          status: isBlocked ? 'Blocked' : 'Active'
        }
      },
      { new: true }
    );
  }

  async updateDocuments(id, documents) {
    if (!getDbStatus()) return { id, documents };
    return await Driver.findOneAndUpdate(
      { id },
      { $set: { documents } },
      { new: true }
    );
  }
}

export default new DriverService();
