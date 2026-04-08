// Public KYC/KYB Form Types - Based on Bridge API Requirements

// Address structure (ISO 3166-2 subdivision codes)
export interface AddressData {
  street_line_1: string;
  street_line_2?: string;
  city: string;
  subdivision?: string; // ISO 3166-2 (e.g., CA, TX, CMX)
  postal_code: string;
  country: string; // ISO 3166-1 alpha-3 (e.g., USA, MEX, CAN)
}

// Identification document
export interface IdentificationData {
  type: IdentificationType;
  issuing_country: string;
  number?: string;
  expiration?: string;
  description?: string; // Required if type is 'other'
  image_front?: string; // Base64 data URI
  image_back?: string; // Base64 data URI
}

// All ID types (combined for both individual and business)
export type IdentificationType =
  // Individual
  | 'ssn' | 'itin' | 'sin' | 'curp' | 'rfc' | 'cpf' | 'nif' | 'nie'
  | 'codice_fiscale' | 'nino' | 'tfn' | 'pan' | 'nric' | 'fin' | 'hkid'
  | 'national_id' | 'passport' | 'drivers_license'
  // Business
  | 'ein' | 'bn' | 'cnpj' | 'crn' | 'utr' | 'vat' | 'ust_idnr' | 'tin'
  | 'siren' | 'siret' | 'cif' | 'partita_iva' | 'abn' | 'acn' | 'gstin'
  | 'cin' | 'uen' | 'cuit' | 'rut'
  | 'other';

// Business ID types (for convenience)
export type BusinessIdentificationType =
  | 'ein' | 'ssn' | 'itin' | 'bn' | 'sin' | 'rfc' | 'cnpj'
  | 'crn' | 'utr' | 'vat' | 'ust_idnr' | 'tin' | 'siren' | 'siret'
  | 'cif' | 'partita_iva' | 'abn' | 'acn' | 'gstin' | 'cin' | 'uen'
  | 'cuit' | 'rut' | 'other';

// Account purpose options - Individual
export type IndividualAccountPurpose =
  | 'charitable_donations'
  | 'ecommerce_retail_payments'
  | 'investment_purposes'
  | 'operating_a_company'
  | 'payments_to_friends_or_family_abroad'
  | 'personal_or_living_expenses'
  | 'protect_wealth'
  | 'purchase_goods_and_services'
  | 'receive_payment_for_freelancing'
  | 'receive_salary'
  | 'other';

// Employment status
export type EmploymentStatus =
  | 'employed'
  | 'homemaker'
  | 'retired'
  | 'self_employed'
  | 'student'
  | 'unemployed';

// Source of funds - Individual
export type IndividualSourceOfFunds =
  | 'company_funds'
  | 'ecommerce_reseller'
  | 'gambling_proceeds'
  | 'gifts'
  | 'government_benefits'
  | 'inheritance'
  | 'investments_loans'
  | 'pension_retirement'
  | 'salary'
  | 'sale_of_assets_real_estate'
  | 'savings'
  | 'someone_elses_funds';

// Expected monthly payments - Individual
export type ExpectedMonthlyPayments =
  | '0_4999'
  | '5000_9999'
  | '10000_49999'
  | '50000_plus';

// Business type
export type BusinessType =
  | 'sole_prop'
  | 'partnership'
  | 'corporation'
  | 'llc'
  | 'trust'
  | 'cooperative'
  | 'other';

// Source of funds - Business
export type BusinessSourceOfFunds =
  | 'business_loans'
  | 'grants'
  | 'inter_company_funds'
  | 'investment_proceeds'
  | 'legal_settlement'
  | 'owners_capital'
  | 'pension_retirement'
  | 'sale_of_assets'
  | 'sales_of_goods_and_services'
  | 'third_party_funds'
  | 'treasury_reserves';

// Account purpose - Business
export type BusinessAccountPurpose =
  | 'charitable_donations'
  | 'ecommerce_retail_payments'
  | 'investment_purposes'
  | 'payments_to_friends_or_family_abroad'
  | 'payroll'
  | 'personal_or_living_expenses'
  | 'protect_wealth'
  | 'purchase_goods_and_services'
  | 'receive_payments_for_goods_and_services'
  | 'tax_optimization'
  | 'third_party_money_transmission'
  | 'treasury_management'
  | 'other';

// Estimated annual revenue
export type EstimatedAnnualRevenue =
  | '0_99999'
  | '100000_999999'
  | '1000000_9999999'
  | '10000000_49999999'
  | '50000000_249999999'
  | '250000000_plus';

// High risk activities
export type HighRiskActivity =
  | 'adult_entertainment'
  | 'gambling'
  | 'hold_client_funds'
  | 'investment_services'
  | 'lending_banking'
  | 'marijuana_or_related_services'
  | 'money_services'
  | 'nicotine_tobacco_or_related_services'
  | 'operate_foreign_exchange_virtual_currencies_brokerage_otc'
  | 'pharmaceuticals'
  | 'precious_metals_precious_stones_jewelry'
  | 'safe_deposit_box_rentals'
  | 'third_party_payment_processing'
  | 'weapons_firearms_and_explosives'
  | 'none_of_the_above';

// Regulated activity information
export interface RegulatedActivityData {
  regulated_activities_description?: string;
  primary_regulatory_authority_country?: string;
  primary_regulatory_authority_name?: string;
  license_number?: string;
}

// Publicly traded listing
export interface PubliclyTradedListingData {
  market_identifier_code?: string; // 4-digit ISO 10383 MIC
  stock_number?: string; // 12-digit ISIN
  ticker?: string;
}

// Associated person (beneficial owner, control person, signer)
export interface AssociatedPersonData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
  birth_date: string;
  title?: string; // Required if has_control
  residential_address: AddressData;
  identifying_information: IdentificationData[];
  has_ownership: boolean;
  ownership_percentage?: number; // 0-100
  has_control: boolean;
  is_signer: boolean;
  is_director?: boolean;
}

// Document upload
export interface DocumentData {
  purposes: DocumentPurpose[];
  file: string; // Base64 data URI
  description?: string; // Required if purposes includes 'other'
}

// Document purposes - Individual
export type IndividualDocumentPurpose =
  | 'proof_of_address'
  | 'proof_of_source_of_funds'
  | 'proof_of_source_of_wealth'
  | 'proof_of_tax_identification'
  | 'proof_of_account_purpose'
  | 'proof_of_individual_name_change'
  | 'proof_of_relationship'
  | 'other';

// Document purposes - Business
export type BusinessDocumentPurpose =
  | 'business_formation'
  | 'ownership_information'
  | 'ownership_chart'
  | 'directors_registry'
  | 'evidence_of_good_standing'
  | 'proof_of_nature_of_business'
  | 'proof_of_address'
  | 'proof_of_source_of_funds'
  | 'proof_of_tax_identification'
  | 'flow_of_funds'
  | 'aml_comfort_letter'
  | 'other';

export type DocumentPurpose = IndividualDocumentPurpose | BusinessDocumentPurpose;

// ============================================
// INDIVIDUAL (KYC) FORM DATA - 4 Steps
// ============================================

// Step 1: Personal Information
export interface KYCPersonalInfoData {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
  birth_date: string;
  nationality?: string;
  account_purpose?: IndividualAccountPurpose;
  account_purpose_other?: string;
  employment_status?: EmploymentStatus;
  most_recent_occupation?: string; // Occupation code (required for restricted countries)
  source_of_funds?: IndividualSourceOfFunds;
  expected_monthly_payments?: ExpectedMonthlyPayments;
  acting_as_intermediary?: boolean; // Acting on behalf of third party
}

// Step 2: Identification
export interface KYCIdentificationData {
  identifying_information: IdentificationData[];
}

// Step 3: Address
export interface KYCAddressData {
  residential_address: AddressData;
}

// Step 4: Documents (optional supporting documentation)
export interface KYCDocumentsData {
  documents?: DocumentData[];
}

// Complete KYC Form Data
export interface KYCFormData extends KYCPersonalInfoData, KYCIdentificationData, KYCAddressData, KYCDocumentsData {
  type: 'individual';
}

// ============================================
// BUSINESS (KYB) FORM DATA - 5 Steps
// ============================================

// Step 1: Business Information
export interface KYBBusinessInfoData {
  business_legal_name: string;
  business_trade_name?: string;
  business_type: BusinessType;
  email: string;
  phone?: string;
  primary_website?: string;
  other_websites?: string[];
  business_description?: string;
  business_industry?: string[]; // NAICS codes
  is_dao?: boolean;
  account_purpose?: BusinessAccountPurpose;
  account_purpose_other?: string;
  source_of_funds?: BusinessSourceOfFunds;
  source_of_funds_description?: string;
  estimated_annual_revenue?: EstimatedAnnualRevenue;
  expected_monthly_payments_usd?: number;
  identifying_information: IdentificationData[]; // Business tax ID (EIN, etc.)
  // Risk & Compliance
  acting_as_intermediary?: boolean;
  operates_in_prohibited_countries?: boolean;
  high_risk_activities?: HighRiskActivity[];
  high_risk_activities_explanation?: string;
  // Money Services
  conducts_money_services?: boolean;
  conducts_money_services_using_bridge?: boolean;
  conducts_money_services_description?: string;
  compliance_screening_explanation?: string;
  // Ownership Structure
  ownership_threshold?: number; // 5-25, default 25
  has_material_intermediary_ownership?: boolean;
  // Public/Regulated
  publicly_traded_listings?: PubliclyTradedListingData[];
  regulated_activity?: RegulatedActivityData;
}

// Step 2: Addresses
export interface KYBAddressData {
  registered_address: AddressData;
  physical_address: AddressData;
  same_as_registered?: boolean;
}

// Step 3: Beneficial Owners & Signers
export interface KYBOwnersData {
  associated_persons: AssociatedPersonData[];
}

// Step 4: Documents
export interface KYBDocumentsData {
  documents: DocumentData[];
}

// Complete KYB Form Data
export interface KYBFormData extends KYBBusinessInfoData, KYBAddressData, KYBOwnersData, KYBDocumentsData {
  type: 'business';
}

// Union type for form data
export type PublicFormData = KYCFormData | KYBFormData;

// ============================================
// DISPLAY LABELS
// ============================================

export const ACCOUNT_PURPOSE_LABELS: Record<IndividualAccountPurpose | BusinessAccountPurpose, string> = {
  charitable_donations: 'Charitable Donations',
  ecommerce_retail_payments: 'E-commerce/Retail Payments',
  investment_purposes: 'Investment Purposes',
  operating_a_company: 'Operating a Company',
  payments_to_friends_or_family_abroad: 'Payments to Friends/Family Abroad',
  personal_or_living_expenses: 'Personal/Living Expenses',
  protect_wealth: 'Protect Wealth',
  purchase_goods_and_services: 'Purchase Goods and Services',
  receive_payment_for_freelancing: 'Receive Payment for Freelancing',
  receive_salary: 'Receive Salary',
  payroll: 'Payroll',
  receive_payments_for_goods_and_services: 'Receive Payments for Goods/Services',
  tax_optimization: 'Tax Optimization',
  third_party_money_transmission: 'Third Party Money Transmission',
  treasury_management: 'Treasury Management',
  other: 'Other',
};

export const EMPLOYMENT_STATUS_LABELS: Record<EmploymentStatus, string> = {
  employed: 'Employed',
  homemaker: 'Homemaker',
  retired: 'Retired',
  self_employed: 'Self-Employed',
  student: 'Student',
  unemployed: 'Unemployed',
};

export const SOURCE_OF_FUNDS_LABELS: Record<IndividualSourceOfFunds | BusinessSourceOfFunds, string> = {
  company_funds: 'Company Funds',
  ecommerce_reseller: 'E-commerce Reseller',
  gambling_proceeds: 'Gambling Proceeds',
  gifts: 'Gifts',
  government_benefits: 'Government Benefits',
  inheritance: 'Inheritance',
  investments_loans: 'Investments/Loans',
  pension_retirement: 'Pension/Retirement',
  salary: 'Salary',
  sale_of_assets_real_estate: 'Sale of Assets/Real Estate',
  savings: 'Savings',
  someone_elses_funds: "Someone Else's Funds",
  business_loans: 'Business Loans',
  grants: 'Grants',
  inter_company_funds: 'Inter-Company Funds',
  investment_proceeds: 'Investment Proceeds',
  legal_settlement: 'Legal Settlement',
  owners_capital: "Owner's Capital",
  sale_of_assets: 'Sale of Assets',
  sales_of_goods_and_services: 'Sales of Goods and Services',
  third_party_funds: 'Third Party Funds',
  treasury_reserves: 'Treasury Reserves',
};

export const EXPECTED_MONTHLY_LABELS: Record<ExpectedMonthlyPayments, string> = {
  '0_4999': '$0 - $4,999',
  '5000_9999': '$5,000 - $9,999',
  '10000_49999': '$10,000 - $49,999',
  '50000_plus': '$50,000+',
};

export const ANNUAL_REVENUE_LABELS: Record<EstimatedAnnualRevenue, string> = {
  '0_99999': '$0 - $99,999',
  '100000_999999': '$100,000 - $999,999',
  '1000000_9999999': '$1M - $9.9M',
  '10000000_49999999': '$10M - $49.9M',
  '50000000_249999999': '$50M - $249.9M',
  '250000000_plus': '$250M+',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  sole_prop: 'Sole Proprietorship',
  partnership: 'Partnership',
  corporation: 'Corporation',
  llc: 'LLC',
  trust: 'Trust',
  cooperative: 'Cooperative',
  other: 'Other',
};

export const HIGH_RISK_ACTIVITIES_LABELS: Record<HighRiskActivity, string> = {
  adult_entertainment: 'Adult Entertainment',
  gambling: 'Gambling',
  hold_client_funds: 'Hold Client Funds',
  investment_services: 'Investment Services',
  lending_banking: 'Lending/Banking',
  marijuana_or_related_services: 'Marijuana or Related Services',
  money_services: 'Money Services',
  nicotine_tobacco_or_related_services: 'Nicotine/Tobacco or Related Services',
  operate_foreign_exchange_virtual_currencies_brokerage_otc: 'Foreign Exchange/Virtual Currencies/Brokerage/OTC',
  pharmaceuticals: 'Pharmaceuticals',
  precious_metals_precious_stones_jewelry: 'Precious Metals/Stones/Jewelry',
  safe_deposit_box_rentals: 'Safe Deposit Box Rentals',
  third_party_payment_processing: 'Third Party Payment Processing',
  weapons_firearms_and_explosives: 'Weapons/Firearms/Explosives',
  none_of_the_above: 'None of the Above',
};

export const ID_TYPE_LABELS: Record<IdentificationType | BusinessIdentificationType, string> = {
  ssn: 'Social Security Number (SSN)',
  itin: 'Individual Taxpayer ID (ITIN)',
  ein: 'Employer Identification Number (EIN)',
  sin: 'Social Insurance Number (SIN)',
  bn: 'Business Number (BN)',
  curp: 'CURP',
  rfc: 'RFC',
  cpf: 'CPF',
  cnpj: 'CNPJ',
  nif: 'NIF',
  nie: 'NIE',
  cif: 'CIF',
  codice_fiscale: 'Codice Fiscale',
  partita_iva: 'Partita IVA',
  nino: 'National Insurance Number (NINO)',
  crn: 'Company Registration Number (CRN)',
  utr: 'Unique Taxpayer Reference (UTR)',
  vat: 'VAT Number',
  ust_idnr: 'USt-IdNr',
  tin: 'Tax Identification Number (TIN)',
  siren: 'SIREN',
  siret: 'SIRET',
  tfn: 'Tax File Number (TFN)',
  abn: 'Australian Business Number (ABN)',
  acn: 'Australian Company Number (ACN)',
  pan: 'PAN',
  gstin: 'GSTIN',
  cin: 'CIN',
  nric: 'NRIC',
  fin: 'FIN',
  uen: 'Unique Entity Number (UEN)',
  hkid: 'HKID',
  cuit: 'CUIT',
  rut: 'RUT',
  national_id: 'National ID',
  passport: 'Passport',
  drivers_license: "Driver's License",
  other: 'Other',
};

// Country list (common countries)
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'USA', name: 'United States' },
  { code: 'CAN', name: 'Canada' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'GBR', name: 'United Kingdom' },
  { code: 'DEU', name: 'Germany' },
  { code: 'FRA', name: 'France' },
  { code: 'ESP', name: 'Spain' },
  { code: 'ITA', name: 'Italy' },
  { code: 'BRA', name: 'Brazil' },
  { code: 'ARG', name: 'Argentina' },
  { code: 'CHL', name: 'Chile' },
  { code: 'COL', name: 'Colombia' },
  { code: 'AUS', name: 'Australia' },
  { code: 'NZL', name: 'New Zealand' },
  { code: 'JPN', name: 'Japan' },
  { code: 'KOR', name: 'South Korea' },
  { code: 'SGP', name: 'Singapore' },
  { code: 'HKG', name: 'Hong Kong' },
  { code: 'IND', name: 'India' },
  { code: 'CHE', name: 'Switzerland' },
  { code: 'NLD', name: 'Netherlands' },
  { code: 'BEL', name: 'Belgium' },
  { code: 'AUT', name: 'Austria' },
  { code: 'PRT', name: 'Portugal' },
  { code: 'IRL', name: 'Ireland' },
  { code: 'SWE', name: 'Sweden' },
  { code: 'NOR', name: 'Norway' },
  { code: 'DNK', name: 'Denmark' },
  { code: 'FIN', name: 'Finland' },
  { code: 'POL', name: 'Poland' },
];

// US States (ISO 3166-2 codes)
export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

// Mexico States (ISO 3166-2 codes)
export const MEXICO_STATES: { code: string; name: string }[] = [
  { code: 'AGU', name: 'Aguascalientes' },
  { code: 'BCN', name: 'Baja California' },
  { code: 'BCS', name: 'Baja California Sur' },
  { code: 'CAM', name: 'Campeche' },
  { code: 'CHP', name: 'Chiapas' },
  { code: 'CHH', name: 'Chihuahua' },
  { code: 'COA', name: 'Coahuila' },
  { code: 'COL', name: 'Colima' },
  { code: 'CMX', name: 'Ciudad de Mexico' },
  { code: 'DUR', name: 'Durango' },
  { code: 'GUA', name: 'Guanajuato' },
  { code: 'GRO', name: 'Guerrero' },
  { code: 'HID', name: 'Hidalgo' },
  { code: 'JAL', name: 'Jalisco' },
  { code: 'MEX', name: 'Mexico' },
  { code: 'MIC', name: 'Michoacan' },
  { code: 'MOR', name: 'Morelos' },
  { code: 'NAY', name: 'Nayarit' },
  { code: 'NLE', name: 'Nuevo Leon' },
  { code: 'OAX', name: 'Oaxaca' },
  { code: 'PUE', name: 'Puebla' },
  { code: 'QUE', name: 'Queretaro' },
  { code: 'ROO', name: 'Quintana Roo' },
  { code: 'SLP', name: 'San Luis Potosi' },
  { code: 'SIN', name: 'Sinaloa' },
  { code: 'SON', name: 'Sonora' },
  { code: 'TAB', name: 'Tabasco' },
  { code: 'TAM', name: 'Tamaulipas' },
  { code: 'TLA', name: 'Tlaxcala' },
  { code: 'VER', name: 'Veracruz' },
  { code: 'YUC', name: 'Yucatan' },
  { code: 'ZAC', name: 'Zacatecas' },
];

// Canada Provinces (ISO 3166-2 codes)
export const CANADA_PROVINCES: { code: string; name: string }[] = [
  { code: 'AB', name: 'Alberta' },
  { code: 'BC', name: 'British Columbia' },
  { code: 'MB', name: 'Manitoba' },
  { code: 'NB', name: 'New Brunswick' },
  { code: 'NL', name: 'Newfoundland and Labrador' },
  { code: 'NS', name: 'Nova Scotia' },
  { code: 'NT', name: 'Northwest Territories' },
  { code: 'NU', name: 'Nunavut' },
  { code: 'ON', name: 'Ontario' },
  { code: 'PE', name: 'Prince Edward Island' },
  { code: 'QC', name: 'Quebec' },
  { code: 'SK', name: 'Saskatchewan' },
  { code: 'YT', name: 'Yukon' },
];

// Get subdivisions by country
export function getSubdivisions(country: string): { code: string; name: string }[] {
  switch (country) {
    case 'USA':
      return US_STATES;
    case 'MEX':
      return MEXICO_STATES;
    case 'CAN':
      return CANADA_PROVINCES;
    default:
      return [];
  }
}
