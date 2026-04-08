'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function BusinessKYBPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to links page after a short delay to show the message
    const timer = setTimeout(() => {
      router.push('/dashboard/links');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
          </svg>
        </div>
        <h2 className="text-2xl font-semibold text-green-900 mb-2">
          Create a KYB Link Instead
        </h2>
        <p className="text-green-700 mb-6">
          As an admin, you should create embeddable KYB links for businesses to fill out their verification data.
          Direct data entry is reserved for users accessing their verification links.
        </p>
        <p className="text-sm text-green-600 mb-4">
          Redirecting you to the links page...
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/dashboard/links"
            className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Go to Verification Links
          </Link>
          <Link
            href="/dashboard"
            className="px-6 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
