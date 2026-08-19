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
          city: DEFAULT_ADMIN.city
        });
        return {
          token,
          user: {
            username: DEFAULT_ADMIN.username,
            fullName: `${DEFAULT_ADMIN.fullName} (Offline)`,
            role: DEFAULT_ADMIN.role,
            city: DEFAULT_ADMIN.city
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

    const token = this.generateToken({
      userId: user._id,
      username: user.username,
      role: user.role,
      city: user.city
    });

    return {
      token,
      user: {
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        city: user.city
      }
    };
  }

  async createUser({ username, password, fullName, role, city }) {
    if (!getDbStatus()) {
      return { username, fullName, role, city };
    }

    const cleanUsername = username.toLowerCase().trim();
    const existing = await User.findOne({ username: cleanUsername });
    if (existing) {
      throw new Error('Username is already taken');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const newUser = await User.create({
      username: cleanUsername,
      password: hashedPassword,
      fullName,
      role,
      city
    });

    return {
      username: newUser.username,
      fullName: newUser.fullName,
      role: newUser.role,
      city: newUser.city
    };
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
          createdAt: new Date().toISOString()
        }
      ];
    }
    return await User.find({}, '-password').sort({ createdAt: -1 });
  }
}

export default new AuthService();
