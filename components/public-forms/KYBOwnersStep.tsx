'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { KYBOwnersData, AssociatedPersonData, AddressData, IdentificationData } from '@/types/public-forms';
import { COUNTRIES, getSubdivisions } from '@/types/public-forms';

interface Props {
  data: Partial<KYBOwnersData>;
  onChange: (data: Partial<KYBOwnersData>) => void;
  errors?: Record<string, string>;
  ownershipThreshold?: number;
}

const emptyPerson: AssociatedPersonData = {
  first_name: '',
  last_name: '',
  email: '',
  birth_date: '',
  residential_address: {
    street_line_1: '',
    city: '',
    postal_code: '',
    country: 'USA',
  },
  identifying_information: [],
  has_ownership: false,
  has_control: false,
  is_signer: false,
};

export default function KYBOwnersStep({ data, onChange, errors, ownershipThreshold = 25 }: Props) {
  const t = useTranslations('kybOwners');
  const tOptions = useTranslations('formOptions');
  const persons = data.associated_persons || [];
  const [expandedIndex, setExpandedIndex] = useState<number | null>(persons.length === 0 ? null : 0);

  const addPerson = () => {
    const newPersons = [...persons, { ...emptyPerson }];
    onChange({ associated_persons: newPersons });
    setExpandedIndex(newPersons.length - 1);
  };

  const removePerson = (index: number) => {
    const newPersons = persons.filter((_, i) => i !== index);
    onChange({ associated_persons: newPersons });
    if (expandedIndex === index) {
      setExpandedIndex(newPersons.length > 0 ? 0 : null);
    } else if (expandedIndex !== null && expandedIndex > index) {
      setExpandedIndex(expandedIndex - 1);
    }
  };

  const updatePerson = (index: number, updates: Partial<AssociatedPersonData>) => {
    const newPersons = [...persons];
    newPersons[index] = { ...newPersons[index], ...updates };
    onChange({ associated_persons: newPersons });
  };

  const hasControlPerson = persons.some((p) => p.has_control);
  const hasSigner = persons.some((p) => p.is_signer);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle', { threshold: ownershipThreshold })}
        </p>
      </div>

      {/* Requirements Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 mb-2">{t('requirements')}</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${hasControlPerson ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {t('requireControlPerson')}
          </li>
          <li className="flex items-center">
            <span className={`w-2 h-2 rounded-full mr-2 ${hasSigner ? 'bg-green-500' : 'bg-red-500'}`}></span>
            {t('requireSigner')}
          </li>
          <li className="flex items-center">
            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
            {t('requireOwners', { threshold: ownershipThreshold })}
          </li>
        </ul>
      </div>

      {/* Person Cards */}
      <div className="space-y-4">
        {persons.map((person, index) => (
          <PersonCard
            key={index}
            person={person}
            index={index}
            expanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? null : index)}
            onChange={(updates) => updatePerson(index, updates)}
            onRemove={() => removePerson(index)}
            errors={errors}
            canRemove={persons.length > 1}
          />
        ))}
      </div>

      {/* Add Person Button */}
      <button
        type="button"
        onClick={addPerson}
        className="w-full py-3 px-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {t('addAnother')}
      </button>

      {persons.length === 0 && (
        <p className="text-center text-gray-500 text-sm">
          {t('clickToAdd')}
        </p>
      )}
    </div>
  );
}

interface PersonCardProps {
  person: AssociatedPersonData;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (updates: Partial<AssociatedPersonData>) => void;
  onRemove: () => void;
  errors?: Record<string, string>;
  canRemove: boolean;
}

function PersonCard({ person, index, expanded, onToggle, onChange, onRemove, errors, canRemove }: PersonCardProps) {
  const t = useTranslations('kybOwners');
  const tOptions = useTranslations('formOptions');
  const getError = (field: string) => errors?.[`associated_persons.${index}.${field}`];

  const updateAddress = (updates: Partial<AddressData>) => {
    onChange({
      residential_address: { ...person.residential_address, ...updates },
    });
  };

  const updateId = (updates: Partial<IdentificationData>) => {
    const currentId = person.identifying_information?.[0] || { type: 'ssn' as const, issuing_country: 'USA' };
    onChange({
      identifying_information: [{ ...currentId, ...updates }],
    });
  };

  const taxId = person.identifying_information?.[0];
  const country = person.residential_address?.country || 'USA';
  const subdivisions = getSubdivisions(country);

  const ownerLabel = t('beneficialOwner');
  const roles = [
    person.has_ownership && `${ownerLabel}${person.ownership_percentage ? ` (${person.ownership_percentage}%)` : ''}`,
    person.has_control && t('controlPerson'),
    person.is_signer && t('authorizedSigner'),
    person.is_director && t('boardDirector'),
  ].filter(Boolean);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={onToggle}
      >
        <div className="flex items-center">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium mr-3">
            {index + 1}
          </div>
          <div>
            <h4 className="font-medium text-gray-900">
              {person.first_name || person.last_name
                ? `${person.first_name} ${person.last_name}`.trim()
                : `Person ${index + 1}`}
            </h4>
            {roles.length > 0 && (
              <p className="text-sm text-gray-500">{roles.join(' • ')}</p>
            )}
          </div>
        </div>
        <div className="flex items-center">
          {canRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="p-1 text-gray-400 hover:text-red-500 mr-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-6">
          {/* Roles */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('rolesResponsibilities')}</label>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={person.has_ownership}
                  onChange={(e) => onChange({ has_ownership: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <span className="ml-2">
                  <span className="text-sm text-gray-700">{t('beneficialOwner')}</span>
                  <span className="block text-xs text-gray-500">{t('ownsPercent')}</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={person.has_control}
                  onChange={(e) => onChange({ has_control: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <span className="ml-2">
                  <span className="text-sm text-gray-700">{t('controlPerson')}</span>
                  <span className="block text-xs text-gray-500">{t('officerDirector')}</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={person.is_signer}
                  onChange={(e) => onChange({ is_signer: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <span className="ml-2">
                  <span className="text-sm text-gray-700">{t('authorizedSigner')}</span>
                  <span className="block text-xs text-gray-500">{t('canAuthorize')}</span>
                </span>
              </label>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={person.is_director || false}
                  onChange={(e) => onChange({ is_director: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
                />
                <span className="ml-2">
                  <span className="text-sm text-gray-700">{t('boardDirector')}</span>
                  <span className="block text-xs text-gray-500">{t('boardMember')}</span>
                </span>
              </label>
            </div>
          </div>

          {/* Ownership Percentage */}
          {person.has_ownership && (
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('ownershipPercentage')}
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={person.ownership_percentage || ''}
                  onChange={(e) => onChange({ ownership_percentage: parseInt(e.target.value) || undefined })}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25"
                />
                <span className="ml-2 text-gray-500">%</span>
              </div>
            </div>
          )}

          {/* Title (required for control persons) */}
          {person.has_control && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('titlePosition')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={person.title || ''}
                onChange={(e) => onChange({ title: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  getError('title') ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('titlePlaceholder')}
              />
              {getError('title') && (
                <p className="mt-1 text-sm text-red-500">{getError('title')}</p>
              )}
            </div>
          )}

          {/* Personal Info */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">{t('personalInfo')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={person.first_name}
                  onChange={(e) => onChange({ first_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('first_name') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={person.last_name}
                  onChange={(e) => onChange({ last_name: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('last_name') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={person.email}
                  onChange={(e) => onChange({ email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('email') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dateOfBirth')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={person.birth_date}
                  onChange={(e) => onChange({ birth_date: e.target.value })}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    getError('birth_date') ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('phone')}</label>
              <input
                type="tel"
                value={person.phone || ''}
                onChange={(e) => onChange({ phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('phonePlaceholder')}
              />
            </div>
          </div>

          {/* Tax ID */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">{t('taxIdentification')}</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('idType')}</label>
                <select
                  value={taxId?.type || 'ssn'}
                  onChange={(e) => updateId({ type: e.target.value as IdentificationData['type'] })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ssn">{t('ssn')}</option>
                  <option value="itin">{t('itin')}</option>
                  <option value="passport">{t('passport')}</option>
                  <option value="drivers_license">{t('driversLicense')}</option>
                  <option value="national_id">{t('nationalId')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('issuingCountry')}</label>
                <select
                  value={taxId?.issuing_country || 'USA'}
                  onChange={(e) => updateId({ issuing_country: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {tOptions(`idTypes.${taxId?.type || 'ssn'}`)} {t('idNumber')}
                </label>
                <input
                  type="text"
                  value={taxId?.number || ''}
                  onChange={(e) => updateId({ number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('idPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="border-t border-gray-200 pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-4">{t('residentialAddress')}</h5>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('country')}</label>
                <select
                  value={country}
                  onChange={(e) => updateAddress({ country: e.target.value, subdivision: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('streetAddress')}</label>
                <input
                  type="text"
                  value={person.residential_address?.street_line_1 || ''}
                  onChange={(e) => updateAddress({ street_line_1: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('city')}</label>
                  <input
                    type="text"
                    value={person.residential_address?.city || ''}
                    onChange={(e) => updateAddress({ city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('stateProvince')}</label>
                  {subdivisions.length > 0 ? (
                    <select
                      value={person.residential_address?.subdivision || ''}
                      onChange={(e) => updateAddress({ subdivision: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">{t('selectState')}</option>
                      {subdivisions.map((s) => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={person.residential_address?.subdivision || ''}
                      onChange={(e) => updateAddress({ subdivision: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>
              </div>
              <div className="max-w-xs">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('postalCode')}</label>
                <input
                  type="text"
                  value={person.residential_address?.postal_code || ''}
                  onChange={(e) => updateAddress({ postal_code: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
