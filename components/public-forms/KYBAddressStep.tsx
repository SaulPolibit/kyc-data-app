'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import type { KYBAddressData, AddressData } from '@/types/public-forms';
import { COUNTRIES, getSubdivisions } from '@/types/public-forms';

interface Props {
  data: Partial<KYBAddressData>;
  onChange: (data: Partial<KYBAddressData>) => void;
  errors?: Record<string, string>;
}

function AddressFields({
  data,
  onChange,
  errors,
  prefix,
  title,
  description,
}: {
  data: Partial<AddressData>;
  onChange: (data: Partial<AddressData>) => void;
  errors?: Record<string, string>;
  prefix: string;
  title: string;
  description: string;
}) {
  const t = useTranslations('kybAddress');
  const updateField = <K extends keyof AddressData>(field: K, value: AddressData[K]) => {
    onChange({ ...data, [field]: value });
  };

  const country = data.country || 'USA';
  const subdivisions = getSubdivisions(country);
  const hasSubdivisions = subdivisions.length > 0;

  const getError = (field: string) => errors?.[`${prefix}.${field}`] || errors?.[field];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-md font-medium text-gray-900 mb-1">{title}</h3>
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('country')} <span className="text-red-500">*</span>
        </label>
        <select
          value={country}
          onChange={(e) => {
            // Update both fields in a single call to avoid state race condition
            onChange({ ...data, country: e.target.value, subdivision: '' });
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getError('country') ? 'border-red-500' : 'border-gray-300'
          }`}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('streetAddress')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.street_line_1 || ''}
          onChange={(e) => updateField('street_line_1', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getError('street_line_1') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('streetPlaceholder')}
        />
        {getError('street_line_1') && (
          <p className="mt-1 text-sm text-red-500">{getError('street_line_1')}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('streetLine2')}
        </label>
        <input
          type="text"
          value={data.street_line_2 || ''}
          onChange={(e) => updateField('street_line_2', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('suitePlaceholder')}
        />
      </div>

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
              getError('city') ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('cityPlaceholder')}
          />
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
                getError('subdivision') ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">{t('selectState')}</option>
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
              placeholder={t('provincePlaceholder')}
              maxLength={3}
            />
          )}
        </div>
      </div>

      <div className="max-w-xs">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('postalCode')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.postal_code || ''}
          onChange={(e) => updateField('postal_code', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            getError('postal_code') ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('postalPlaceholder')}
        />
      </div>
    </div>
  );
}

export default function KYBAddressStep({ data, onChange, errors }: Props) {
  const t = useTranslations('kybAddress');
  const [sameAsRegistered, setSameAsRegistered] = useState(data.same_as_registered ?? false);

  useEffect(() => {
    if (sameAsRegistered && data.registered_address) {
      onChange({
        ...data,
        physical_address: { ...data.registered_address },
        same_as_registered: true,
      });
    }
  }, [sameAsRegistered, data.registered_address]);

  const updateRegisteredAddress = (addr: Partial<AddressData>) => {
    const newData: Partial<KYBAddressData> = {
      ...data,
      registered_address: addr as AddressData,
    };
    if (sameAsRegistered) {
      newData.physical_address = addr as AddressData;
    }
    onChange(newData);
  };

  const updatePhysicalAddress = (addr: Partial<AddressData>) => {
    onChange({
      ...data,
      physical_address: addr as AddressData,
    });
  };

  const handleSameAsRegisteredChange = (checked: boolean) => {
    setSameAsRegistered(checked);
    onChange({
      ...data,
      same_as_registered: checked,
      physical_address: checked ? { ...data.registered_address } as AddressData : data.physical_address,
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Registered Address */}
      <AddressFields
        data={data.registered_address || {}}
        onChange={updateRegisteredAddress}
        errors={errors}
        prefix="registered_address"
        title={t('registeredAddress')}
        description={t('registeredHelp')}
      />

      {/* Same as registered checkbox */}
      <div className="border-t border-gray-200 pt-6">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={sameAsRegistered}
            onChange={(e) => handleSameAsRegisteredChange(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">
            {t('sameAsRegistered')}
          </span>
        </label>
      </div>

      {/* Physical Address */}
      {!sameAsRegistered && (
        <AddressFields
          data={data.physical_address || {}}
          onChange={updatePhysicalAddress}
          errors={errors}
          prefix="physical_address"
          title={t('physicalAddress')}
          description={t('physicalHelp')}
        />
      )}

      {/* Warning */}
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
