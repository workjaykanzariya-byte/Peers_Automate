import { EncryptionService } from './encryption.service';
import { ConfigService } from '@nestjs/config';

describe('EncryptionService (AES-256-GCM)', () => {
  let service: EncryptionService;
  const testMasterKeyHex = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  beforeEach(() => {
    const configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'ENCRYPTION_MASTER_KEY_V1') return testMasterKeyHex;
        return null;
      }),
    } as unknown as ConfigService;

    service = new EncryptionService(configServiceMock);
  });

  it('should encrypt and decrypt a sensitive Meta API token back to original value', () => {
    const plaintext = 'EAABwb71239847128947192847129847129874198274';
    const { ciphertext, keyVersion } = service.encrypt(plaintext);

    expect(keyVersion).toBe('v1');
    expect(ciphertext).toBeDefined();
    expect(ciphertext.startsWith('v1:')).toBe(true);

    const decrypted = service.decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('should generate distinct ciphertexts for identical plaintext (IV randomness)', () => {
    const secret = 'super-secret-waba-token';
    const result1 = service.encrypt(secret);
    const result2 = service.encrypt(secret);

    expect(result1.ciphertext).not.toEqual(result2.ciphertext);
    expect(service.decrypt(result1.ciphertext)).toBe(secret);
    expect(service.decrypt(result2.ciphertext)).toBe(secret);
  });

  it('should throw when ciphertext has been tampered with (GCM authentication check)', () => {
    const { ciphertext } = service.encrypt('confidential-meta-key');
    const parts = ciphertext.split(':');
    
    // Tamper with the encrypted hex body
    const tamperedPayload = `${parts[0]}:${parts[1]}:${parts[2]}:deadbeef${parts[3].slice(8)}`;

    expect(() => service.decrypt(tamperedPayload)).toThrow(
      'Integrity check failed: corrupted or tampered credential',
    );
  });

  it('should mask sensitive credential strings appropriately for UI and logs', () => {
    const token = 'EAAB1234567890abcdef9876';
    const masked = service.mask(token, 4);

    expect(masked).toBe('EAAB••••••••9876');
    expect(masked).not.toContain('1234567890abcdef');
  });
});
