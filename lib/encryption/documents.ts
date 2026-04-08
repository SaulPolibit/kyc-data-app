import CryptoJS from 'crypto-js';

// IMPORTANT: These keys must be set in environment variables (server-side only)
const DOCUMENT_ENCRYPTION_KEY = process.env.DOCUMENT_ENCRYPTION_KEY!;
const PII_ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

/**
 * Encrypt document base64 data with AES-256-CBC
 * Used for: passport images, formation documents, etc.
 */
export function encryptDocument(base64Data: string): string {
  if (!base64Data) return '';
  if (!DOCUMENT_ENCRYPTION_KEY) {
    throw new Error('DOCUMENT_ENCRYPTION_KEY not configured');
  }

  // Generate random IV for each encryption
  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(base64Data, DOCUMENT_ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Prepend IV to ciphertext for decryption
  const combined = iv.concat(encrypted.ciphertext);
  return combined.toString(CryptoJS.enc.Base64);
}

/**
 * Decrypt document base64 data
 * Used when: submitting to Bridge API
 */
export function decryptDocument(encryptedData: string): string {
  if (!encryptedData) return '';
  if (!DOCUMENT_ENCRYPTION_KEY) {
    throw new Error('DOCUMENT_ENCRYPTION_KEY not configured');
  }

  try {
    const combined = CryptoJS.enc.Base64.parse(encryptedData);

    // Extract IV (first 16 bytes / 4 words)
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      DOCUMENT_ENCRYPTION_KEY,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
      }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('Document decryption failed:', error);
    throw new Error('Failed to decrypt document');
  }
}

/**
 * Encrypt PII data (SSN, EIN, tax IDs)
 * Used for: identifying_information.number field
 */
export function encryptPII(plainText: string): string {
  if (!plainText) return '';
  if (!PII_ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  const iv = CryptoJS.lib.WordArray.random(16);

  const encrypted = CryptoJS.AES.encrypt(plainText, PII_ENCRYPTION_KEY, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  const combined = iv.concat(encrypted.ciphertext);
  return combined.toString(CryptoJS.enc.Base64);
}

/**
 * Decrypt PII data
 * Used when: submitting to Bridge API or displaying masked values
 */
export function decryptPII(encryptedText: string): string {
  if (!encryptedText) return '';
  if (!PII_ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY not configured');
  }

  try {
    const combined = CryptoJS.enc.Base64.parse(encryptedText);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));

    const decrypted = CryptoJS.AES.decrypt(
      { ciphertext: ciphertext } as CryptoJS.lib.CipherParams,
      PII_ENCRYPTION_KEY,
      { iv: iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 }
    );

    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('PII decryption failed:', error);
    throw new Error('Failed to decrypt PII');
  }
}

/**
 * Mask sensitive data for display
 */
export function maskSSN(ssn: string): string {
  if (!ssn || ssn.length < 4) return '***-**-****';
  return `***-**-${ssn.slice(-4)}`;
}

export function maskEIN(ein: string): string {
  if (!ein || ein.length < 4) return '**-*******';
  return `**-*****${ein.slice(-2)}`;
}

export function maskTaxId(taxId: string): string {
  if (!taxId || taxId.length < 4) return '********';
  return `****${taxId.slice(-4)}`;
}
