'use client';

import { useTranslations } from 'next-intl';
import type {
  KYCPersonalInfoData,
  IndividualAccountPurpose,
  EmploymentStatus,
  IndividualSourceOfFunds,
  ExpectedMonthlyPayments,
} from '@/types/public-forms';
import {
  COUNTRIES,
} from '@/types/public-forms';

interface Props {
  data: Partial<KYCPersonalInfoData>;
  onChange: (data: Partial<KYCPersonalInfoData>) => void;
  errors?: Record<string, string>;
}

export default function KYCPersonalInfoStep({ data, onChange, errors }: Props) {
  const t = useTranslations('personalInfo');
  const tOptions = useTranslations('formOptions');
  const updateField = <K extends keyof KYCPersonalInfoData>(
    field: K,
    value: KYCPersonalInfoData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const individualPurposes: IndividualAccountPurpose[] = [
    'personal_or_living_expenses',
    'receive_salary',
    'receive_payment_for_freelancing',
    'purchase_goods_and_services',
    'payments_to_friends_or_family_abroad',
    'investment_purposes',
    'protect_wealth',
    'charitable_donations',
    'operating_a_company',
    'ecommerce_retail_payments',
    'other',
  ];

  const employmentStatuses: EmploymentStatus[] = [
    'employed',
    'self_employed',
    'student',
    'retired',
    'homemaker',
    'unemployed',
  ];

  const sourcesOfFunds: IndividualSourceOfFunds[] = [
    'salary',
    'savings',
    'investments_loans',
    'pension_retirement',
    'inheritance',
    'gifts',
    'sale_of_assets_real_estate',
    'company_funds',
    'government_benefits',
    'ecommerce_reseller',
    'gambling_proceeds',
    'someone_elses_funds',
  ];

  const monthlyPayments: ExpectedMonthlyPayments[] = [
    '0_4999',
    '5000_9999',
    '10000_49999',
    '50000_plus',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">{t('subtitle')}</p>
      </div>

      {/* Name Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('firstName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.first_name || ''}
            onChange={(e) => updateField('first_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.first_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('firstNamePlaceholder')}
          />
          {errors?.first_name && (
            <p className="mt-1 text-sm text-red-500">{errors.first_name}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('lastName')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.last_name || ''}
            onChange={(e) => updateField('last_name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.last_name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('lastNamePlaceholder')}
          />
          {errors?.last_name && (
            <p className="mt-1 text-sm text-red-500">{errors.last_name}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('middleName')}
        </label>
        <input
          type="text"
          value={data.middle_name || ''}
          onChange={(e) => updateField('middle_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('middleNamePlaceholder')}
        />
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('email')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('emailPlaceholder')}
          />
          {errors?.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('phone')}
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('phonePlaceholder')}
          />
        </div>
      </div>

      {/* Date of Birth */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('dateOfBirth')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={data.birth_date || ''}
            onChange={(e) => updateField('birth_date', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.birth_date ? 'border-red-500' : 'border-gray-300'
            }`}
            max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
          />
          {errors?.birth_date && (
            <p className="mt-1 text-sm text-red-500">{errors.birth_date}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">{t('ageRequirement')}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('nationality')}
          </label>
          <select
            value={data.nationality || ''}
            onChange={(e) => updateField('nationality', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('selectCountry')}</option>
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('accountInformation')}</h3>
      </div>

      {/* Account Purpose */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('accountPurpose')}
        </label>
        <select
          value={data.account_purpose || ''}
          onChange={(e) => updateField('account_purpose', e.target.value as IndividualAccountPurpose)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('selectPurpose')}</option>
          {individualPurposes.map((purpose) => (
            <option key={purpose} value={purpose}>
              {tOptions(`accountPurpose.${purpose}`)}
            </option>
          ))}
        </select>
      </div>

      {data.account_purpose === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('pleaseSpecify')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.account_purpose_other || ''}
            onChange={(e) => updateField('account_purpose_other', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.account_purpose_other ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('describePurpose')}
          />
        </div>
      )}

      {/* Employment Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('employmentStatus')}
          </label>
          <select
            value={data.employment_status || ''}
            onChange={(e) => updateField('employment_status', e.target.value as EmploymentStatus)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('selectStatus')}</option>
            {employmentStatuses.map((status) => (
              <option key={status} value={status}>
                {tOptions(`employmentStatus.${status}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('sourceOfFunds')}
          </label>
          <select
            value={data.source_of_funds || ''}
            onChange={(e) => updateField('source_of_funds', e.target.value as IndividualSourceOfFunds)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{t('selectSource')}</option>
            {sourcesOfFunds.map((source) => (
              <option key={source} value={source}>
                {tOptions(`sourceOfFunds.${source}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expected Monthly Payments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('expectedMonthlyVolume')}
        </label>
        <select
          value={data.expected_monthly_payments || ''}
          onChange={(e) => updateField('expected_monthly_payments', e.target.value as ExpectedMonthlyPayments)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{t('selectRange')}</option>
          {monthlyPayments.map((range) => (
            <option key={range} value={range}>
              {tOptions(`monthlyVolume.${range}`)}
            </option>
          ))}
        </select>
      </div>

      {/* Occupation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('occupation')}
        </label>
        <input
          type="text"
          value={data.most_recent_occupation || ''}
          onChange={(e) => updateField('most_recent_occupation', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('occupationPlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-500">{t('occupationHelp')}</p>
      </div>

      {/* Acting as Intermediary */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-start">
          <input
            type="checkbox"
            id="acting_as_intermediary"
            checked={data.acting_as_intermediary || false}
            onChange={(e) => updateField('acting_as_intermediary', e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="acting_as_intermediary" className="ml-3">
            <span className="text-sm font-medium text-gray-700">{t('actingAsIntermediary')}</span>
            <p className="text-sm text-gray-500">
              {t('intermediaryHelp')}
            </p>
          </label>
        </div>
      </div>
    </div>
  );
}
