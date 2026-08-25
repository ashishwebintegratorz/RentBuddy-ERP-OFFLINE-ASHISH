import { Driver } from '../models/index.js';
import { getDbStatus } from '../config/db.js';

class DriverService {
  async getAllDrivers() {
    if (!getDbStatus()) {
      return [];
    }
    return await Driver.find({}).sort({ createdAt: -1 });
  }

  _buildDriverFilter(idOrPhone) {
    if (!idOrPhone) return { id: '__none__' };
    const str = String(idOrPhone).trim();
    const cleanPhone = str.replace(/[^0-9]/g, '').slice(-10);
    const conditions = [{ id: str }, { phone: str }];
    if (cleanPhone && cleanPhone.length === 10) {
      conditions.push(
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: `+91-${cleanPhone}` }
      );
    }
    return { $or: conditions };
  }

  async getDriverById(id) {
    if (!getDbStatus()) return null;
    return await Driver.findOne(this._buildDriverFilter(id));
  }

  async getDriverByPhone(phone) {
    if (!getDbStatus()) return null;
    return await Driver.findOne(this._buildDriverFilter(phone));
  }

  async createDriver(driverData) {
    if (!getDbStatus()) {
      return driverData;
    }
    const cleanPhone = (driverData.phone || '').replace(/[^0-9]/g, '').slice(-10);
    const filter = this._buildDriverFilter(driverData.id || cleanPhone);
    return await Driver.findOneAndUpdate(
      filter,
      { $set: driverData },
      { new: true, upsert: true }
    );
  }

  async updateDriver(id, updates) {
    if (!getDbStatus()) return { id, ...updates };
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      { $set: updates },
      { new: true, upsert: true }
    );
  }

  async updateDriverStatus(id, { status, verificationStatus, verificationNotes }) {
    if (!getDbStatus()) return { id, status, verificationStatus };
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (verificationStatus !== undefined) updates.verificationStatus = verificationStatus;
    if (verificationNotes !== undefined) updates.verificationNotes = verificationNotes;
    if (status === 'Blocked' || status === 'Suspended') {
      updates.isBlocked = true;
    } else if (status === 'Active') {
      updates.isBlocked = false;
    }
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      { $set: updates },
      { new: true }
    );
  }

  async blockDriver(id, { isBlocked, blockedReason }) {
    if (!getDbStatus()) return { id, isBlocked, blockedReason };
    const shouldBlock = Boolean(isBlocked);
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      {
        $set: {
          isBlocked: shouldBlock,
          blockedReason: shouldBlock ? (blockedReason || 'Administrative restriction') : '',
          status: shouldBlock ? 'Blocked' : 'Active'
        }
      },
      { new: true }
    );
  }

  async updateDocuments(id, documents) {
    if (!getDbStatus()) return { id, documents };
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      { $set: { documents } },
      { new: true }
    );
  }
}

export default new DriverService();
