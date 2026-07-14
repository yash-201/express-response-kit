import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptionOptions {
  secretKey: string; // Hex string (64 chars) or raw 32-byte string
}

export class AesEncryption {
  private key: Buffer;

  constructor(secretKey: string) {
    if (!secretKey) {
      throw new Error('Encryption key must be specified.');
    }
    // Key must be exactly 32 bytes (256 bits).
    // If it's a 64-character hex string, convert from hex.
    if (secretKey.length === 64) {
      this.key = Buffer.from(secretKey, 'hex');
    } else {
      const keyBuffer = Buffer.from(secretKey, 'utf8');
      if (keyBuffer.length !== 32) {
        throw new Error('Encryption key must be exactly 32 bytes (or a 64-character hex string).');
      }
      this.key = keyBuffer;
    }
  }

  /**
   * Encrypts any data payload (objects will be JSON serialized)
   * Returns a format of: iv_hex:auth_tag_hex:ciphertext_hex
   */
  encrypt(data: any): string {
    if (data === undefined || data === null) {
      return '';
    }
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const iv = randomBytes(12); // GCM standard IV size is 12 bytes
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag().toString('hex');
    
    return `${iv.toString('hex')}:${tag}:${encrypted}`;
  }

  /**
   * Decrypts a previously encrypted string format iv_hex:auth_tag_hex:ciphertext_hex
   * Returns parsed JSON object or raw string depending on the payload.
   */
  decrypt(encryptedStr: string): any {
    if (!encryptedStr) {
      return null;
    }
    const parts = encryptedStr.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format. Expected "iv:tag:ciphertext".');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const tag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  }
}
export default AesEncryption;
