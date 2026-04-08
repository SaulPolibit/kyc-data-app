// ============================================
// ENUM TYPES (matching Bridge API)
// ============================================

export type CustomerType = 'individual' | 'business';

export type CustomerStatus =
  | 'draft' | 'pending' | 'submitted' | 'approved' | 'rejected'
  | 'under_review' | 'awaiting_ubo' | 'awaiting_questionnaire' | 'paused' | 'offboarded';

export type BusinessType = 'sole_prop' | 'partnership' | 'corporation' | 'llc' | 'trust' | 'cooperative' | 'other';

export type IdType =
  // USA
  | 'ssn' | 'itin' | 'ein'
  // Canada
  | 'sin' | 'bn'
  // Mexico
  | 'rfc' | 'curp'
  // Brazil
  | 'cpf' | 'cnpj'
  // Other countries
  | 'cuit' | 'rut' | 'nif' | 'nie' | 'cif' | 'codice_fiscale' | 'partita_iva'
  | 'siret' | 'siren' | 'tin' | 'ust_idnr' | 'nino' | 'utr' | 'crn'
  | 'abn' | 'acn' | 'tfn' | 'ird' | 'nzbn' | 'pan' | 'gstin' | 'cin'
  | 'uen' | 'nric' | 'fin' | 'hkid' | 'brn'
  // Generic
  | 'national_id' | 'passport' | 'drivers_license' | 'vat' | 'other';

export type DocumentPurpose =
  // Individual
  | 'proof_of_address' | 'proof_of_source_of_funds' | 'proof_of_source_of_wealth'
  | 'proof_of_tax_identification' | 'proof_of_account_purpose'
  | 'proof_of_individual_name_change' | 'proof_of_relationship'
  // Business
  | 'business_formation' | 'ownership_chart' | 'ownership_information'
  | 'directors_registry' | 'evidence_of_good_standing' | 'proof_of_nature_of_business'
  | 'flow_of_funds' | 'aml_comfort_letter'
  // Other
  | 'other';

export type IndividualAccountPurpose =
  | 'charitable_donations' | 'ecommerce_retail_payments' | 'investment_purposes'
  | 'operating_a_company' | 'payments_to_friends_or_family_abroad'
  | 'personal_or_living_expenses' | 'protect_wealth' | 'purchase_goods_and_services'
  | 'receive_payment_for_freelancing' | 'receive_salary' | 'other';

export type BusinessAccountPurpose =
  | 'charitable_donations' | 'ecommerce_retail_payments' | 'investment_purposes'
  | 'payments_to_friends_or_family_abroad' | 'payroll' | 'personal_or_living_expenses'
  | 'protect_wealth' | 'purchase_goods_and_services' | 'receive_payments_for_goods_and_services'
  | 'tax_optimization' | 'third_party_money_transmission' | 'treasury_management' | 'other';

export type EmploymentStatus = 'employed' | 'homemaker' | 'retired' | 'self_employed' | 'student' | 'unemployed';

export type IndividualSourceOfFunds =
  | 'company_funds' | 'ecommerce_reseller' | 'gambling_proceeds' | 'gifts'
  | 'government_benefits' | 'inheritance' | 'investments_loans' | 'pension_retirement'
  | 'salary' | 'sale_of_assets_real_estate' | 'savings' | 'someone_elses_funds';

export type BusinessSourceOfFunds =
  | 'business_loans' | 'grants' | 'inter_company_funds' | 'investment_proceeds'
  | 'legal_settlement' | 'owners_capital' | 'pension_retirement' | 'sale_of_assets'
  | 'sales_of_goods_and_services' | 'third_party_funds' | 'treasury_reserves';

export type ExpectedMonthlyPayments = '0_4999' | '5000_9999' | '10000_49999' | '50000_plus';

export type EstimatedAnnualRevenue =
  | '0_99999' | '100000_999999' | '1000000_9999999'
  | '10000000_49999999' | '50000000_249999999' | '250000000_plus';

export type HighRiskActivity =
  | 'adult_entertainment' | 'gambling' | 'hold_client_funds' | 'investment_services'
  | 'lending_banking' | 'marijuana_or_related_services' | 'money_services'
  | 'nicotine_tobacco_or_related_services'
  | 'operate_foreign_exchange_virtual_currencies_brokerage_otc'
  | 'pharmaceuticals' | 'precious_metals_precious_stones_jewelry'
  | 'safe_deposit_box_rentals' | 'third_party_payment_processing'
  | 'weapons_firearms_and_explosives' | 'none_of_the_above';

export type EndorsementType = 'base' | 'cards' | 'cop' | 'faster_payments' | 'pix' | 'sepa' | 'spei';

// ============================================
// INTERFACES
// ============================================

export interface Address {
  id?: string;
  customer_id?: string;
  address_type: 'residential' | 'registered' | 'physical';
  is_transliterated?: boolean;
  street_line_1: string;
  street_line_2?: string;
  city: string;
  subdivision?: string;
  postal_code?: string;
  country: string;
}

export interface IdentifyingInformation {
  id?: string;
  customer_id?: string;
  associated_person_id?: string;
  type: IdType;
  issuing_country: string;
  number?: string;
  number_encrypted?: string;
  description?: string;
  expiration?: string;
  image_front?: string;
  image_front_encrypted?: string;
  image_back?: string;
  image_back_encrypted?: string;
}

export interface Document {
  id?: string;
  customer_id?: string;
  associated_person_id?: string;
  purposes: DocumentPurpose[];
  description?: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  base64_data?: string;
  base64_data_encrypted?: string;
  submitted_to_bridge?: boolean;
  submitted_at?: string;
}

export interface AssociatedPerson {
  id?: string;
  customer_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  transliterated_first_name?: string;
  transliterated_middle_name?: string;
  transliterated_last_name?: string;
  email: string;
  phone?: string;
  birth_date: string;
  title?: string;
  has_ownership: boolean;
  ownership_percentage?: number;
  has_control: boolean;
  is_signer: boolean;
  is_director?: boolean;
  attested_ownership_structure_at?: string;
  relationship_established_at?: string;
  verified_govid_at?: string;
  verified_selfie_at?: string;
  completed_customer_safety_check_at?: string;
  address?: Omit<Address, 'customer_id' | 'address_type'>;
  transliterated_address?: Omit<Address, 'customer_id' | 'address_type'>;
  identifying_information?: IdentifyingInformation[];
  documents?: Document[];
}

export interface PubliclyTradedListing {
  id?: string;
  customer_id: string;
  market_identifier_code: string;
  stock_number: string;
  ticker: string;
}

export interface RegulatedActivity {
  id?: string;
  customer_id: string;
  regulated_activities_description: string;
  primary_regulatory_authority_country: string;
  primary_regulatory_authority_name: string;
  license_number: string;
}

export interface Customer {
  id?: string;
  type: CustomerType;
  status?: CustomerStatus;

  // Individual fields
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  transliterated_first_name?: string;
  transliterated_middle_name?: string;
  transliterated_last_name?: string;
  birth_date?: string;
  nationality?: string;
  individual_account_purpose?: IndividualAccountPurpose;
  individual_account_purpose_other?: string;
  employment_status?: EmploymentStatus;
  most_recent_occupation?: string;
  individual_source_of_funds?: IndividualSourceOfFunds;
  individual_expected_monthly_payments?: ExpectedMonthlyPayments;
  individual_acting_as_intermediary?: boolean;
  individual_verified_govid_at?: string;
  individual_verified_selfie_at?: string;
  individual_completed_safety_check_at?: string;

  // Business fields
  business_legal_name?: string;
  business_trade_name?: string;
  transliterated_business_legal_name?: string;
  transliterated_business_trade_name?: string;
  business_type?: BusinessType;
  business_description?: string;
  primary_website?: string;
  other_websites?: string[];
  is_dao?: boolean;
  business_industry?: string[];
  estimated_annual_revenue_usd?: EstimatedAnnualRevenue;
  business_expected_monthly_payments_usd?: number;
  business_source_of_funds?: BusinessSourceOfFunds;
  business_source_of_funds_description?: string;
  business_account_purpose?: BusinessAccountPurpose;
  business_account_purpose_other?: string;
  business_acting_as_intermediary?: boolean;
  operates_in_prohibited_countries?: boolean;
  high_risk_activities?: HighRiskActivity[];
  high_risk_activities_explanation?: string;
  conducts_money_services?: boolean;
  conducts_money_services_using_bridge?: boolean;
  conducts_money_services_description?: string;
  compliance_screening_explanation?: string;
  ownership_threshold?: number;
  has_material_intermediary_ownership?: boolean;

  // Common fields
  email: string;
  phone?: string;
  signed_agreement_id?: string;
  endorsements?: EndorsementType[];
  bridge_customer_id?: string;
  bridge_response?: Record<string, unknown>;

  // Related data
  addresses?: Address[];
  transliterated_addresses?: Address[];
  identifying_information?: IdentifyingInformation[];
  documents?: Document[];
  associated_persons?: AssociatedPerson[];
  publicly_traded_listings?: PubliclyTradedListing[];
  regulated_activity?: RegulatedActivity;

  // Timestamps
  created_at?: string;
  updated_at?: string;
  submitted_at?: string;
}
