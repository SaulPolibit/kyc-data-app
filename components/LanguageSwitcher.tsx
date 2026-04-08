'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useLocale } from 'next-intl';
import { locales, localeNames, type Locale } from '@/i18n/config';

export function LanguageSwitcher({ currentLocale }: { currentLocale?: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const detectedLocale = useLocale() as Locale;
  const locale = currentLocale || detectedLocale;

  function handleChange(newLocale: Locale) {
    // Set cookie and refresh
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="relative inline-block">
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none bg-transparent border border-gray-300 rounded-md px-3 py-1.5 pr-8 text-sm cursor-pointer hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

// Compact version for navbar
export function LanguageSwitcherCompact({ currentLocale }: { currentLocale?: Locale }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const detectedLocale = useLocale() as Locale;
  const locale = currentLocale || detectedLocale;

  function handleChange(newLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          disabled={isPending || loc === locale}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            loc === locale
              ? 'bg-blue-100 text-blue-700'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          } disabled:opacity-50`}
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}

// Minimal version with globe icon for public forms
export function LanguageSwitcherMinimal() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const locale = useLocale() as Locale;

  function handleChange(newLocale: Locale) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="relative inline-flex items-center">
      <svg className="w-4 h-4 text-gray-400 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
      <select
        value={locale}
        onChange={(e) => handleChange(e.target.value as Locale)}
        disabled={isPending}
        className="appearance-none bg-transparent text-sm text-gray-600 cursor-pointer hover:text-gray-800 focus:outline-none disabled:opacity-50 pr-5"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc}>
            {localeNames[loc]}
          </option>
        ))}
      </select>
      <svg className="w-3 h-3 text-gray-400 absolute right-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}
