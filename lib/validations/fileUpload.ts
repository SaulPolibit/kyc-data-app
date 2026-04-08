// Allowed MIME types for KYC documents
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
];

// Allowed extensions
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf'];

// Max file sizes (per Bridge API limits)
const MAX_SINGLE_FILE_SIZE = 15 * 1024 * 1024;  // 15MB for single image
const MAX_DOCUMENT_SIZE = 24 * 1024 * 1024;     // 24MB for documents

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate file metadata (type, size, extension)
 */
export function validateFile(file: File, isDocument = false): FileValidationResult {
  const maxSize = isDocument ? MAX_DOCUMENT_SIZE : MAX_SINGLE_FILE_SIZE;

  // Check file size
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `File size must be less than ${maxSize / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      isValid: false,
      error: `File type ${file.type} not allowed. Use: JPEG, PNG, GIF, WebP, or PDF`,
    };
  }

  // Check extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `File extension ${extension} not allowed`,
    };
  }

  // Check for double extensions (e.g., file.jpg.exe)
  const parts = file.name.split('.');
  if (parts.length > 2) {
    const suspiciousExtensions = ['.php', '.js', '.html', '.exe', '.sh', '.bat', '.cmd'];
    for (const part of parts) {
      if (suspiciousExtensions.includes('.' + part.toLowerCase())) {
        return {
          isValid: false,
          error: 'Suspicious file extension detected',
        };
      }
    }
  }

  return { isValid: true };
}

/**
 * Validate file content via magic bytes (prevent MIME spoofing)
 */
export async function validateFileContent(file: File): Promise<FileValidationResult> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Magic byte signatures
  const signatures: Record<string, number[]> = {
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/png': [0x89, 0x50, 0x4E, 0x47],
    'image/gif': [0x47, 0x49, 0x46],
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'image/webp': [0x52, 0x49, 0x46, 0x46],       // RIFF
  };

  const expectedSig = signatures[file.type];
  if (!expectedSig) {
    return { isValid: false, error: 'Unknown file type' };
  }

  const matches = expectedSig.every((byte, index) => bytes[index] === byte);
  if (!matches) {
    return {
      isValid: false,
      error: 'File content does not match declared type (possible spoofing)',
    };
  }

  return { isValid: true };
}

/**
 * Sanitize filename to prevent path traversal and special chars
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path traversal
  let sanitized = fileName.replace(/\.\./g, '');

  // Remove special characters
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  // Limit length
  if (sanitized.length > 100) {
    const ext = sanitized.split('.').pop();
    sanitized = sanitized.substring(0, 90) + '.' + ext;
  }

  return sanitized;
}
