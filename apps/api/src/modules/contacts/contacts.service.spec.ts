import { normalizePhoneNumber } from './phone-utils';
import { sanitizeCsvCell, sanitizeCsvRow } from './csv-utils';

describe('Contacts Service Utilities & Security', () => {
  describe('International E.164 Phone Normalization', () => {
    it('normalizes Indian phone numbers with country code or national format', () => {
      const parsed1 = normalizePhoneNumber('+91 98765 43210', 'IN');
      expect(parsed1.isValid).toBe(true);
      expect(parsed1.e164).toBe('+919876543210');
      expect(parsed1.country).toBe('IN');

      const parsed2 = normalizePhoneNumber('9876543210', 'IN');
      expect(parsed2.isValid).toBe(true);
      expect(parsed2.e164).toBe('+919876543210');
    });

    it('normalizes US/Canada phone numbers correctly without blindly prefixing +91', () => {
      const parsed = normalizePhoneNumber('+1 (202) 555-0123', 'US');
      expect(parsed.isValid).toBe(true);
      expect(parsed.e164).toBe('+12025550123');
    });

    it('normalizes UK numbers properly', () => {
      const parsed = normalizePhoneNumber('+44 7911 123456', 'GB');
      expect(parsed.isValid).toBe(true);
      expect(parsed.e164).toBe('+447911123456');
    });

    it('rejects invalid or too short phone numbers', () => {
      const parsed = normalizePhoneNumber('12345', 'IN');
      expect(parsed.isValid).toBe(false);
    });
  });

  describe('CSV Formula Injection Defense (OWASP DDE)', () => {
    it('prepends single quote to cells starting with unsafe formula characters (=, +, -, @)', () => {
      expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvCell('+cmd|/c calc')).toBe("'+cmd|/c calc");
      expect(sanitizeCsvCell('-2+5')).toBe("'-2+5");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell('\tmalicious')).toBe("'\tmalicious");
      expect(sanitizeCsvCell('\rmalicious')).toBe("'\rmalicious");
    });

    it('leaves safe alphanumeric content unchanged', () => {
      expect(sanitizeCsvCell('John Doe')).toBe('John Doe');
      expect(sanitizeCsvCell('+919876543210')).toBe("'+919876543210"); // Leading + in CSV exports is sanitized
      expect(sanitizeCsvCell('Acme Corp')).toBe('Acme Corp');
    });

    it('sanitizes full CSV row objects recursively', () => {
      const row = {
        name: '=cmd|/c calc',
        company: 'Safe Company',
        note: '@evil()',
      };

      const sanitized = sanitizeCsvRow(row);
      expect(sanitized.name).toBe("'=cmd|/c calc");
      expect(sanitized.company).toBe('Safe Company');
      expect(sanitized.note).toBe("'@evil()");
    });
  });
});
