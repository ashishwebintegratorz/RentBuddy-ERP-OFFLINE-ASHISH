import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { JWT_SECRET, JWT_EXPIRES_IN, DEFAULT_ADMIN } from '../config/constants.js';
import { getDbStatus } from '../config/db.js';

class AuthService {
  generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  async login(username, password) {
    const cleanUsername = (username || '').toLowerCase().trim();
    
    // Offline Fallback Mode
    if (!getDbStatus()) {
      if (cleanUsername === DEFAULT_ADMIN.username && password === DEFAULT_ADMIN.password) {
        const token = this.generateToken({
          userId: 'local-admin-id',
          username: DEFAULT_ADMIN.username,
          role: DEFAULT_ADMIN.role,
          city: DEFAULT_ADMIN.city,
          permissions: ['*']
        });
        return {
          token,
          user: {
            username: DEFAULT_ADMIN.username,
            fullName: `${DEFAULT_ADMIN.fullName} (Offline)`,
            role: DEFAULT_ADMIN.role,
            city: DEFAULT_ADMIN.city,
            permissions: ['*']
          }
        };
      }
      throw new Error('Invalid username or password (Offline Mode)');
    }

    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('Invalid username or password');
    }

    const permissions = (user.role === 'Super Admin')
      ? ['*']
      : (Array.isArray(user.permissions) ? user.permissions : []);

    const token = this.generateToken({
      userId: user._id,
      username: user.username,
      role: user.role,
      city: user.city,
      permissions
    });

    return {
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        city: user.city,
        permissions
      }
    };
  }

  async createUser({ username, password, fullName, role, city, permissions = [] }) {
    if (!getDbStatus()) {
      return { username, fullName, role, city, permissions };
    }

    const cleanUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      throw new Error('Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const assignedPermissions = (role === 'Super Admin') ? ['*'] : (Array.isArray(permissions) ? permissions : []);

    const newUser = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      fullName,
      role,
      city,
      permissions: assignedPermissions
    });

    return {
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      city: newUser.city,
      permissions: newUser.permissions
    };
  }

  async updateUserPermissions(targetUsername, permissions = []) {
    if (!getDbStatus()) return true;

    const cleanUsername = targetUsername.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername });
    if (!user) throw new Error('User not found');

    user.permissions = Array.isArray(permissions) ? permissions : [];
    await user.save();

    return {
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      city: user.city,
      permissions: user.permissions
    };
  }

  async deleteUser(targetUsername) {
    if (!getDbStatus()) return true;

    const cleanUsername = targetUsername.toLowerCase().trim();
    if (cleanUsername === DEFAULT_ADMIN.username.toLowerCase().trim()) {
      throw new Error('Cannot delete primary system Super Admin account');
    }

    const user = await User.findOneAndDelete({ username: cleanUsername });
    if (!user) throw new Error('User not found');
    return true;
  }

  async resetPassword(targetUsername, newPassword) {
    if (!getDbStatus()) return true;

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const user = await User.findOneAndUpdate(
      { username: targetUsername.toLowerCase().trim() },
      { password: hashedPassword }
    );
    if (!user) throw new Error('User not found');
    return true;
  }

  async changeSelfPassword(username, oldPassword, newPassword) {
    if (!getDbStatus()) {
      if (oldPassword === DEFAULT_ADMIN.password) return true;
      throw new Error('Incorrect old password');
    }

    const user = await User.findOne({ username });
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new Error('Incorrect old password');

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();
    return true;
  }

  async getAllUsers() {
    if (!getDbStatus()) {
      return [
        {
          username: DEFAULT_ADMIN.username,
          fullName: DEFAULT_ADMIN.fullName,
          role: DEFAULT_ADMIN.role,
          city: DEFAULT_ADMIN.city,
          permissions: ['*'],
          createdAt: new Date().toISOString()
        }
      ];
    }
    return await User.find({}, '-password').sort({ createdAt: -1 });
  }
}

export default new AuthService();
