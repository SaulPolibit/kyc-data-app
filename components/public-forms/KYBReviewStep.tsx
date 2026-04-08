'use client';

import { useTranslations } from 'next-intl';
import type { KYBFormData } from '@/types/public-forms';
import {
  COUNTRIES,
  getSubdivisions,
} from '@/types/public-forms';

interface Props {
  data: Partial<KYBFormData>;
  onEdit: (step: number) => void;
}

export default function KYBReviewStep({ data, onEdit }: Props) {
  const t = useTranslations('kybReviewStep');
  const tOptions = useTranslations('formOptions');
  const tCommon = useTranslations('common');
  const getCountryName = (code?: string) => {
    if (!code) return '-';
    return COUNTRIES.find((c) => c.code === code)?.name || code;
  };

  const getSubdivisionName = (country?: string, subdivision?: string) => {
    if (!subdivision) return '';
    const subdivisions = getSubdivisions(country || 'USA');
    return subdivisions.find((s) => s.code === subdivision)?.name || subdivision;
  };

  const formatAddress = (addr?: typeof data.registered_address) => {
    if (!addr) return '-';
    const parts = [
      addr.street_line_1,
      addr.street_line_2,
      [addr.city, getSubdivisionName(addr.country, addr.subdivision), addr.postal_code].filter(Boolean).join(', '),
      getCountryName(addr.country),
    ].filter(Boolean);
    return parts.join('\n');
  };

  const taxId = data.identifying_information?.[0];
  const persons = data.associated_persons || [];
  const documents = data.documents || [];

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

      {/* Business Information */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('businessInformation')}</h3>
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
              <span className="text-sm text-gray-500">{t('legalBusinessName')}</span>
              <p className="font-medium text-gray-900">{data.business_legal_name || '-'}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('tradeName')}</span>
              <p className="font-medium text-gray-900">{data.business_trade_name || '-'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-500">{t('businessType')}</span>
              <p className="font-medium text-gray-900">
                {data.business_type ? tOptions(`businessType.${data.business_type}`) : '-'}
                {data.is_dao && ' (DAO)'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-500">{t('website')}</span>
              <p className="font-medium text-gray-900">{data.primary_website || '-'}</p>
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
          {data.business_description && (
            <div>
              <span className="text-sm text-gray-500">{t('description')}</span>
              <p className="font-medium text-gray-900">{data.business_description}</p>
            </div>
          )}
          <div className="border-t border-gray-100 pt-3 mt-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{t('taxId')}</span>
                <p className="font-medium text-gray-900">
                  {taxId ? `${tOptions(`idTypes.${taxId.type}`)} - ${maskId(taxId.number)}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('estimatedAnnualRevenue')}</span>
                <p className="font-medium text-gray-900">
                  {data.estimated_annual_revenue ? tOptions(`annualRevenue.${data.estimated_annual_revenue}`) : '-'}
                </p>
              </div>
            </div>
          </div>
          {(data.account_purpose || data.source_of_funds) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">{t('accountPurpose')}</span>
                <p className="font-medium text-gray-900">
                  {data.account_purpose === 'other'
                    ? data.account_purpose_other
                    : data.account_purpose
                    ? tOptions(`accountPurpose.${data.account_purpose}`)
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-sm text-gray-500">{t('sourceOfFunds')}</span>
                <p className="font-medium text-gray-900">
                  {data.source_of_funds ? tOptions(`sourceOfFunds.${data.source_of_funds}`) : '-'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Addresses */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('businessAddresses')}</h3>
          <button
            type="button"
            onClick={() => onEdit(2)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <span className="text-sm text-gray-500">{t('registeredAddress')}</span>
            <p className="font-medium text-gray-900 whitespace-pre-line mt-1">
              {formatAddress(data.registered_address)}
            </p>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <span className="text-sm text-gray-500">{t('physicalAddress')}</span>
            <p className="font-medium text-gray-900 whitespace-pre-line mt-1">
              {data.same_as_registered ? t('sameAsRegistered') : formatAddress(data.physical_address)}
            </p>
          </div>
        </div>
      </div>

      {/* Beneficial Owners */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('beneficialOwners')}</h3>
          <button
            type="button"
            onClick={() => onEdit(3)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4">
          {persons.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('noPersonsAdded')}</p>
          ) : (
            <div className="space-y-4">
              {persons.map((person, index) => {
                const roles = [
                  person.has_ownership && `${t('owner')}${person.ownership_percentage ? ` (${person.ownership_percentage}%)` : ''}`,
                  person.has_control && t('controlPerson'),
                  person.is_signer && t('signer'),
                  person.is_director && t('director'),
                ].filter(Boolean);

                return (
                  <div
                    key={index}
                    className={`flex items-center justify-between ${index > 0 ? 'border-t border-gray-100 pt-4' : ''}`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {person.first_name} {person.last_name}
                        {person.title && <span className="text-gray-500 font-normal"> - {person.title}</span>}
                      </p>
                      <p className="text-sm text-gray-500">{roles.join(' • ')}</p>
                    </div>
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Documents */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-medium text-gray-900">{t('businessDocuments')}</h3>
          <button
            type="button"
            onClick={() => onEdit(4)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {tCommon('edit')}
          </button>
        </div>
        <div className="p-4">
          {documents.length === 0 ? (
            <p className="text-gray-500 text-sm">{t('noDocumentsUploaded')}</p>
          ) : (
            <ul className="space-y-2">
              {documents.map((doc, index) => (
                <li key={index} className="flex items-center">
                  <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm text-gray-700 capitalize">
                    {doc.purposes.map((p) => p.replace(/_/g, ' ')).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
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
          <li>{t('confirmAuthorized')}</li>
          <li>{t('confirmVerification')}</li>
          <li>{t('confirmTerms')}</li>
        </ul>
      </div>
    </div>
  );
}
