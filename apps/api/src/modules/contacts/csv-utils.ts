/**
 * Sanitizes cell values to prevent CSV Formula Injection (OWASP DDE)
 */
export function sanitizeCsvCell(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const rawStr = String(value);
  const dangerousPrefixes = ['=', '+', '-', '@', '\t', '\r'];

  if (dangerousPrefixes.some((p) => rawStr.startsWith(p))) {
    return `'${rawStr}`;
  }

  return rawStr;
}

export function sanitizeCsvRow(row: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, val] of Object.entries(row)) {
    sanitized[key] = sanitizeCsvCell(val);
  }
  return sanitized;
}

