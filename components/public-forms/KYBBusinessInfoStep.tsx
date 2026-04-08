'use client';

import { useTranslations } from 'next-intl';
import type {
  KYBBusinessInfoData,
  BusinessType,
  BusinessAccountPurpose,
  BusinessSourceOfFunds,
  EstimatedAnnualRevenue,
  IdentificationData,
  BusinessIdentificationType,
  HighRiskActivity,
} from '@/types/public-forms';
import {
  COUNTRIES,
} from '@/types/public-forms';

interface Props {
  data: Partial<KYBBusinessInfoData>;
  onChange: (data: Partial<KYBBusinessInfoData>) => void;
  errors?: Record<string, string>;
}

const BUSINESS_TAX_ID_TYPES: BusinessIdentificationType[] = [
  'ein', 'bn', 'rfc', 'cnpj', 'crn', 'utr', 'vat',
  'ust_idnr', 'tin', 'siren', 'siret', 'cif', 'partita_iva',
  'abn', 'acn', 'gstin', 'cin', 'uen', 'cuit', 'rut', 'other',
];

export default function KYBBusinessInfoStep({ data, onChange, errors }: Props) {
  const t = useTranslations('businessInfo');
  const tPersonal = useTranslations('personalInfo');
  const tId = useTranslations('identification');
  const tOptions = useTranslations('formOptions');

  const updateField = <K extends keyof KYBBusinessInfoData>(
    field: K,
    value: KYBBusinessInfoData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const taxId = data.identifying_information?.[0];

  const updateTaxId = (field: keyof IdentificationData, value: unknown) => {
    const newTaxId: IdentificationData = {
      ...taxId,
      type: taxId?.type || 'ein',
      issuing_country: taxId?.issuing_country || 'USA',
      [field]: value,
    };
    onChange({ ...data, identifying_information: [newTaxId] });
  };

  const businessTypes: BusinessType[] = [
    'llc', 'corporation', 'partnership', 'sole_prop', 'trust', 'cooperative', 'other',
  ];

  const accountPurposes: BusinessAccountPurpose[] = [
    'receive_payments_for_goods_and_services',
    'purchase_goods_and_services',
    'payroll',
    'treasury_management',
    'ecommerce_retail_payments',
    'investment_purposes',
    'charitable_donations',
    'payments_to_friends_or_family_abroad',
    'protect_wealth',
    'tax_optimization',
    'third_party_money_transmission',
    'personal_or_living_expenses',
    'other',
  ];

  const sourcesOfFunds: BusinessSourceOfFunds[] = [
    'sales_of_goods_and_services',
    'owners_capital',
    'business_loans',
    'investment_proceeds',
    'treasury_reserves',
    'inter_company_funds',
    'grants',
    'sale_of_assets',
    'legal_settlement',
    'pension_retirement',
    'third_party_funds',
  ];

  const annualRevenues: EstimatedAnnualRevenue[] = [
    '0_99999',
    '100000_999999',
    '1000000_9999999',
    '10000000_49999999',
    '50000000_249999999',
    '250000000_plus',
  ];

  const highRiskActivities: HighRiskActivity[] = [
    'adult_entertainment',
    'gambling',
    'hold_client_funds',
    'investment_services',
    'lending_banking',
    'marijuana_or_related_services',
    'money_services',
    'nicotine_tobacco_or_related_services',
    'operate_foreign_exchange_virtual_currencies_brokerage_otc',
    'pharmaceuticals',
    'precious_metals_precious_stones_jewelry',
    'safe_deposit_box_rentals',
    'third_party_payment_processing',
    'weapons_firearms_and_explosives',
    'none_of_the_above',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">{t('title')}</h2>
        <p className="text-sm text-gray-500 mb-6">
          {t('subtitle')}
        </p>
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('legalName')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={data.business_legal_name || ''}
          onChange={(e) => updateField('business_legal_name', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors?.business_legal_name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={t('legalNamePlaceholder')}
        />
        {errors?.business_legal_name && (
          <p className="mt-1 text-sm text-red-500">{errors.business_legal_name}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('tradeName')}
        </label>
        <input
          type="text"
          value={data.business_trade_name || ''}
          onChange={(e) => updateField('business_trade_name', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('tradeNamePlaceholder')}
        />
      </div>

      {/* Business Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessType')} <span className="text-red-500">*</span>
          </label>
          <select
            value={data.business_type || ''}
            onChange={(e) => updateField('business_type', e.target.value as BusinessType)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.business_type ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">{t('selectType')}</option>
            {businessTypes.map((type) => (
              <option key={type} value={type}>
                {tOptions(`businessType.${type}`)}
              </option>
            ))}
          </select>
          {errors?.business_type && (
            <p className="mt-1 text-sm text-red-500">{errors.business_type}</p>
          )}
        </div>

        <div className="flex items-end">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={data.is_dao || false}
              onChange={(e) => updateField('is_dao', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              {t('isDao')}
            </span>
          </label>
        </div>
      </div>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessEmail')} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={data.email || ''}
            onChange={(e) => updateField('email', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors?.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={t('businessEmailPlaceholder')}
          />
          {errors?.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('businessPhone')}
          </label>
          <input
            type="tel"
            value={data.phone || ''}
            onChange={(e) => updateField('phone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('businessPhonePlaceholder')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('primaryWebsite')}
        </label>
        <input
          type="url"
          value={data.primary_website || ''}
          onChange={(e) => updateField('primary_website', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('websitePlaceholder')}
        />
        <p className="mt-1 text-xs text-gray-500">
          {t('websiteRequired')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('businessDescription')}
        </label>
        <textarea
          value={data.business_description || ''}
          onChange={(e) => updateField('business_description', e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('businessDescPlaceholder')}
        />
      </div>

      {/* Business Tax ID */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('taxIdentification')}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('taxIdType')} <span className="text-red-500">*</span>
          </label>
          <select
            value={taxId?.type || 'ein'}
            onChange={(e) => updateTaxId('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {BUSINESS_TAX_ID_TYPES.map((type) => (
              <option key={type} value={type}>
                {tOptions(`idTypes.${type}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tId('issuingCountry')} <span className="text-red-500">*</span>
          </label>
          <select
            value={taxId?.issuing_country || 'USA'}
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
          {t('taxIdNumber')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={taxId?.number || ''}
          onChange={(e) => updateTaxId('number', e.target.value)}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors?.tax_id ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder={taxId?.type === 'ein' ? t('einPlaceholder') : t('taxIdPlaceholder')}
        />
        {errors?.tax_id && (
          <p className="mt-1 text-sm text-red-500">{errors.tax_id}</p>
        )}
      </div>

      {/* Financial Information */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('financialInfo')}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('annualRevenue')}
          </label>
          <select
            value={data.estimated_annual_revenue || ''}
            onChange={(e) => updateField('estimated_annual_revenue', e.target.value as EstimatedAnnualRevenue)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{tPersonal('selectRange')}</option>
            {annualRevenues.map((range) => (
              <option key={range} value={range}>
                {tOptions(`annualRevenue.${range}`)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tPersonal('sourceOfFunds')}
          </label>
          <select
            value={data.source_of_funds || ''}
            onChange={(e) => updateField('source_of_funds', e.target.value as BusinessSourceOfFunds)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{tPersonal('selectSource')}</option>
            {sourcesOfFunds.map((source) => (
              <option key={source} value={source}>
                {tOptions(`sourceOfFunds.${source}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {tPersonal('accountPurpose')}
        </label>
        <select
          value={data.account_purpose || ''}
          onChange={(e) => updateField('account_purpose', e.target.value as BusinessAccountPurpose)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">{tPersonal('selectPurpose')}</option>
          {accountPurposes.map((purpose) => (
            <option key={purpose} value={purpose}>
              {tOptions(`accountPurpose.${purpose}`)}
            </option>
          ))}
        </select>
      </div>

      {data.account_purpose === 'other' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {tPersonal('pleaseSpecify')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={data.account_purpose_other || ''}
            onChange={(e) => updateField('account_purpose_other', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={tPersonal('describePurpose')}
          />
        </div>
      )}

      {/* Risk & Compliance */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('riskCompliance')}</h3>
      </div>

      {/* Acting as Intermediary */}
      <div className="space-y-4">
        <label className="flex items-start">
          <input
            type="checkbox"
            checked={data.acting_as_intermediary || false}
            onChange={(e) => updateField('acting_as_intermediary', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
          />
          <span className="ml-2">
            <span className="text-sm text-gray-700">{t('intermediaryForThirdParties')}</span>
            <span className="block text-xs text-gray-500">{t('intermediaryHelp')}</span>
          </span>
        </label>

        <label className="flex items-start">
          <input
            type="checkbox"
            checked={data.operates_in_prohibited_countries || false}
            onChange={(e) => updateField('operates_in_prohibited_countries', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
          />
          <span className="ml-2">
            <span className="text-sm text-gray-700">{t('prohibitedJurisdictions')}</span>
            <span className="block text-xs text-gray-500">{t('prohibitedHelp')}</span>
          </span>
        </label>
      </div>

      {/* High Risk Activities */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('highRiskActivities')} <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-3">{t('highRiskSelect')}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
          {highRiskActivities.map((activity) => (
            <label key={activity} className="flex items-center">
              <input
                type="checkbox"
                checked={data.high_risk_activities?.includes(activity) || false}
                onChange={(e) => {
                  const current = data.high_risk_activities || [];
                  if (e.target.checked) {
                    if (activity === 'none_of_the_above') {
                      updateField('high_risk_activities', ['none_of_the_above']);
                    } else {
                      updateField('high_risk_activities', [...current.filter(a => a !== 'none_of_the_above'), activity]);
                    }
                  } else {
                    updateField('high_risk_activities', current.filter(a => a !== activity));
                  }
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">{tOptions(`highRiskActivities.${activity}`)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* High Risk Activities Explanation */}
      {data.high_risk_activities && data.high_risk_activities.length > 0 && !data.high_risk_activities.includes('none_of_the_above') && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('explainHighRisk')} <span className="text-red-500">*</span>
          </label>
          <textarea
            value={data.high_risk_activities_explanation || ''}
            onChange={(e) => updateField('high_risk_activities_explanation', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('highRiskPlaceholder')}
          />
        </div>
      )}

      {/* Money Services */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('moneyServices')}</h3>
      </div>

      <label className="flex items-start">
        <input
          type="checkbox"
          checked={data.conducts_money_services || false}
          onChange={(e) => updateField('conducts_money_services', e.target.checked)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
        />
        <span className="ml-2">
          <span className="text-sm text-gray-700">{t('conductsMoneyServices')}</span>
          <span className="block text-xs text-gray-500">{t('moneyServicesHelp')}</span>
        </span>
      </label>

      {data.conducts_money_services && (
        <>
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={data.conducts_money_services_using_bridge || false}
              onChange={(e) => updateField('conducts_money_services_using_bridge', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-0.5"
            />
            <span className="ml-2">
              <span className="text-sm text-gray-700">{t('usesBridgeForMoney')}</span>
              <span className="block text-xs text-gray-500">{t('bridgeHelp')}</span>
            </span>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('moneyServicesDescription')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.conducts_money_services_description || ''}
              onChange={(e) => updateField('conducts_money_services_description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('moneyServicesPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('complianceControls')} <span className="text-red-500">*</span>
            </label>
            <textarea
              value={data.compliance_screening_explanation || ''}
              onChange={(e) => updateField('compliance_screening_explanation', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('compliancePlaceholder')}
            />
          </div>
        </>
      )}

      {/* Regulated Activity */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-md font-medium text-gray-900 mb-4">{t('regulatoryInfo')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('regulatoryDescription')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('regulatoryAuthority')}
        </label>
        <input
          type="text"
          value={data.regulated_activity?.primary_regulatory_authority_name || ''}
          onChange={(e) => updateField('regulated_activity', {
            ...data.regulated_activity,
            primary_regulatory_authority_name: e.target.value
          })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('regulatoryPlaceholder')}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('regulatoryCountry')}
          </label>
          <select
            value={data.regulated_activity?.primary_regulatory_authority_country || ''}
            onChange={(e) => updateField('regulated_activity', {
              ...data.regulated_activity,
              primary_regulatory_authority_country: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{tPersonal('selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('licenseNumber')}
          </label>
          <input
            type="text"
            value={data.regulated_activity?.license_number || ''}
            onChange={(e) => updateField('regulated_activity', {
              ...data.regulated_activity,
              license_number: e.target.value
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder={t('licensePlaceholder')}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('regulatedActivities')}
        </label>
        <textarea
          value={data.regulated_activity?.regulated_activities_description || ''}
          onChange={(e) => updateField('regulated_activity', {
            ...data.regulated_activity,
            regulated_activities_description: e.target.value
          })}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder={t('regulatedPlaceholder')}
        />
      </div>
    </div>
  );
}
