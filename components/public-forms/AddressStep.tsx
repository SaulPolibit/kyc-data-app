'use client';

import { useTranslations } from 'next-intl';
import type { AddressData } from '@/types/public-forms';
import { COUNTRIES, getSubdivisions } from '@/types/public-forms';

interface Props {
  data: Partial<AddressData>;
  onChange: (data: Partial<AddressData>) => void;
  errors?: Record<string, string>;
  title?: string;
  description?: string;
  prefix?: string;
}

export default function AddressStep({
  data,
  onChange,
  errors,
  title,
  description,
  prefix = '',
}: Props) {
  const t = useTranslations('addressForm');
  const displayTitle = title || t('title');
  const displayDescription = description || t('description');

  const updateField = <K extends keyof AddressData>(field: K, value: AddressData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const country = data.country || 'USA';
  const subdivisions = getSubdivisions(country);
  const hasSubdivisions = subdivisions.length > 0;

  const getFieldError = (field: string) => {
    return errors?.[prefix ? `${prefix}.${field}` : field] || errors?.[field];
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{displayTitle}</h2>
        <p className="text-sm text-gray-500 mb-6">{displayDescription}</p>
      </div>

      {/* Country */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('country')} <span className="text-red-500">*</span>
        </label>
        <select
          value={country}
          onChange={(e) => {
            // Update country and reset subdivision in single call
            onChange({ ...data, country: e.target.value, subdivision: '' });
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getFieldError('country') ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {getFieldError('country') && (
          <p className="mt-1 text-sm text-red-500">{getFieldError('country')}</p>
        )}
      </div>

      {/* Street Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('streetAddress')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.street_line_1 || ''}
          onChange={(e) => updateField('street_line_1', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getFieldError('street_line_1') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('streetPlaceholder')}
        />
        {getFieldError('street_line_1') && (
          <p className="mt-1 text-sm text-red-500">{getFieldError('street_line_1')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('streetAddress2')}
        </label>
        <input
          type="text"
          value={data.street_line_2 || ''}
          onChange={(e) => updateField('street_line_2', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('streetPlaceholder2')}
        />
      </div>

      {/* City and State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('city')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.city || ''}
            onChange={(e) => updateField('city', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              getFieldError('city') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('cityPlaceholder')}
          />
          {getFieldError('city') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError('city')}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('stateProvince')} {hasSubdivisions && <span className="text-red-500">*</span>}
          </label>
          {hasSubdivisions ? (
            <select
              value={data.subdivision || ''}
              onChange={(e) => updateField('subdivision', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                getFieldError('subdivision') ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('selectStateProvince')}</option>
              {subdivisions.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={data.subdivision || ''}
              onChange={(e) => updateField('subdivision', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('statePlaceholder')}
              maxLength={3}
            />
          )}
          {getFieldError('subdivision') && (
            <p className="mt-1 text-sm text-red-500">{getFieldError('subdivision')}</p>
          )}
        </div>
      </div>

      {/* Postal Code */}
      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('postalCode')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.postal_code || ''}
          onChange={(e) => updateField('postal_code', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getFieldError('postal_code') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('postalCodePlaceholder')}
        />
        {getFieldError('postal_code') && (
          <p className="mt-1 text-sm text-red-500">{getFieldError('postal_code')}</p>
        )}
      </div>

      {/* PO Box Warning */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-yellow-800">
            {t('poBoxWarning')}
          </p>
        </div>
      </div>
    </div>
  );
}
