import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly masterKey: Buffer;
  private readonly currentKeyVersion = 'v1';

  constructor(private readonly configService: ConfigService) {
    const rawKey = this.configService.get<string>('ENCRYPTION_MASTER_KEY_V1');
    if (!rawKey) {
      this.logger.warn('ENCRYPTION_MASTER_KEY_V1 not configured. Generating ephemeral 256-bit key for local session.');
      this.masterKey = crypto.randomBytes(32);
    } else {
      // Must be 32 bytes (64 hex characters or 32 raw bytes)
      if (rawKey.length === 64) {
        this.masterKey = Buffer.from(rawKey, 'hex');
      } else {
        this.masterKey = crypto.createHash('sha256').update(rawKey).digest();
      }
    }
  }

  /**
   * Encrypts sensitive credentials using AES-256-GCM authenticated encryption.
   * Returns formatted string: "version:iv_hex:tag_hex:ciphertext_hex"
   */
  encrypt(plaintext: string): { ciphertext: string; keyVersion: string } {
    if (!plaintext) {
      throw new InternalServerErrorException('Cannot encrypt empty plaintext');
    }

    try {
      const iv = crypto.randomBytes(12); // Standard GCM IV size
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();

      const ciphertext = `${this.currentKeyVersion}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
      return {
        ciphertext,
        keyVersion: this.currentKeyVersion,
      };
    } catch (error: any) {
      this.logger.error(`Encryption failure: ${error.message}`);
      throw new InternalServerErrorException('Failed to securely encrypt credential payload');
    }
  }

  /**
   * Decrypts AES-256-GCM ciphertext verifying authentication tag.
   */
  decrypt(payload: string): string {
    if (!payload || !payload.includes(':')) {
      throw new InternalServerErrorException('Invalid ciphertext envelope format');
    }

    const parts = payload.split(':');
    if (parts.length !== 4) {
      throw new InternalServerErrorException('Malformed ciphertext segment count');
    }

    const [version, ivHex, tagHex, encryptedHex] = parts;

    if (version !== 'v1') {
      throw new InternalServerErrorException(`Unsupported key version: ${version}`);
    }

    try {
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.masterKey, iv);
      
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error: any) {
      this.logger.error(`Decryption or authentication tag verification failed: ${error.message}`);
      throw new InternalServerErrorException('Integrity check failed: corrupted or tampered credential');
    }
  }

  /**
   * Masks a sensitive string for safe display in UI or logs.
   * Example: "EAAB...3f9c"
   */
  mask(sensitiveString: string, visibleLength = 4): string {
    if (!sensitiveString) return '';
    if (sensitiveString.length <= visibleLength * 2) {
      return '****';
    }
    const prefix = sensitiveString.slice(0, 4);
    const suffix = sensitiveString.slice(-visibleLength);
    return `${prefix}••••••••${suffix}`;
  }
}
