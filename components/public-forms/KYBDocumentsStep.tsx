'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import type { KYBDocumentsData, DocumentData, BusinessDocumentPurpose, BusinessType } from '@/types/public-forms';

interface Props {
  data: Partial<KYBDocumentsData>;
  onChange: (data: Partial<KYBDocumentsData>) => void;
  errors?: Record<string, string>;
  businessType?: BusinessType;
  conductsMoneyServices?: boolean;
  hasWebsite?: boolean;
}

const DOCUMENT_PURPOSES: {
  purpose: BusinessDocumentPurpose;
  translationKey: string;
  required?: boolean;
  skipForSoleProp?: boolean;
  requiredForMoneyServices?: boolean;
}[] = [
  {
    purpose: 'business_formation',
    translationKey: 'business_formation',
    required: true,
    skipForSoleProp: true,
  },
  {
    purpose: 'ownership_information',
    translationKey: 'ownership_information',
    required: true,
    skipForSoleProp: true,
  },
  {
    purpose: 'ownership_chart',
    translationKey: 'ownership_chart',
    required: false,
  },
  {
    purpose: 'directors_registry',
    translationKey: 'directors_registry',
    required: false,
  },
  {
    purpose: 'evidence_of_good_standing',
    translationKey: 'certificate_of_good_standing',
    required: false,
  },
  {
    purpose: 'proof_of_nature_of_business',
    translationKey: 'proof_of_nature_of_business',
    required: false,
  },
  {
    purpose: 'proof_of_address',
    translationKey: 'proof_of_business_address',
    required: false,
  },
  {
    purpose: 'proof_of_source_of_funds',
    translationKey: 'proof_of_source_of_funds',
    required: false,
  },
  {
    purpose: 'proof_of_tax_identification',
    translationKey: 'proof_of_tax_identification',
    required: false,
  },
  {
    purpose: 'flow_of_funds',
    translationKey: 'flow_of_funds_diagram',
    required: false,
    requiredForMoneyServices: true,
  },
  {
    purpose: 'aml_comfort_letter',
    translationKey: 'aml_comfort_letter',
    required: false,
  },
];

export default function KYBDocumentsStep({ data, onChange, errors, businessType, conductsMoneyServices = false, hasWebsite = true }: Props) {
  const t = useTranslations('kybDocuments');
  const documents = data.documents || [];
  const isSoleProp = businessType === 'sole_prop';

  const getDocumentByPurpose = (purpose: BusinessDocumentPurpose) => {
    return documents.find((doc) => doc.purposes.includes(purpose));
  };

  const updateDocument = (purpose: BusinessDocumentPurpose, file: string | null) => {
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

  // Determine which documents are required based on conditions
  const isDocRequired = (dt: typeof DOCUMENT_PURPOSES[0]) => {
    if (dt.required && !(isSoleProp && dt.skipForSoleProp)) return true;
    if (dt.requiredForMoneyServices && conductsMoneyServices) return true;
    if (dt.purpose === 'proof_of_nature_of_business' && !hasWebsite) return true;
    return false;
  };

  const visibleDocTypes = DOCUMENT_PURPOSES.filter((dt) => !(isSoleProp && dt.skipForSoleProp));

  const hasRequiredDocs = visibleDocTypes
    .filter((dt) => isDocRequired(dt))
    .every((dt) => getDocumentByPurpose(dt.purpose));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Requirements Info */}
      <div className={`border rounded-lg p-4 ${hasRequiredDocs ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-start">
          <svg
            className={`w-5 h-5 mr-2 flex-shrink-0 ${hasRequiredDocs ? 'text-green-600' : 'text-yellow-600'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            {hasRequiredDocs ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            )}
          </svg>
          <div>
            <p className={`text-sm font-medium ${hasRequiredDocs ? 'text-green-800' : 'text-yellow-800'}`}>
              {hasRequiredDocs ? t('requiredUploaded') : t('pleaseUpload')}
            </p>
            {!isSoleProp && (
              <p className={`text-sm ${hasRequiredDocs ? 'text-green-700' : 'text-yellow-700'}`}>
                {t('requiredDocs')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Document Upload Cards */}
      <div className="space-y-4">
        {visibleDocTypes.map((docType) => (
          <DocumentUploadCard
            key={docType.purpose}
            purpose={docType.purpose}
            translationKey={docType.translationKey}
            required={isDocRequired(docType)}
            document={getDocumentByPurpose(docType.purpose)}
            onUpload={(file) => updateDocument(docType.purpose, file)}
            onRemove={() => updateDocument(docType.purpose, null)}
            error={errors?.[`documents.${docType.purpose}`]}
          />
        ))}
      </div>

      {/* Tips */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">{t('tips')}</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• {t('tipClear')}</li>
          <li>• {t('tipRecent')}</li>
          <li>• {t('tipComplete')}</li>
          <li>• {t('tipMatch')}</li>
        </ul>
      </div>
    </div>
  );
}

interface DocumentUploadCardProps {
  purpose: BusinessDocumentPurpose;
  translationKey: string;
  required: boolean;
  document?: DocumentData;
  onUpload: (file: string) => void;
  onRemove: () => void;
  error?: string;
}

function DocumentUploadCard({
  translationKey,
  required,
  document,
  onUpload,
  onRemove,
  error,
}: DocumentUploadCardProps) {
  const t = useTranslations('kybDocuments');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert(t('invalidFileType'));
      return;
    }

    // Validate file size (24MB max)
    if (file.size > 24 * 1024 * 1024) {
      alert(t('fileTooLarge'));
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
  const label = t(`types.${translationKey}.label`);
  const description = t(`types.${translationKey}.description`);

  return (
    <div className={`border rounded-lg p-4 ${isUploaded ? 'border-green-200 bg-green-50' : error ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <h4 className="text-sm font-medium text-gray-900">{label}</h4>
            {required && (
              <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{t('required')}</span>
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
                {t('replace')}
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="text-sm text-red-600 hover:text-red-700"
              >
                {t('remove')}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {t('upload')}
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
