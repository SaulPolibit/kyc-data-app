'use client';

import { useCallback, useState } from 'react';
import { validateFile, validateFileContent, sanitizeFileName } from '@/lib/validations/fileUpload';

interface FileUploadProps {
  label: string;
  accept?: string;
  required?: boolean;
  error?: string;
  isDocument?: boolean;
  onFileSelect: (file: File, base64: string) => void;
}

export function FileUpload({
  label,
  accept = 'image/*,application/pdf',
  required,
  error: externalError,
  isDocument = false,
  onFileSelect
}: FileUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [preview, setPreview] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);

  const handleChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsValidating(true);
    setError('');

    try {
      // 1. Validate file metadata (type, size, extension)
      const basicValidation = validateFile(file, isDocument);
      if (!basicValidation.isValid) {
        setError(basicValidation.error || 'Invalid file');
        setIsValidating(false);
        return;
      }

      // 2. Validate file content (magic bytes - prevent MIME spoofing)
      const contentValidation = await validateFileContent(file);
      if (!contentValidation.isValid) {
        setError(contentValidation.error || 'Invalid file content');
        setIsValidating(false);
        return;
      }

      // 3. Sanitize filename
      const safeName = sanitizeFileName(file.name);
      setFileName(safeName);

      // 4. Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;

        // Show preview for images
        if (file.type.startsWith('image/')) {
          setPreview(base64);
        } else {
          setPreview('');
        }

        // Create sanitized file and pass with base64
        const sanitizedFile = new File([file], safeName, { type: file.type });
        onFileSelect(sanitizedFile, base64);
        setIsValidating(false);
      };
      reader.onerror = () => {
        setError('Failed to read file');
        setIsValidating(false);
      };
      reader.readAsDataURL(file);

    } catch {
      setError('Failed to validate file');
      setIsValidating(false);
    }
  }, [onFileSelect, isDocument]);

  const displayError = externalError || error;
  const inputId = `file-${label.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className={`
        border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        hover:border-blue-500 transition-colors
        ${displayError ? 'border-red-500' : 'border-gray-300'}
        ${isValidating ? 'opacity-50' : ''}
      `}>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
          id={inputId}
          disabled={isValidating}
        />
        <label htmlFor={inputId} className="cursor-pointer block">
          {isValidating ? (
            <div className="text-gray-500">
              <svg className="animate-spin mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-sm mt-2">Validating...</p>
            </div>
          ) : preview ? (
            <img src={preview} alt="Preview" className="max-h-32 mx-auto mb-2" />
          ) : (
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          )}
          <p className="text-sm text-gray-600 mt-2">
            {fileName || 'Click to upload or drag and drop'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isDocument ? 'Max 24MB (PDF, JPEG, PNG)' : 'Max 15MB (JPEG, PNG, PDF)'}
          </p>
        </label>
      </div>
      {displayError && <p className="mt-1 text-sm text-red-500">{displayError}</p>}
    </div>
  );
}
