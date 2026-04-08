export const COUNTRIES = [
  { value: 'USA', label: 'United States' },
  { value: 'MEX', label: 'Mexico' },
  { value: 'CAN', label: 'Canada' },
  { value: 'GBR', label: 'United Kingdom' },
  { value: 'DEU', label: 'Germany' },
  { value: 'FRA', label: 'France' },
  { value: 'ESP', label: 'Spain' },
  { value: 'ITA', label: 'Italy' },
  { value: 'BRA', label: 'Brazil' },
  { value: 'ARG', label: 'Argentina' },
  { value: 'COL', label: 'Colombia' },
  { value: 'CHL', label: 'Chile' },
  { value: 'PER', label: 'Peru' },
  { value: 'AUS', label: 'Australia' },
  { value: 'NZL', label: 'New Zealand' },
  { value: 'JPN', label: 'Japan' },
  { value: 'KOR', label: 'South Korea' },
  { value: 'CHN', label: 'China' },
  { value: 'IND', label: 'India' },
  { value: 'SGP', label: 'Singapore' },
  { value: 'HKG', label: 'Hong Kong' },
];

export const ID_TYPES = [
  { value: 'ssn', label: 'SSN (US Social Security Number)' },
  { value: 'itin', label: 'ITIN (US Individual Tax ID)' },
  { value: 'ein', label: 'EIN (US Employer ID)' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: 'Driver\'s License' },
  { value: 'national_id', label: 'National ID' },
  { value: 'rfc', label: 'RFC (Mexico)' },
  { value: 'curp', label: 'CURP (Mexico)' },
  { value: 'sin', label: 'SIN (Canada)' },
  { value: 'bn', label: 'BN (Canada Business Number)' },
  { value: 'cpf', label: 'CPF (Brazil)' },
  { value: 'cnpj', label: 'CNPJ (Brazil Business)' },
  { value: 'nif', label: 'NIF (Spain)' },
  { value: 'nie', label: 'NIE (Spain Foreigner ID)' },
  { value: 'vat', label: 'VAT Number' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_TYPES = [
  { value: 'sole_prop', label: 'Sole Proprietorship' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'corporation', label: 'Corporation' },
  { value: 'llc', label: 'LLC (Limited Liability Company)' },
  { value: 'trust', label: 'Trust' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'other', label: 'Other' },
];

export const EMPLOYMENT_STATUS_OPTIONS = [
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
  { value: 'homemaker', label: 'Homemaker' },
];

export const INDIVIDUAL_ACCOUNT_PURPOSE_OPTIONS = [
  { value: 'personal_or_living_expenses', label: 'Personal/Living Expenses' },
  { value: 'receive_salary', label: 'Receive Salary' },
  { value: 'receive_payment_for_freelancing', label: 'Freelancing Payments' },
  { value: 'payments_to_friends_or_family_abroad', label: 'Payments to Family/Friends Abroad' },
  { value: 'purchase_goods_and_services', label: 'Purchase Goods/Services' },
  { value: 'investment_purposes', label: 'Investment' },
  { value: 'protect_wealth', label: 'Protect Wealth' },
  { value: 'operating_a_company', label: 'Operating a Company' },
  { value: 'ecommerce_retail_payments', label: 'E-commerce/Retail' },
  { value: 'charitable_donations', label: 'Charitable Donations' },
  { value: 'other', label: 'Other' },
];

export const INDIVIDUAL_SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'salary', label: 'Salary' },
  { value: 'savings', label: 'Savings' },
  { value: 'investments_loans', label: 'Investments/Loans' },
  { value: 'inheritance', label: 'Inheritance' },
  { value: 'gifts', label: 'Gifts' },
  { value: 'pension_retirement', label: 'Pension/Retirement' },
  { value: 'government_benefits', label: 'Government Benefits' },
  { value: 'sale_of_assets_real_estate', label: 'Sale of Assets/Real Estate' },
  { value: 'company_funds', label: 'Company Funds' },
  { value: 'ecommerce_reseller', label: 'E-commerce/Reseller' },
  { value: 'gambling_proceeds', label: 'Gambling Proceeds' },
  { value: 'someone_elses_funds', label: 'Someone Else\'s Funds' },
];

export const EXPECTED_MONTHLY_PAYMENTS_OPTIONS = [
  { value: '0_4999', label: '$0 - $4,999' },
  { value: '5000_9999', label: '$5,000 - $9,999' },
  { value: '10000_49999', label: '$10,000 - $49,999' },
  { value: '50000_plus', label: '$50,000+' },
];

export const BUSINESS_ACCOUNT_PURPOSE_OPTIONS = [
  { value: 'receive_payments_for_goods_and_services', label: 'Receive Payments for Goods/Services' },
  { value: 'payroll', label: 'Payroll' },
  { value: 'purchase_goods_and_services', label: 'Purchase Goods/Services' },
  { value: 'treasury_management', label: 'Treasury Management' },
  { value: 'payments_to_friends_or_family_abroad', label: 'International Payments' },
  { value: 'investment_purposes', label: 'Investment' },
  { value: 'protect_wealth', label: 'Protect Wealth' },
  { value: 'tax_optimization', label: 'Tax Optimization' },
  { value: 'ecommerce_retail_payments', label: 'E-commerce/Retail' },
  { value: 'charitable_donations', label: 'Charitable Donations' },
  { value: 'third_party_money_transmission', label: 'Third Party Money Transmission' },
  { value: 'personal_or_living_expenses', label: 'Personal/Living Expenses' },
  { value: 'other', label: 'Other' },
];

export const BUSINESS_SOURCE_OF_FUNDS_OPTIONS = [
  { value: 'sales_of_goods_and_services', label: 'Sales of Goods/Services' },
  { value: 'owners_capital', label: 'Owner\'s Capital' },
  { value: 'business_loans', label: 'Business Loans' },
  { value: 'investment_proceeds', label: 'Investment Proceeds' },
  { value: 'grants', label: 'Grants' },
  { value: 'inter_company_funds', label: 'Inter-company Funds' },
  { value: 'treasury_reserves', label: 'Treasury Reserves' },
  { value: 'sale_of_assets', label: 'Sale of Assets' },
  { value: 'legal_settlement', label: 'Legal Settlement' },
  { value: 'third_party_funds', label: 'Third Party Funds' },
  { value: 'pension_retirement', label: 'Pension/Retirement' },
];

export const ESTIMATED_ANNUAL_REVENUE_OPTIONS = [
  { value: '0_99999', label: 'Under $100,000' },
  { value: '100000_999999', label: '$100,000 - $999,999' },
  { value: '1000000_9999999', label: '$1M - $9.9M' },
  { value: '10000000_49999999', label: '$10M - $49.9M' },
  { value: '50000000_249999999', label: '$50M - $249.9M' },
  { value: '250000000_plus', label: '$250M+' },
];

export const HIGH_RISK_ACTIVITIES_OPTIONS = [
  { value: 'none_of_the_above', label: 'None of the Above' },
  { value: 'adult_entertainment', label: 'Adult Entertainment' },
  { value: 'gambling', label: 'Gambling' },
  { value: 'hold_client_funds', label: 'Hold Client Funds' },
  { value: 'investment_services', label: 'Investment Services' },
  { value: 'lending_banking', label: 'Lending/Banking' },
  { value: 'marijuana_or_related_services', label: 'Marijuana/Cannabis' },
  { value: 'money_services', label: 'Money Services' },
  { value: 'nicotine_tobacco_or_related_services', label: 'Nicotine/Tobacco' },
  { value: 'operate_foreign_exchange_virtual_currencies_brokerage_otc', label: 'Foreign Exchange/Crypto' },
  { value: 'pharmaceuticals', label: 'Pharmaceuticals' },
  { value: 'precious_metals_precious_stones_jewelry', label: 'Precious Metals/Jewelry' },
  { value: 'safe_deposit_box_rentals', label: 'Safe Deposit Boxes' },
  { value: 'third_party_payment_processing', label: 'Third Party Payment Processing' },
  { value: 'weapons_firearms_and_explosives', label: 'Weapons/Firearms' },
];
