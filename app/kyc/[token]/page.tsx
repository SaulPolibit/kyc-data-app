'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { PublicLinkInfo, CustomerType } from '@/types/links';
import type { KYCFormData, KYBFormData } from '@/types/public-forms';
import {
  KYCPersonalInfoStep,
  KYCIdentificationStep,
  KYCDocumentsStep,
  KYCReviewStep,
  KYBBusinessInfoStep,
  KYBAddressStep,
  KYBOwnersStep,
  KYBDocumentsStep,
  KYBReviewStep,
  AddressStep,
} from '@/components/public-forms';
import { LanguageSwitcherMinimal } from '@/components/LanguageSwitcher';

interface SessionInfo {
  session_token: string;
  total_steps: number;
  expires_at: string;
  link: PublicLinkInfo;
}

export default function PublicKYCPage() {
  const t = useTranslations('kycForm');
  const tSteps = useTranslations('kycSteps');
  const tCommon = useTranslations('common');
  const tAddress = useTranslations('addressForm');
  const tValidation = useTranslations('validation');
  const tApiErrors = useTranslations('apiErrors');

  // KYC Steps: 1=Personal, 2=ID, 3=Address, 4=Documents, 5=Review
  // KYB Steps: 1=Business, 2=Address, 3=Owners, 4=Documents, 5=Review
  const KYC_STEPS = [tSteps('personalInfo'), tSteps('identification'), tSteps('address'), tSteps('documents'), tSteps('review')];
  const KYB_STEPS = [tSteps('businessInfo'), tSteps('addresses'), tSteps('beneficialOwners'), tSteps('documents'), tSteps('review')];

  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<KYCFormData | KYBFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const isKYC = session?.link?.link_type === 'individual';
  const totalSteps = 5; // Both KYC and KYB now have 5 steps
  const stepLabels = isKYC ? KYC_STEPS : KYB_STEPS;

  // Helper to translate API error codes
  const translateError = (errorCode: string): string => {
    // Check if it's a known error code
    const knownCodes = [
      'IP_ACCESS_DENIED', 'LINK_NOT_FOUND', 'LINK_EXPIRED',
      'FETCH_LINK_FAILED', 'CREATE_SESSION_FAILED', 'RETRIEVE_SESSION_FAILED',
      'START_SESSION_FAILED', 'SUBMIT_FAILED', 'INIT_FAILED'
    ];
    if (knownCodes.includes(errorCode)) {
      return tApiErrors(errorCode as Parameters<typeof tApiErrors>[0]);
    }
    // If it's not a known code, return it as-is (might be a legacy message)
    return errorCode || tApiErrors('unknownError');
  };

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        const existingSessionToken = localStorage.getItem(`kyc_session_${token}`);

        if (existingSessionToken) {
          const response = await fetch(`/api/public/session/${existingSessionToken}`);
          if (response.ok) {
            const data = await response.json();
            if (!data.is_completed) {
              // Get link info to determine type
              const linkResponse = await fetch(`/api/public/link/${token}`);
              const linkData = await linkResponse.json();

              setSession({
                session_token: existingSessionToken,
                total_steps: data.total_steps,
                expires_at: data.expires_at,
                link: linkData.link,  // Extract link from response
              });
              setCurrentStep(data.current_step);
              setFormData(data.form_data || {});
              setLoading(false);
              return;
            }
          }
          localStorage.removeItem(`kyc_session_${token}`);
        }

        // Start new session
        const response = await fetch(`/api/public/link/${token}`, {
          method: 'POST',
        });

        if (!response.ok) {
          const data = await response.json();
          setError(translateError(data.error || 'START_SESSION_FAILED'));
          setLoading(false);
          return;
        }

        const data: SessionInfo = await response.json();
        setSession(data);
        localStorage.setItem(`kyc_session_${token}`, data.session_token);
        setLoading(false);
      } catch {
        setError(translateError('INIT_FAILED'));
        setLoading(false);
      }
    }

    initSession();
  }, [token]);

  // Save progress
  const saveProgress = useCallback(async () => {
    if (!session) return;

    try {
      await fetch(`/api/public/session/${session.session_token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_step: currentStep,
          form_data: formData,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [session, currentStep, formData]);

  // Validate current step
  const validateStep = (): boolean => {
    const errors: Record<string, string> = {};

    if (isKYC) {
      const kycData = formData as Partial<KYCFormData>;
      switch (currentStep) {
        case 1: // Personal Info
          if (!kycData.first_name?.trim()) errors.first_name = 'First name is required';
          if (!kycData.last_name?.trim()) errors.last_name = 'Last name is required';
          if (!kycData.email?.trim()) errors.email = 'Email is required';
          if (!kycData.birth_date) errors.birth_date = 'Date of birth is required';
          break;
        case 2: // Identification
          if (!kycData.identifying_information?.some((id) => id.number)) {
            errors.tax_id = 'Tax ID is required';
          }
          break;
        case 3: // Address
          if (!kycData.residential_address?.street_line_1) errors.street_line_1 = 'Street address is required';
          if (!kycData.residential_address?.city) errors.city = 'City is required';
          if (!kycData.residential_address?.postal_code) errors.postal_code = 'Postal code is required';
          break;
      }
    } else {
      const kybData = formData as Partial<KYBFormData>;
      switch (currentStep) {
        case 1: // Business Info
          if (!kybData.business_legal_name?.trim()) errors.business_legal_name = 'Business name is required';
          if (!kybData.business_type) errors.business_type = 'Business type is required';
          if (!kybData.email?.trim()) errors.email = 'Email is required';
          break;
        case 2: // Addresses
          if (!kybData.registered_address?.street_line_1) errors['registered_address.street_line_1'] = 'Street address is required';
          if (!kybData.registered_address?.city) errors['registered_address.city'] = 'City is required';
          break;
        case 3: // Owners
          if (!kybData.associated_persons?.length) {
            errors.associated_persons = 'At least one person is required';
          } else {
            const hasControl = kybData.associated_persons.some((p) => p.has_control);
            const hasSigner = kybData.associated_persons.some((p) => p.is_signer);
            if (!hasControl) errors.control_person = 'At least one control person is required';
            if (!hasSigner) errors.signer = 'At least one authorized signer is required';
          }
          break;
        case 4: // Documents
          // Documents validation - formation and ownership required for non-sole-prop
          if (kybData.business_type !== 'sole_prop') {
            const hasFormation = kybData.documents?.some((d) => d.purposes.includes('business_formation'));
            const hasOwnership = kybData.documents?.some((d) => d.purposes.includes('ownership_information'));
            if (!hasFormation) errors['documents.business_formation'] = 'Business formation document is required';
            if (!hasOwnership) errors['documents.ownership_information'] = 'Ownership document is required';
          }
          break;
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle next step
  const handleNext = async () => {
    if (!validateStep()) return;
    await saveProgress();
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setValidationErrors({});
    }
  };

  // Handle previous step
  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setValidationErrors({});
    }
  };

  // Handle edit from review
  const handleEdit = (step: number) => {
    setCurrentStep(step);
    setValidationErrors({});
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!session) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/session/${session.session_token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: formData }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(translateError(data.error || 'SUBMIT_FAILED'));
        setSubmitting(false);
        return;
      }

      localStorage.removeItem(`kyc_session_${token}`);

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        router.push(`/kyc/${token}/complete`);
      }
    } catch {
      setError(translateError('SUBMIT_FAILED'));
      setSubmitting(false);
    }
  };

  // Update form data
  const updateFormData = (updates: Record<string, unknown>) => {
    setFormData((prev) => ({ ...prev, ...updates }) as Partial<KYCFormData | KYBFormData>);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loadingForm')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('unableToLoad')}</h1>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {tCommon('tryAgain')}
          </button>
        </div>
      </div>
    );
  }

  const primaryColor = session?.link?.primary_color || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcherMinimal />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          {session?.link?.logo_url && (
            <img
              src={session.link.logo_url}
              alt="Logo"
              className="h-12 mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">
            {session?.link?.title || (isKYC ? t('identityVerification') : t('businessVerification'))}
          </h1>
          {session?.link?.description && (
            <p className="mt-2 text-gray-600">{session.link.description}</p>
          )}
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === currentStep;
              const isCompleted = stepNumber < currentStep;

              return (
                <div key={index} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center w-full">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                        isActive
                          ? 'text-white'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                      style={{ backgroundColor: isActive ? primaryColor : undefined }}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        stepNumber
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs text-center hidden sm:block ${
                        isActive ? 'text-gray-900 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {index < stepLabels.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 rounded ${
                        stepNumber < currentStep ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 text-center mt-4 sm:hidden">
            {t('stepOf', { current: currentStep, total: totalSteps })}: {stepLabels[currentStep - 1]}
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {/* KYC Steps */}
          {isKYC && (
            <>
              {currentStep === 1 && (
                <KYCPersonalInfoStep
                  data={formData as Partial<KYCFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                />
              )}
              {currentStep === 2 && (
                <KYCIdentificationStep
                  data={formData as Partial<KYCFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                  country={(formData as Partial<KYCFormData>).nationality}
                />
              )}
              {currentStep === 3 && (
                <AddressStep
                  data={(formData as Partial<KYCFormData>).residential_address || {}}
                  onChange={(addr) => updateFormData({ residential_address: addr } as Partial<KYCFormData>)}
                  errors={validationErrors}
                />
              )}
              {currentStep === 4 && (
                <KYCDocumentsStep
                  data={formData as Partial<KYCFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                />
              )}
              {currentStep === 5 && (
                <KYCReviewStep
                  data={formData as Partial<KYCFormData>}
                  onEdit={handleEdit}
                />
              )}
            </>
          )}

          {/* KYB Steps */}
          {!isKYC && (
            <>
              {currentStep === 1 && (
                <KYBBusinessInfoStep
                  data={formData as Partial<KYBFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                />
              )}
              {currentStep === 2 && (
                <KYBAddressStep
                  data={formData as Partial<KYBFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                />
              )}
              {currentStep === 3 && (
                <KYBOwnersStep
                  data={formData as Partial<KYBFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                />
              )}
              {currentStep === 4 && (
                <KYBDocumentsStep
                  data={formData as Partial<KYBFormData>}
                  onChange={updateFormData}
                  errors={validationErrors}
                  businessType={(formData as Partial<KYBFormData>).business_type}
                  conductsMoneyServices={(formData as Partial<KYBFormData>).conducts_money_services}
                  hasWebsite={!!(formData as Partial<KYBFormData>).primary_website}
                />
              )}
              {currentStep === 5 && (
                <KYBReviewStep
                  data={formData as Partial<KYBFormData>}
                  onEdit={handleEdit}
                />
              )}
            </>
          )}

          {/* Validation Errors Summary */}
          {Object.keys(validationErrors).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700 font-medium">{t('fixErrors')}</p>
              <ul className="mt-1 text-sm text-red-600 list-disc list-inside">
                {Object.values(validationErrors).map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {tCommon('back')}
            </button>

            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 rounded-lg text-white font-medium hover:opacity-90 transition-colors"
                style={{ backgroundColor: primaryColor }}
              >
                {tCommon('continue')}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-lg text-white font-medium hover:opacity-90 disabled:opacity-50 transition-colors flex items-center"
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('submitting')}
                  </>
                ) : (
                  t('submitVerification')
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            {t('secureProcessing')}
          </p>
        </div>
      </div>
    </div>
  );
}
