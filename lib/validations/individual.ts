import { z } from 'zod';
import { addressSchema, identifyingInfoSchema } from './common';

export const individualSchema = z.object({
  type: z.literal('individual'),
  first_name: z.string().min(1, 'First name is required').max(1024),
  middle_name: z.string().max(1024).optional(),
  last_name: z.string().min(2, 'Last name must be at least 2 characters').max(1024),
  transliterated_first_name: z.string().max(256).optional(),
  transliterated_middle_name: z.string().max(256).optional(),
  transliterated_last_name: z.string().max(256).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+[1-9]\d{1,14}$/, 'Phone must be in E.164 format (e.g., +12223334444)').optional().or(z.literal('')),
  birth_date: z.string().refine((date) => {
    if (!date) return false;
    const birthDate = new Date(date);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())
      ? age - 1
      : age;
    return actualAge >= 18;
  }, 'Must be at least 18 years old'),
  nationality: z.string().length(3, 'Nationality must be 3-letter ISO code').optional(),
  individual_account_purpose: z.enum([
    'charitable_donations', 'ecommerce_retail_payments', 'investment_purposes',
    'operating_a_company', 'payments_to_friends_or_family_abroad',
    'personal_or_living_expenses', 'protect_wealth', 'purchase_goods_and_services',
    'receive_payment_for_freelancing', 'receive_salary', 'other'
  ]).optional(),
  individual_account_purpose_other: z.string().max(1024).optional(),
  employment_status: z.enum([
    'employed', 'homemaker', 'retired', 'self_employed', 'student', 'unemployed'
  ]).optional(),
  most_recent_occupation: z.string().max(255).optional(),
  individual_source_of_funds: z.enum([
    'company_funds', 'ecommerce_reseller', 'gambling_proceeds', 'gifts',
    'government_benefits', 'inheritance', 'investments_loans', 'pension_retirement',
    'salary', 'sale_of_assets_real_estate', 'savings', 'someone_elses_funds'
  ]).optional(),
  individual_expected_monthly_payments: z.enum([
    '0_4999', '5000_9999', '10000_49999', '50000_plus'
  ]).optional(),
  individual_acting_as_intermediary: z.boolean().optional(),
  residential_address: addressSchema,
  identifying_information: z.array(identifyingInfoSchema).min(1, 'At least one ID is required'),
});

export type IndividualFormData = z.infer<typeof individualSchema>;
