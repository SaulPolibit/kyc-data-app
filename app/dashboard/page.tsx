'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { KycLink } from '@/types/links';

interface DashboardStats {
  totalLinks: number;
  activeLinks: number;
  totalSubmissions: number;
  completionRate: number;
}

interface Customer {
  id: string;
  customer_type: 'individual' | 'business';
  full_name?: string;
  business_name?: string;
  email?: string;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tLinks = useTranslations('links');

  const [links, setLinks] = useState<KycLink[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLinks: 0,
    activeLinks: 0,
    totalSubmissions: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Fetch links
      const linksRes = await fetch('/api/links', { credentials: 'include' });
      if (linksRes.ok) {
        const linksData = await linksRes.json();
        const linksList: KycLink[] = linksData.links || [];
        setLinks(linksList);

        // Calculate stats from links
        const activeLinks = linksList.filter(l => l.status === 'active').length;
        const totalSubmissions = linksList.reduce((sum, l) => sum + (l.submission_count || 0), 0);

        setStats({
          totalLinks: linksList.length,
          activeLinks,
          totalSubmissions,
          completionRate: linksList.length > 0 ? Math.round((totalSubmissions / linksList.length) * 100) : 0,
        });
      }

      // Fetch recent customers (collected via links)
      try {
        const customersRes = await fetch('/api/customers', { credentials: 'include' });
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.customers || []);
        }
      } catch (err) {
        // Customers might not be available if migration hasn't been run
        console.warn('Could not fetch customers:', err);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('title')}
          </h1>
          <p className="text-gray-600">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-4">
          <Link
            href="/dashboard/links"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('createKycLink')}
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">{t('totalLinks')}</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalLinks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">{t('activeLinks')}</p>
          <p className="text-3xl font-bold text-green-600">{stats.activeLinks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">{t('totalSubmissions')}</p>
          <p className="text-3xl font-bold text-blue-600">{stats.totalSubmissions}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm text-gray-500">{t('customersCollected')}</p>
          <p className="text-3xl font-bold text-purple-600">{customers.length}</p>
        </div>
      </div>

      {/* Quick Actions - Embeddable Links */}
      <div className="mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{t('embeddableForms')}</h3>
              <p className="text-gray-600 max-w-2xl">
                {t('embeddableDescription')}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/links"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 whitespace-nowrap flex items-center gap-2"
          >
            {t('manageLinks')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* Recent Links */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">{t('recentLinks')}</h2>
          <Link href="/dashboard/links" className="text-sm text-blue-600 hover:text-blue-800">
            {tCommon('viewAll')}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : links.length === 0 ? (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
            </svg>
            <p className="text-gray-500 mb-4">{t('noLinksYet')}</p>
            <Link
              href="/dashboard/links"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('createFirstLink')}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tLinks('link')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCommon('type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCommon('status')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('totalSubmissions')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {tCommon('created')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {links.slice(0, 5).map((link) => (
                  <tr key={link.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/dashboard/links/${link.id}`} className="text-sm font-medium text-gray-900 hover:text-blue-600">
                        {link.title || tLinks('untitled')}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${link.link_type === 'individual' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}
                      `}>
                        {link.link_type === 'individual' ? tLinks('kyc') : tLinks('kyb')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`
                        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${link.status === 'active' ? 'bg-green-100 text-green-800' :
                          link.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          link.status === 'expired' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'}
                      `}>
                        {link.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {link.submission_count || 0}
                      {link.max_submissions && ` / ${link.max_submissions}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(link.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Getting Started */}
      {!loading && links.length === 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            {t('gettingStarted')}
          </h3>
          <p className="text-blue-800 mb-4">
            {t('gettingStartedDescription')}
          </p>
          <div className="flex gap-4">
            <Link
              href="/dashboard/links"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('createKycLink')}
            </Link>
            <Link
              href="/dashboard/webhooks"
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50"
            >
              {t('configureWebhooks')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
