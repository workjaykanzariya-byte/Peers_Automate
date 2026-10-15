import { parsePhoneNumberFromString, PhoneNumber } from 'libphonenumber-js';

export interface NormalizedPhone {
  e164: string;
  country?: string;
  formattedInternational?: string;
  isValid: boolean;
}

export function normalizePhoneNumber(rawPhone: string, defaultCountry: any = 'US'): NormalizedPhone {
  if (!rawPhone) {
    return { e164: '', isValid: false };
  }

  // Clean obvious whitespace and brackets
  let cleaned = rawPhone.trim();
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  try {
    const parsed: PhoneNumber | undefined = parsePhoneNumberFromString(cleaned, defaultCountry);

    if (parsed && parsed.isValid()) {
      return {
        e164: parsed.number, // Normalized E.164 standard e.g. +15551234567
        country: parsed.country,
        formattedInternational: parsed.formatInternational(),
        isValid: true,
      };
    }
  } catch {
    // Continue to fallback
  }

  // Safe fallback if country is unknown but digits are provided
  const digits = cleaned.replace(/[^0-9+]/g, '');
  if (digits.length >= 8 && digits.length <= 16) {
    const e164 = digits.startsWith('+') ? digits : `+${digits}`;
    return {
      e164,
      isValid: true,
    };
  }

  return {
    e164: cleaned,
    isValid: false,
  };
}
