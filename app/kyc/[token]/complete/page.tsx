'use client';

import { useTranslations } from 'next-intl';

export default function KYCCompletePage() {
  const t = useTranslations('kycForm');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md p-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {t('submittedSuccessfully')}
        </h1>
        <p className="text-gray-600 mb-6">
          {t('verificationUnderReview')}
        </p>
      </div>
    </div>
  );
}
