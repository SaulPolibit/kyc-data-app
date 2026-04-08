'use client';

import { useTranslations } from 'next-intl';
import type { KYCFormData } from '@/types/public-forms';
import {
  COUNTRIES,
  getSubdivisions,
} from '@/types/public-forms';

interface Props {
  data: Partial<KYCFormData>;
  onEdit: (step: number) => void;
}

export default function KYCReviewStep({ data, onEdit }: Props) {
  const t = useTranslations('reviewStep');
  const tOptions = useTranslations('formOptions');
  const tDocs = useTranslations('documents.types');
  const tCommon = useTranslations('common');
  const getCountryName = (code?: string) => {
    if (!code) return '-';
    return COUNTRIES.find((c) => c.code === code)?.name || code;
  };

  const formatDocumentPurpose = (purpose: string) => {
    try {
      return tDocs(`${purpose}.label`);
    } catch {
      return purpose.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
  };

  const getSubdivisionName = (country?: string, subdivision?: string) => {
    if (!subdivision) return '';
    const subdivisions = getSubdivisions(country || 'USA');
    return subdivisions.find((s) => s.code === subdivision)?.name || subdivision;
  };

  const getAccountPurposeLabel = (purpose: string) => {
    try {
      return tOptions(`accountPurpose.${purpose}`);
    } catch {
      return purpose;
    }
  };

  const getEmploymentStatusLabel = (status: string) => {
    try {
      return tOptions(`employmentStatus.${status}`);
    } catch {
      return status;
    }
  };

  const getSourceOfFundsLabel = (source: string) => {
    try {
      return tOptions(`sourceOfFunds.${source}`);
    } catch {
      return source;
    }
  };

  const getMonthlyVolumeLabel = (volume: string) => {
    try {
      return tOptions(`monthlyVolume.${volume}`);
    } catch {
      return volume;
    }
  };

  const formatAddress = (addr: typeof data.residential_address) => {
    if (!addr) return '-';
    const parts = [
      addr.street_line_1,
      addr.street_line_2,
      [addr.city, getSubdivisionName(addr.country, addr.subdivision), addr.postal_code].filter(Boolean).join(', '),
      getCountryName(addr.country),
    ].filter(Boolean);
    return parts.join('\n');
  };

  const taxId = data.identifying_information?.find((id) =>
    ['ssn', 'itin', 'sin', 'curp', 'rfc', 'cpf', 'nif', 'nie', 'codice_fiscale', 'nino', 'tfn', 'pan'].includes(id.type)
  );

  const govtId = data.identifying_information?.find((id) =>
    ['passport', 'drivers_license', 'national_id', 'nric', 'fin', 'hkid', 'other'].includes(id.type)
  );

  const maskId = (id?: string) => {
    if (!id) return '-';
    if (id.length <= 4) return '****';
    return '*'.repeat(id.length - 4) + id.slice(-4);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Personal Information */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('personalInformation')}</h3>
          <button
            type="button"
            onClick={() => onEdit(1)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">{t('fullName')}</span>
              <p className="font-medium text-gray-900">
                {[data.first_name, data.middle_name, data.last_name].filter(Boolean).join(' ') || '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('dateOfBirth')}</span>
              <p className="font-medium text-gray-900">{data.birth_date || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">{t('email')}</span>
              <p className="font-medium text-gray-900">{data.email || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('phone')}</span>
              <p className="font-medium text-gray-900">{data.phone || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">{t('nationality')}</span>
              <p className="font-medium text-gray-900">{getCountryName(data.nationality)}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('employmentStatus')}</span>
              <p className="font-medium text-gray-900">
                {data.employment_status ? getEmploymentStatusLabel(data.employment_status) : '-'}
              </p>
            </div>
          </div>
          {data.account_purpose && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{t('accountPurpose')}</span>
                <p className="font-medium text-gray-900">
                  {data.account_purpose === 'other'
                    ? data.account_purpose_other
                    : getAccountPurposeLabel(data.account_purpose)}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('sourceOfFunds')}</span>
                <p className="font-medium text-gray-900">
                  {data.source_of_funds ? getSourceOfFundsLabel(data.source_of_funds) : '-'}
                </p>
              </div>
            </div>
          )}
          {data.expected_monthly_payments && (
            <div>
              <span className="text-sm text-gray-500">{t('expectedMonthlyVolume')}</span>
              <p className="font-medium text-gray-900">
                {getMonthlyVolumeLabel(data.expected_monthly_payments)}
              </p>
            </div>
          )}
          {data.most_recent_occupation && (
            <div>
              <span className="text-sm text-gray-500">{t('occupation')}</span>
              <p className="font-medium text-gray-900">{data.most_recent_occupation}</p>
            </div>
          )}
          {data.acting_as_intermediary && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-2">
              <p className="text-sm text-yellow-800">
                {t('actingAsIntermediary')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Identification */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('identification')}</h3>
          <button
            type="button"
            onClick={() => onEdit(2)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4 space-y-3">
          {taxId && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <span className="text-sm text-gray-500">{t('taxId')}</span>
                <p className="font-medium text-gray-900">
                  {tOptions(`idTypes.${taxId.type}`)} - {maskId(taxId.number)}
                </p>
              </div>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          )}
          {govtId && (
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-gray-500">{t('governmentId')}</span>
                <p className="font-medium text-gray-900">
                  {tOptions(`idTypes.${govtId.type}`)}
                  {govtId.issuing_country && ` (${getCountryName(govtId.issuing_country)})`}
                </p>
              </div>
              <div className="flex items-center">
                {govtId.image_front && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded mr-2">
                    {t('frontUploaded')}
                  </span>
                )}
                {govtId.image_back && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                    {t('backUploaded')}
                  </span>
                )}
              </div>
            </div>
          )}
          {!taxId && !govtId && (
            <p className="text-gray-500 text-sm">{t('noIdProvided')}</p>
          )}
        </div>
      </div>

      {/* Address */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('residentialAddress')}</h3>
          <button
            type="button"
            onClick={() => onEdit(3)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4">
          <p className="font-medium text-gray-900 whitespace-pre-line">
            {formatAddress(data.residential_address)}
          </p>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('supportingDocuments')}</h3>
          <button
            type="button"
            onClick={() => onEdit(4)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4">
          {data.documents && data.documents.length > 0 ? (
            <div className="space-y-2">
              {data.documents.map((doc, index) => (
                <div key={index} className="flex items-center py-2 border-b border-gray-100 last:border-0">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-900">
                    {doc.purposes.map((p) => formatDocumentPurpose(p)).join(', ')}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t('noDocumentsUploaded')}</p>
          )}
        </div>
      </div>

      {/* Consent */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          {t('byClickingSubmit')}
        </p>
        <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>{t('confirmAccurate')}</li>
          <li>{t('confirmAuthorize')}</li>
          <li>{t('confirmTerms')}</li>
        </ul>
      </div>
    </div>
  );
}
