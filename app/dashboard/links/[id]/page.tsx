'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { KycLink, LinkSession } from '@/types/links';

export default function LinkDetailsPage() {
  const t = useTranslations('linkDetails');
  const tCommon = useTranslations('common');
  const tLinks = useTranslations('links');
  const tErrors = useTranslations('errors');

  const params = useParams();
  const router = useRouter();
  const linkId = params.id as string;

  const [link, setLink] = useState<KycLink | null>(null);
  const [sessions, setSessions] = useState<LinkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'data' | 'embed'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null);
  const [loadingFormData, setLoadingFormData] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchLinkDetails();
  }, [linkId]);

  async function fetchLinkDetails() {
    try {
      const response = await fetch(
        `/api/links/${linkId}?include_sessions=true`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`,
          },
        }
      );

      if (!response.ok) {
        router.push('/dashboard/links');
        return;
      }

      const data = await response.json();
      setLink(data.link);
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Failed to fetch link:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFormData() {
    if (sessions.length === 0) return;

    setLoadingFormData(true);
    try {
      // Get form data from the first (and typically only) session
      const session = sessions.find(s => s.is_completed) || sessions[0];
      const response = await fetch(`/api/sessions/${session.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setFormData(data.session?.form_data || null);
      }
    } catch (error) {
      console.error('Failed to fetch form data:', error);
    } finally {
      setLoadingFormData(false);
    }
  }

  // Fetch form data when switching to data tab
  useEffect(() => {
    if (activeTab === 'data' && formData === null && sessions.length > 0) {
      fetchFormData();
    }
  }, [activeTab, sessions]);

  async function handleRevoke() {
    if (!link || !confirm(t('confirmRevoke'))) {
      return;
    }

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') || ''}`,
        },
        body: JSON.stringify({ status: 'revoked' }),
      });

      if (response.ok) {
        setLink({ ...link, status: 'revoked' });
      }
    } catch (error) {
      console.error('Failed to revoke link:', error);
    }
  }

  async function handleDeleteLink() {
    if (!confirm(t('confirmDelete'))) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        router.push('/dashboard/links');
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete link');
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
      alert('Failed to delete link');
    } finally {
      setDeleting(false);
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function getRemainingDays(expiresAt: string | undefined): { text: string; style: string } {
    if (!expiresAt) {
      return { text: tCommon('neverExpires'), style: 'text-gray-600' };
    }

    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffTime = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: tCommon('expired'), style: 'text-red-600 font-medium' };
    } else if (diffDays === 0) {
      return { text: tCommon('expiresToday'), style: 'text-orange-600 font-medium' };
    } else if (diffDays === 1) {
      return { text: tCommon('oneDayRemaining'), style: 'text-orange-600 font-medium' };
    } else if (diffDays <= 3) {
      return { text: tCommon('daysRemaining', { count: diffDays }), style: 'text-orange-500 font-medium' };
    } else if (diffDays <= 7) {
      return { text: tCommon('daysRemaining', { count: diffDays }), style: 'text-yellow-600' };
    } else {
      return { text: tCommon('daysRemaining', { count: diffDays }), style: 'text-green-600' };
    }
  }

  // Get the completed session if available
  const completedSession = sessions.find(s => s.is_completed);
  const hasSubmittedData = completedSession !== undefined;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const shareableUrl = link ? `${baseUrl}/kyc/${link.token}` : '';
  const embedUrl = link ? `${baseUrl}/embed/${link.token}` : '';

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">{tErrors('notFound')}</p>
      </div>
    );
  }

  const embedCode = `<iframe
  src="${embedUrl}"
  width="100%"
  height="800"
  frameborder="0"
  allow="camera; microphone"
  style="border: none; max-width: 100%;"
></iframe>`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={() => router.push('/dashboard/links')}
            className="text-blue-600 hover:text-blue-800 text-sm mb-2 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToLinks')}
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{link.title || tLinks('untitled')}</h1>
          <p className="text-gray-600">{link.description || t('noDescription')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm ${
            link.status === 'active' ? 'bg-green-100 text-green-800' :
            link.status === 'completed' ? 'bg-blue-100 text-blue-800' :
            link.status === 'revoked' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {link.status}
          </span>
          {link.status === 'active' && (
            <button
              onClick={handleRevoke}
              className="px-4 py-2 border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50"
            >
              {t('revoke')}
            </button>
          )}
          <button
            onClick={handleDeleteLink}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? t('deleting') : t('deleteLink')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {t('overview')}
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'data'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {t('submittedData')}
            {hasSubmittedData && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                1
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('embed')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'embed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {t('embed')}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold mb-4">{t('linkDetails')}</h3>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-600">{tCommon('type')}</dt>
              <dd className="font-medium capitalize">{link.link_type === 'individual' ? t('kycIndividual') : t('kybBusiness')}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t('accessType')}</dt>
              <dd className="font-medium capitalize">
                {link.access_type === 'single_use' ? t('singleUse') :
                 link.access_type === 'multi_use' ? t('multiUse') :
                 t('timeLimited')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{tCommon('created')}</dt>
              <dd className="font-medium">{new Date(link.created_at).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{tCommon('expires')}</dt>
              <dd className="font-medium">
                {link.expires_at ? (
                  <div>
                    <span className={getRemainingDays(link.expires_at).style}>
                      {getRemainingDays(link.expires_at).text}
                    </span>
                    <span className="text-gray-500 text-sm ml-2">
                      ({new Date(link.expires_at).toLocaleDateString()})
                    </span>
                  </div>
                ) : (
                  <span className="text-gray-600">{tCommon('neverExpires')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t('externalId')}</dt>
              <dd className="font-medium">{link.external_id || '-'}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">{t('submissionStatus')}</dt>
              <dd className="font-medium">
                {hasSubmittedData ? (
                  <span className="text-green-600">{t('dataSubmitted')}</span>
                ) : (
                  <span className="text-yellow-600">{t('pendingSubmission')}</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-3">{tLinks('shareableLink')}</h4>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareableUrl}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm"
              />
              <button
                onClick={() => copyToClipboard(shareableUrl, 'url')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {copiedField === 'url' ? tCommon('copied') : tCommon('copy')}
              </button>
            </div>
          </div>

          {link.redirect_url && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">{tLinks('redirectUrl')}</h4>
              <p className="text-sm text-gray-600">{link.redirect_url}</p>
            </div>
          )}

          {link.webhook_url && (
            <div className="mt-4">
              <h4 className="font-medium mb-2">{tLinks('webhookUrl')}</h4>
              <p className="text-sm text-gray-600">{link.webhook_url}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'data' && (
        <div className="bg-white rounded-lg shadow p-6">
          {loadingFormData ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : !hasSubmittedData ? (
            <div className="text-center py-12 text-gray-600">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('noDataYet')}</h3>
              <p>{t('noDataDescription')}</p>
              <p className="text-sm mt-2">{t('shareToCollect')}</p>
            </div>
          ) : formData ? (
            <div className="space-y-6">
              {/* Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">{t('sensitiveInfo')}</p>
                    <p className="text-sm text-yellow-700">{t('sensitiveInfoWarning')}</p>
                  </div>
                </div>
              </div>

              {/* Submission Info */}
              {completedSession && (
                <div className="space-y-2 text-sm text-gray-600 pb-4 border-b">
                  <div className="flex items-center justify-between">
                    <span>{t('submittedOn')} {new Date(completedSession.completed_at || completedSession.started_at).toLocaleString()}</span>
                    {completedSession.customer_id && (
                      <span>{t('customerId')} <code className="bg-gray-100 px-2 py-1 rounded text-xs">{completedSession.customer_id}</code></span>
                    )}
                  </div>
                  {completedSession.data_expires_at && (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {t('dataRetention')}{' '}
                        <span className={
                          new Date(completedSession.data_expires_at) < new Date()
                            ? 'text-red-600 font-medium'
                            : new Date(completedSession.data_expires_at).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000
                            ? 'text-orange-600 font-medium'
                            : 'text-gray-700'
                        }>
                          {new Date(completedSession.data_expires_at).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Form Data Display */}
              <div>
                <h4 className="font-medium mb-4">{t('submittedFormData')}</h4>
                <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm whitespace-pre-wrap">
                    {JSON.stringify(formData, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <p>{t('formDataNotAvailable')}</p>
              <p className="text-sm mt-2">{t('dataMayBeDeleted')}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'embed' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">{t('embedCodeTitle')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('embedCodeDescription')}
            </p>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
                <code>{embedCode}</code>
              </pre>
              <button
                onClick={() => copyToClipboard(embedCode, 'embed')}
                className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600"
              >
                {copiedField === 'embed' ? tCommon('copied') : t('copyCode')}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">{tLinks('preview')}</h3>
            <div className="border rounded-lg overflow-hidden" style={{ height: '500px' }}>
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="font-semibold mb-4">{t('jsEvents')}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {t('jsEventsDescription')}
            </p>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto">
              <code>{`window.addEventListener('message', (event) => {
  if (event.data.type === 'kyc:step') {
    console.log('Step:', event.data.step, '/', event.data.totalSteps);
  }
  if (event.data.type === 'kyc:complete') {
    console.log('Completed! Customer ID:', event.data.customer_id);
  }
  if (event.data.type === 'kyc:error') {
    console.error('Error:', event.data.error);
  }
});`}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
