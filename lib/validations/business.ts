import { z } from 'zod';
import { addressSchema, identifyingInfoSchema } from './common';

export const associatedPersonSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(1024),
  middle_name: z.string().max(1024).optional(),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(1024),
  transliterated_first_name: z.string().max(256).optional(),
  transliterated_middle_name: z.string().max(256).optional(),
  transliterated_last_name: z.string().max(256).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').optional().or(z.literal('')),
  birth_date: z.string().refine((date) => {
    if (!date) return false;
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age >= 18;
  }, 'Must be at least 18 years old'),
  title: z.string().max(1024).optional(),
  has_ownership: z.boolean(),
  ownership_percentage: z.number().min(0).max(100).optional(),
  has_control: z.boolean(),
  is_signer: z.boolean(),
  is_director: z.boolean().optional(),
  address: addressSchema,
  identifying_information: z.array(identifyingInfoSchema).min(1, 'At least one ID is required'),
});

export const businessSchema = z.object({
  type: z.literal('business'),
  business_legal_name: z.string().min(1, 'Legal name is required').max(1024),
  business_trade_name: z.string().max(1024).optional(),
  transliterated_business_legal_name: z.string().max(1024).optional(),
  transliterated_business_trade_name: z.string().max(1024).optional(),
  business_type: z.enum(['sole_prop', 'partnership', 'corporation', 'llc', 'trust', 'cooperative', 'other']),
  business_description: z.string().max(1024).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format').optional().or(z.literal('')),
  primary_website: z.string().url('Invalid URL').optional().or(z.literal('')),
  is_dao: z.boolean().optional(),
  business_industry: z.array(z.string()).optional(),
  estimated_annual_revenue_usd: z.enum([
    '0_99999', '100000_999999', '1000000_9999999',
    '10000000_49999999', '50000000_249999999', '250000000_plus'
  ]).optional(),
  business_expected_monthly_payments_usd: z.number().optional(),
  business_source_of_funds: z.enum([
    'business_loans', 'grants', 'inter_company_funds', 'investment_proceeds',
    'legal_settlement', 'owners_capital', 'pension_retirement', 'sale_of_assets',
    'sales_of_goods_and_services', 'third_party_funds', 'treasury_reserves'
  ]).optional(),
  business_source_of_funds_description: z.string().optional(),
  business_account_purpose: z.enum([
    'charitable_donations', 'ecommerce_retail_payments', 'investment_purposes',
    'payments_to_friends_or_family_abroad', 'payroll', 'personal_or_living_expenses',
    'protect_wealth', 'purchase_goods_and_services', 'receive_payments_for_goods_and_services',
    'tax_optimization', 'third_party_money_transmission', 'treasury_management', 'other'
  ]).optional(),
  business_account_purpose_other: z.string().max(1024).optional(),
  business_acting_as_intermediary: z.boolean().optional(),
  operates_in_prohibited_countries: z.boolean().optional(),
  high_risk_activities: z.array(z.enum([
    'adult_entertainment', 'gambling', 'hold_client_funds', 'investment_services',
    'lending_banking', 'marijuana_or_related_services', 'money_services',
    'nicotine_tobacco_or_related_services',
    'operate_foreign_exchange_virtual_currencies_brokerage_otc',
    'pharmaceuticals', 'precious_metals_precious_stones_jewelry',
    'safe_deposit_box_rentals', 'third_party_payment_processing',
    'weapons_firearms_and_explosives', 'none_of_the_above'
  ])).optional(),
  high_risk_activities_explanation: z.string().optional(),
  conducts_money_services: z.boolean().optional(),
  conducts_money_services_using_bridge: z.boolean().optional(),
  conducts_money_services_description: z.string().optional(),
  compliance_screening_explanation: z.string().max(1024).optional(),
  ownership_threshold: z.number().min(5).max(25).optional(),
  has_material_intermediary_ownership: z.boolean().optional(),
  registered_address: addressSchema,
  physical_address: addressSchema,
  identifying_information: z.array(identifyingInfoSchema).min(1, 'Business tax ID is required'),
  associated_persons: z.array(associatedPersonSchema)
    .min(1, 'At least one associated person is required')
    .refine(
      (persons) => persons.some(p => p.has_control),
      'At least one control person is required'
    )
    .refine(
      (persons) => persons.some(p => p.is_signer),
      'At least one signer is required'
    ),
});

export type AssociatedPersonFormData = z.infer<typeof associatedPersonSchema>;
export type BusinessFormData = z.infer<typeof businessSchema>;
