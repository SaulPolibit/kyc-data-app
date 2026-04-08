import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Get or generate the encryption key from environment variable
 * The key should be a 64-character hex string (256 bits)
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  if (keyHex.length !== 64) {
    throw new Error(
      'ENCRYPTION_KEY must be a 64-character hex string (256 bits). ' +
      'Generate one with: openssl rand -hex 32'
    );
  }

  return Buffer.from(keyHex, 'hex');
}

/**
 * Encrypt a string using AES-256-GCM
 * Returns a base64-encoded string containing: salt + iv + authTag + ciphertext
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Derive a unique key for this encryption using HKDF
  const derivedKey = Buffer.from(crypto.hkdfSync('sha256', key, salt, 'document-encryption', 32));

  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);

  const authTag = cipher.getAuthTag();

  // Combine salt + iv + authTag + ciphertext
  const combined = Buffer.concat([salt, iv, authTag, ciphertext]);

  return combined.toString('base64');
}

/**
 * Decrypt a string that was encrypted with the encrypt function
 */
export function decrypt(encryptedData: string): string {
  const key = getEncryptionKey();
  const combined = Buffer.from(encryptedData, 'base64');

  // Extract components
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

  // Derive the same key using HKDF
  const derivedKey = Buffer.from(crypto.hkdfSync('sha256', key, salt, 'document-encryption', 32));

  const decipher = crypto.createDecipheriv(ALGORITHM, derivedKey, iv);
  decipher.setAuthTag(authTag);

  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);

  return plaintext.toString('utf8');
}

/**
 * Check if the encryption key is configured
 */
export function isEncryptionConfigured(): boolean {
  const keyHex = process.env.ENCRYPTION_KEY;
  const isConfigured = !!keyHex && keyHex.length === 64;

  if (!keyHex) {
    console.warn('[Encryption] ENCRYPTION_KEY is not set');
  } else if (keyHex.length !== 64) {
    console.warn(`[Encryption] ENCRYPTION_KEY has wrong length: ${keyHex.length} (expected 64)`);
  }

  return isConfigured;
}

/**
 * Encrypt document files in form data
 * Only encrypts the 'file' field within document objects
 */
export function encryptDocumentsInFormData(
  formData: Record<string, unknown>
): Record<string, unknown> {
  if (!isEncryptionConfigured()) {
    console.warn('[Encryption] Document encryption is not configured. Documents will be stored unencrypted.');
    return formData;
  }

  console.log('[Encryption] Encrypting documents in form data...');

  const encrypted = { ...formData };
  let documentsEncrypted = 0;
  let imagesEncrypted = 0;

  // Handle documents array (for both KYC and KYB)
  if (Array.isArray(encrypted.documents)) {
    console.log(`[Encryption] Found ${encrypted.documents.length} documents to process`);
    encrypted.documents = encrypted.documents.map((doc: Record<string, unknown>) => {
      if (doc.file && typeof doc.file === 'string' && !doc._encrypted) {
        documentsEncrypted++;
        const filePreview = doc.file.substring(0, 50);
        console.log(`[Encryption] Encrypting document file (preview: ${filePreview}...)`);
        return {
          ...doc,
          file: encrypt(doc.file),
          _encrypted: true,
        };
      }
      return doc;
    });
  }

  // Handle identifying_information for KYC (may have document images)
  if (Array.isArray(encrypted.identifying_information)) {
    console.log(`[Encryption] Found ${encrypted.identifying_information.length} identification records to process`);
    encrypted.identifying_information = encrypted.identifying_information.map(
      (info: Record<string, unknown>) => {
        const encryptedInfo = { ...info };

        if (info.front_image && typeof info.front_image === 'string' && !info._front_encrypted) {
          imagesEncrypted++;
          console.log('[Encryption] Encrypting front_image');
          encryptedInfo.front_image = encrypt(info.front_image);
          encryptedInfo._front_encrypted = true;
        }

        if (info.back_image && typeof info.back_image === 'string' && !info._back_encrypted) {
          imagesEncrypted++;
          console.log('[Encryption] Encrypting back_image');
          encryptedInfo.back_image = encrypt(info.back_image);
          encryptedInfo._back_encrypted = true;
        }

        return encryptedInfo;
      }
    );
  }

  console.log(`[Encryption] Encryption complete: ${documentsEncrypted} documents, ${imagesEncrypted} images encrypted`);

  return encrypted;
}

/**
 * Decrypt document files in form data
 * Only decrypts fields that were marked as encrypted
 */
export function decryptDocumentsInFormData(
  formData: Record<string, unknown>
): Record<string, unknown> {
  if (!formData) return formData;

  const decrypted = { ...formData };

  // Handle documents array
  if (Array.isArray(decrypted.documents)) {
    decrypted.documents = decrypted.documents.map((doc: Record<string, unknown>) => {
      if (doc._encrypted && doc.file && typeof doc.file === 'string') {
        try {
          const { _encrypted, ...rest } = doc;
          return {
            ...rest,
            file: decrypt(doc.file),
          };
        } catch (error) {
          console.error('Failed to decrypt document:', error);
          return doc;
        }
      }
      return doc;
    });
  }

  // Handle identifying_information
  if (Array.isArray(decrypted.identifying_information)) {
    decrypted.identifying_information = decrypted.identifying_information.map(
      (info: Record<string, unknown>) => {
        const decryptedInfo = { ...info };

        if (info._front_encrypted && info.front_image && typeof info.front_image === 'string') {
          try {
            decryptedInfo.front_image = decrypt(info.front_image);
            delete decryptedInfo._front_encrypted;
          } catch (error) {
            console.error('Failed to decrypt front image:', error);
          }
        }

        if (info._back_encrypted && info.back_image && typeof info.back_image === 'string') {
          try {
            decryptedInfo.back_image = decrypt(info.back_image);
            delete decryptedInfo._back_encrypted;
          } catch (error) {
            console.error('Failed to decrypt back image:', error);
          }
        }

        return decryptedInfo;
      }
    );
  }

  return decrypted;
}
