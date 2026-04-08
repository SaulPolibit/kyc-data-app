'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { KYCDocumentsData, DocumentData, IndividualDocumentPurpose } from '@/types/public-forms';

interface Props {
  data: Partial<KYCDocumentsData>;
  onChange: (data: Partial<KYCDocumentsData>) => void;
  errors?: Record<string, string>;
}

const DOCUMENT_PURPOSES: IndividualDocumentPurpose[] = [
  'proof_of_address',
  'proof_of_source_of_funds',
  'proof_of_source_of_wealth',
  'proof_of_tax_identification',
  'proof_of_account_purpose',
  'proof_of_individual_name_change',
  'proof_of_relationship',
];

export default function KYCDocumentsStep({ data, onChange, errors }: Props) {
  const t = useTranslations('documents');
  const documents = data.documents || [];

  const getDocumentByPurpose = (purpose: IndividualDocumentPurpose) => {
    return documents.find((doc) => doc.purposes.includes(purpose));
  };

  const updateDocument = (purpose: IndividualDocumentPurpose, file: string | null) => {
    const existingIndex = documents.findIndex((doc) => doc.purposes.includes(purpose));

    if (file === null) {
      // Remove document
      const newDocs = documents.filter((_, i) => i !== existingIndex);
      onChange({ documents: newDocs });
    } else if (existingIndex >= 0) {
      // Update existing
      const newDocs = [...documents];
      newDocs[existingIndex] = { ...newDocs[existingIndex], file };
      onChange({ documents: newDocs });
    } else {
      // Add new
      const newDoc: DocumentData = { purposes: [purpose], file };
      onChange({ documents: [...documents, newDoc] });
    }
  };

  const uploadedCount = documents.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Status Info */}
      <div className={`border rounded-lg p-4 ${uploadedCount > 0 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-start">
          <svg
            className={`w-5 h-5 mr-2 flex-shrink-0 ${uploadedCount > 0 ? 'text-green-600' : 'text-blue-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {uploadedCount > 0 ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
          <div>
            <p className={`text-sm font-medium ${uploadedCount > 0 ? 'text-green-800' : 'text-blue-800'}`}>
              {uploadedCount > 0 ? t('documentsUploaded', { count: uploadedCount }) : t('allDocumentsOptional')}
            </p>
            <p className={`text-sm ${uploadedCount > 0 ? 'text-green-700' : 'text-blue-700'}`}>
              {uploadedCount > 0
                ? t('canAddMoreOrProceed')
                : t('uploadToExpedite')}
            </p>
          </div>
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="space-y-4">
        {DOCUMENT_PURPOSES.map((purpose) => (
          <DocumentUploadCard
            key={purpose}
            purpose={purpose}
            label={t(`types.${purpose}.label`)}
            description={t(`types.${purpose}.description`)}
            required={false}
            document={getDocumentByPurpose(purpose)}
            onUpload={(file) => updateDocument(purpose, file)}
            onRemove={() => updateDocument(purpose, null)}
            error={errors?.[`documents.${purpose}`]}
            translations={{
              required: t('required'),
              optional: t('optional'),
              replace: t('replace'),
              remove: t('remove'),
              upload: t('upload'),
              invalidFileType: t('invalidFileType'),
              fileTooLarge: t('fileTooLarge'),
            }}
          />
        ))}
      </div>

      {/* Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">{t('tips.title')}</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {t('tips.clear')}</li>
          <li>• {t('tips.recent')}</li>
          <li>• {t('tips.matchDetails')}</li>
          <li>• {t('tips.formats')}</li>
        </ul>
      </div>
    </div>
  );
}

interface DocumentUploadCardProps {
  purpose: IndividualDocumentPurpose;
  label: string;
  description: string;
  required: boolean;
  document?: DocumentData;
  onUpload: (file: string) => void;
  onRemove: () => void;
  error?: string;
  translations: {
    required: string;
    optional: string;
    replace: string;
    remove: string;
    upload: string;
    invalidFileType: string;
    fileTooLarge: string;
  };
}

function DocumentUploadCard({
  label,
  description,
  required,
  document,
  onUpload,
  onRemove,
  error,
  translations,
}: DocumentUploadCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert(translations.invalidFileType);
      return;
    }

    // Validate file size (24MB max)
    if (file.size > 24 * 1024 * 1024) {
      alert(translations.fileTooLarge);
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      onUpload(base64);
    };
    reader.readAsDataURL(file);
  };

  const isUploaded = !!document?.file;

  return (
    <div className={`border rounded-lg p-4 ${isUploaded ? 'border-green-200 bg-green-50' : error ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <h4 className="text-sm font-medium text-gray-900">{label}</h4>
            {required && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{translations.required}</span>
            )}
            {!required && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{translations.optional}</span>
            )}
            {isUploaded && (
              <svg className="w-5 h-5 text-green-500 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>

        <div className="ml-4 flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {isUploaded ? (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                {translations.replace}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-sm text-red-600 hover:text-red-700"
              >
                {translations.remove}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {translations.upload}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
