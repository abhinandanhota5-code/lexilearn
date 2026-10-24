import crypto from 'node:crypto';

/**
 * Secure hashing and verification service for the 4-digit Parent PIN.
 * Uses native scrypt with a unique random salt per PIN.
 */
export class PinService {
  /**
   * Generates a salted scrypt hash for a 4-digit PIN.
   * @param {string} pin 4-digit numeric string
   * @returns {{ hash: string, salt: string }}
   */
  static hashPin(pin) {
    if (!pin || typeof pin !== 'string' || !/^\d{4}$/.test(pin.trim())) {
      throw new Error('PIN must be exactly 4 numeric digits.');
    }
    const cleanPin = pin.trim();
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(cleanPin, salt, 64).toString('hex');
    return { hash, salt };
  }

  /**
   * Verifies an entered PIN against a stored hash and salt.
   * Uses constant-time buffer comparison to prevent timing attacks.
   * @param {string} pin Entered 4-digit PIN
   * @param {string} storedHash Hex-encoded stored hash
   * @param {string} storedSalt Hex-encoded stored salt
   * @returns {boolean} True if PIN matches, false otherwise
   */
  static verifyPin(pin, storedHash, storedSalt) {
    if (!pin || !storedHash || !storedSalt || typeof pin !== 'string') {
      return false;
    }
    const cleanPin = pin.trim();
    if (!/^\d{4}$/.test(cleanPin)) {
      return false;
    }
    try {
      const computedHash = crypto.scryptSync(cleanPin, storedSalt, 64).toString('hex');
      const storedBuf = Buffer.from(storedHash, 'hex');
      const computedBuf = Buffer.from(computedHash, 'hex');

      if (storedBuf.length !== computedBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(storedBuf, computedBuf);
    } catch {
      return false;
    }
  }
}
