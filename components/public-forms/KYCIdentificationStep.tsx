'use client';

import { useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import type {
  KYCIdentificationData,
  IdentificationData,
  IdentificationType,
} from '@/types/public-forms';
import { COUNTRIES } from '@/types/public-forms';

interface Props {
  data: Partial<KYCIdentificationData>;
  onChange: (data: Partial<KYCIdentificationData>) => void;
  errors?: Record<string, string>;
  country?: string;
}

const TAX_ID_TYPES: IdentificationType[] = ['ssn', 'itin', 'sin', 'curp', 'rfc', 'cpf', 'nif', 'nie', 'codice_fiscale', 'nino', 'tfn', 'pan'];
const GOVT_ID_TYPES: IdentificationType[] = ['passport', 'drivers_license', 'national_id', 'nric', 'fin', 'hkid'];

// Get recommended ID type based on country
function getRecommendedTaxId(country: string): IdentificationType {
  const countryToId: Record<string, IdentificationType> = {
    USA: 'ssn',
    CAN: 'sin',
    MEX: 'rfc',
    BRA: 'cpf',
    ESP: 'nif',
    ITA: 'codice_fiscale',
    GBR: 'nino',
    AUS: 'tfn',
    IND: 'pan',
    SGP: 'nric',
    HKG: 'hkid',
  };
  return countryToId[country] || 'national_id';
}

export default function KYCIdentificationStep({ data, onChange, errors, country = 'USA' }: Props) {
  const t = useTranslations('identification');
  const tOptions = useTranslations('formOptions');
  const [activeTab, setActiveTab] = useState<'tax' | 'govt'>('tax');
  const fileInputFrontRef = useRef<HTMLInputElement>(null);
  const fileInputBackRef = useRef<HTMLInputElement>(null);

  const ids = data.identifying_information || [];
  const taxId = ids.find((id) => TAX_ID_TYPES.includes(id.type));
  const govtId = ids.find((id) => GOVT_ID_TYPES.includes(id.type) || id.type === 'other');

  const updateTaxId = (field: keyof IdentificationData, value: unknown) => {
    const newTaxId: IdentificationData = {
      ...taxId,
      type: taxId?.type || getRecommendedTaxId(country),
      issuing_country: taxId?.issuing_country || country,
      [field]: value,
    };

    const newIds = ids.filter((id) => !TAX_ID_TYPES.includes(id.type));
    if (newTaxId.number || newTaxId.type) {
      newIds.push(newTaxId);
    }
    onChange({ identifying_information: newIds });
  };

  const updateGovtId = (field: keyof IdentificationData, value: unknown) => {
    const newGovtId: IdentificationData = {
      ...govtId,
      type: govtId?.type || 'passport',
      issuing_country: govtId?.issuing_country || country,
      [field]: value,
    };

    const newIds = ids.filter((id) => !GOVT_ID_TYPES.includes(id.type) && id.type !== 'other');
    if (newGovtId.type) {
      newIds.push(newGovtId);
    }
    onChange({ identifying_information: newIds });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_front' | 'image_back') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert(t('invalidFileType'));
      return;
    }

    // Validate file size (15MB max)
    if (file.size > 15 * 1024 * 1024) {
      alert(t('fileTooLarge'));
      return;
    }

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      updateGovtId(field, base64);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            type="button"
            onClick={() => setActiveTab('tax')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'tax'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('taxIdTab')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('govt')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'govt'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {t('governmentIdTab')}
          </button>
        </nav>
      </div>

      {/* Tax ID Section */}
      {activeTab === 'tax' && (
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {t('taxIdDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('idType')} <span className="text-red-500">*</span>
              </label>
              <select
                value={taxId?.type || getRecommendedTaxId(country)}
                onChange={(e) => updateTaxId('type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {TAX_ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tOptions(`idTypes.${type}`)}
                  </option>
                ))}
                <option value="other">{tOptions('idTypes.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('issuingCountry')} <span className="text-red-500">*</span>
              </label>
              <select
                value={taxId?.issuing_country || country}
                onChange={(e) => updateTaxId('issuing_country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('idNumber')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={taxId?.number || ''}
              onChange={(e) => updateTaxId('number', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors?.tax_id ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder={taxId?.type === 'ssn' ? t('ssnPlaceholder') : t('idNumberPlaceholder')}
            />
            {errors?.tax_id && (
              <p className="mt-1 text-sm text-red-500">{errors.tax_id}</p>
            )}
          </div>

          {taxId?.type === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('idDescription')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taxId?.description || ''}
                onChange={(e) => updateTaxId('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('idDescriptionPlaceholder')}
              />
            </div>
          )}
        </div>
      )}

      {/* Government ID Section */}
      {activeTab === 'govt' && (
        <div className="space-y-4 pt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              {t('governmentIdDescription')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('idType')} <span className="text-red-500">*</span>
              </label>
              <select
                value={govtId?.type || 'passport'}
                onChange={(e) => updateGovtId('type', e.target.value as IdentificationType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {GOVT_ID_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {tOptions(`idTypes.${type}`)}
                  </option>
                ))}
                <option value="other">{tOptions('idTypes.other')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('issuingCountry')} <span className="text-red-500">*</span>
              </label>
              <select
                value={govtId?.issuing_country || country}
                onChange={(e) => updateGovtId('issuing_country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('optionalIdNumber')}
              </label>
              <input
                type="text"
                value={govtId?.number || ''}
                onChange={(e) => updateGovtId('number', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('idNumberPlaceholder')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('expirationDate')}
              </label>
              <input
                type="date"
                value={govtId?.expiration || ''}
                onChange={(e) => updateGovtId('expiration', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('frontOfId')} <span className="text-red-500">*</span>
              </label>
              <input
                ref={fileInputFrontRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleFileUpload(e, 'image_front')}
                className="hidden"
              />
              <div
                onClick={() => fileInputFrontRef.current?.click()}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  govtId?.image_front ? 'border-green-500 bg-green-50' : errors?.image_front ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                {govtId?.image_front ? (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-green-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-600">{t('uploaded')}</span>
                    <p className="text-xs text-gray-500 mt-1">{t('clickToReplace')}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500">{t('uploadFront')}</span>
                  </div>
                )}
              </div>
              {errors?.image_front && (
                <p className="mt-1 text-sm text-red-500">{errors.image_front}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('backOfId')}
              </label>
              <input
                ref={fileInputBackRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => handleFileUpload(e, 'image_back')}
                className="hidden"
              />
              <div
                onClick={() => fileInputBackRef.current?.click()}
                className={`w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors ${
                  govtId?.image_back ? 'border-green-500 bg-green-50' : 'border-gray-300'
                }`}
              >
                {govtId?.image_back ? (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-green-500 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-green-600">{t('uploaded')}</span>
                    <p className="text-xs text-gray-500 mt-1">{t('clickToReplace')}</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <svg className="w-8 h-8 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-500">{t('uploadBack')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">{t('providedIds')}</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          {taxId?.number && (
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('taxId')} ({tOptions(`idTypes.${taxId.type}`)})
            </li>
          )}
          {govtId?.image_front && (
            <li className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t('governmentId')} ({tOptions(`idTypes.${govtId.type}`)})
            </li>
          )}
          {!taxId?.number && !govtId?.image_front && (
            <li className="text-gray-400">{t('noIdProvided')}</li>
          )}
        </ul>
      </div>
    </div>
  );
}
