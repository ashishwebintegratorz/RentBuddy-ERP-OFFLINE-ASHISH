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
    const cleanDigits = str.replace(/[^0-9]/g, '');
    const cleanPhone = cleanDigits.length >= 4 ? cleanDigits.slice(-10) : '';

    const conditions = [
      { id: str },
      { phone: str },
      { id: new RegExp(`^${str}$`, 'i') }
    ];

    if (str.length === 24 && /^[0-9a-fA-F]{24}$/.test(str)) {
      conditions.push({ _id: str });
    }

    if (cleanPhone) {
      conditions.push(
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: `+91-${cleanPhone}` },
        { phone: new RegExp(cleanPhone, 'i') },
        { id: `DRV-${cleanPhone.slice(-4)}` }
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
      { returnDocument: 'after', upsert: true }
    );
  }

  async updateDriver(id, updates) {
    if (!getDbStatus()) return { id, ...updates };
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      { $set: updates },
      { returnDocument: 'after', upsert: true }
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
    const filter = this._buildDriverFilter(id);
    await Driver.updateMany(filter, { $set: updates });
    return await Driver.findOne(filter);
  }

  async blockDriver(id, { isBlocked, blockedReason }) {
    if (!getDbStatus()) return { id, isBlocked, blockedReason };
    const shouldBlock = Boolean(isBlocked);
    const filter = this._buildDriverFilter(id);
    await Driver.updateMany(
      filter,
      {
        $set: {
          isBlocked: shouldBlock,
          blockedReason: shouldBlock ? (blockedReason || 'Administrative restriction') : '',
          status: shouldBlock ? 'Blocked' : 'Active'
        }
      }
    );
    return await Driver.findOne(filter);
  }

  async updateDocuments(id, documents) {
    if (!getDbStatus()) return { id, documents };
    return await Driver.findOneAndUpdate(
      this._buildDriverFilter(id),
      { $set: { documents } },
      { returnDocument: 'after' }
    );
  }
}

export default new DriverService();
