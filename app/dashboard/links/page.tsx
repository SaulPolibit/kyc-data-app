'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { KycLink, CreateLinkRequest } from '@/types/links';

export default function LinksPage() {
  const t = useTranslations('links');
  const tCommon = useTranslations('common');

  const [links, setLinks] = useState<KycLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState<{ link: KycLink; urls: { shareable: string; embed: string } } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchLinks();
  }, []);

  async function fetchLinks() {
    try {
      const response = await fetch('/api/links', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login';
          return;
        }
        throw new Error('Failed to fetch links');
      }
      const data = await response.json();
      setLinks(data.links || []);
    } catch (error) {
      console.error('Failed to fetch links:', error);
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      expired: 'bg-gray-100 text-gray-800',
      revoked: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  }

  function getRemainingDays(expiresAt: string | undefined): { text: string; style: string } {
    if (!expiresAt) {
      return { text: tCommon('never'), style: 'text-gray-500' };
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
      return { text: tCommon('oneDayLeft'), style: 'text-orange-600 font-medium' };
    } else if (diffDays <= 3) {
      return { text: tCommon('daysLeft', { count: diffDays }), style: 'text-orange-500' };
    } else if (diffDays <= 7) {
      return { text: tCommon('daysLeft', { count: diffDays }), style: 'text-yellow-600' };
    } else {
      return { text: tCommon('daysLeft', { count: diffDays }), style: 'text-gray-600' };
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('createEmbedLink')}
        </button>
      </div>

      {/* Quick Guide */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">{t('howToEmbed')}</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>{t('step1')}</li>
          <li>{t('step2')}</li>
          <li>{t('step3')}</li>
          <li>{t('step4')}</li>
        </ol>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : links.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">{t('noLinksYet')}</h3>
          <p className="text-gray-600 mb-4">{t('noLinksDescription')}</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {t('createEmbedLink')}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('link')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('type')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('status')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('expires')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('created')}</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {links.map((link) => (
                <tr key={link.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{link.title || t('untitled')}</p>
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                        {link.token.substring(0, 16)}...
                      </code>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      link.link_type === 'individual' ? 'bg-purple-100 text-purple-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {link.link_type === 'individual' ? t('kyc') : t('kyb')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(link.status)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {(() => {
                      const remaining = getRemainingDays(link.expires_at);
                      return <span className={remaining.style}>{remaining.text}</span>;
                    })()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(link.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => copyToClipboard(`${baseUrl}/kyc/${link.token}`, `url-${link.id}`)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                        title={t('shareableLink')}
                      >
                        {copiedId === `url-${link.id}` ? (
                          <>
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {tCommon('copied')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                            </svg>
                            {t('link')}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(generateEmbedCode(baseUrl, link.token), `embed-${link.id}`)}
                        className="text-purple-600 hover:text-purple-800 text-sm flex items-center gap-1"
                        title={t('embedCode')}
                      >
                        {copiedId === `embed-${link.id}` ? (
                          <>
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {tCommon('copied')}
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                            {t('embed')}
                          </>
                        )}
                      </button>
                      <Link
                        href={`/dashboard/links/${link.id}`}
                        className="text-gray-600 hover:text-gray-800 text-sm"
                      >
                        {tCommon('details')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Link Modal */}
      {showCreateModal && (
        <CreateLinkModal
          onClose={() => setShowCreateModal(false)}
          onCreated={(link, urls) => {
            setLinks([link, ...links]);
            setShowCreateModal(false);
            setShowSuccessModal({ link, urls });
          }}
        />
      )}

      {/* Success Modal with Embed Code */}
      {showSuccessModal && (
        <SuccessModal
          link={showSuccessModal.link}
          urls={showSuccessModal.urls}
          onClose={() => setShowSuccessModal(null)}
        />
      )}
    </div>
  );
}

function generateEmbedCode(baseUrl: string, token: string): string {
  return `<iframe
  src="${baseUrl}/embed/${token}"
  width="100%"
  height="700"
  frameborder="0"
  allow="camera; microphone"
  style="border: none; border-radius: 8px;"
></iframe>`;
}

function SuccessModal({
  link,
  urls,
  onClose,
}: {
  link: KycLink;
  urls: { shareable: string; embed: string };
  onClose: () => void;
}) {
  const t = useTranslations('links');
  const tCommon = useTranslations('common');
  const tDetails = useTranslations('linkDetails');

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const embedCode = generateEmbedCode(urls.embed.replace('/embed/', '').replace(link.token, ''), link.token);
  const baseUrl = urls.shareable.replace(`/kyc/${link.token}`, '');

  function copy(text: string, field: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('linkCreatedSuccess')}</h2>
              <p className="text-sm text-gray-600">{link.title || t('linkReadyToUse')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Shareable Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('shareableLink')}
              <span className="font-normal text-gray-500 ml-2">{t('sendToUsers')}</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urls.shareable}
                readOnly
                className="flex-1 px-3 py-2 bg-gray-50 border rounded-md text-sm font-mono"
              />
              <button
                onClick={() => copy(urls.shareable, 'url')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                {copiedField === 'url' ? tCommon('copied') : tCommon('copy')}
              </button>
            </div>
          </div>

          {/* Embed Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('embedCode')}
              <span className="font-normal text-gray-500 ml-2">{t('pasteIntoWebsite')}</span>
            </label>
            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-sm overflow-x-auto font-mono">
                {generateEmbedCode(baseUrl, link.token)}
              </pre>
              <button
                onClick={() => copy(generateEmbedCode(baseUrl, link.token), 'embed')}
                className="absolute top-2 right-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                {copiedField === 'embed' ? tCommon('copied') : tDetails('copyCode')}
              </button>
            </div>
          </div>

          {/* Preview Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('preview')}
            </label>
            <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
              <div className="bg-white rounded-lg shadow-sm overflow-hidden" style={{ height: '300px' }}>
                <iframe
                  src={`${baseUrl}/embed/${link.token}`}
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                  title="KYC Form Preview"
                />
              </div>
            </div>
          </div>

          {/* Webhook Info */}
          {link.webhook_url && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-1">{t('webhookConfigured')}</h4>
              <p className="text-sm text-gray-600">
                {t('notificationsWillBeSentTo')} <code className="bg-gray-200 px-1 rounded">{link.webhook_url}</code>
              </p>
            </div>
          )}

          {/* JavaScript Events */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('listenForEvents')}
            </label>
            <pre className="bg-gray-900 text-gray-100 p-4 rounded-md text-xs overflow-x-auto font-mono">
{`window.addEventListener('message', (event) => {
  if (event.data.type === 'kyc:complete') {
    console.log('KYC completed!', event.data.customer_id);
    // Handle completion in your app
  }
  if (event.data.type === 'kyc:step') {
    console.log('Step:', event.data.step, '/', event.data.totalSteps);
  }
});`}
            </pre>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
          <Link
            href={`/dashboard/links/${link.id}`}
            className="px-4 py-2 border rounded-md text-gray-700 hover:bg-white"
          >
            {t('viewDetails')}
          </Link>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {tCommon('done')}
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (link: KycLink, urls: { shareable: string; embed: string }) => void;
}) {
  const t = useTranslations('links');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const [formData, setFormData] = useState<CreateLinkRequest>({
    link_type: 'individual',
    access_type: 'single_use',
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tErrors('saveFailed'));
        setCreating(false);
        return;
      }

      onCreated(data.link, data.urls);
    } catch (err) {
      setError(tErrors('saveFailed'));
      setCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-semibold">{t('createLinkModal')}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {/* Basic Settings */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('verificationType')} *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, link_type: 'individual' })}
                className={`p-3 border rounded-lg text-left ${
                  formData.link_type === 'individual'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{t('individual')}</div>
                <div className="text-xs text-gray-500">{t('personalVerification')}</div>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, link_type: 'business' })}
                className={`p-3 border rounded-lg text-left ${
                  formData.link_type === 'business'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{t('business')}</div>
                <div className="text-xs text-gray-500">{t('companyVerification')}</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('titleField')}
            </label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('titlePlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('descriptionField')}
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          {/* Usage is always single_use - hidden from UI */}

          {/* Advanced Settings Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <svg
              className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {t('advancedSettings')}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('redirectUrl')}
                  <span className="font-normal text-gray-500 ml-1">{t('afterCompletion')}</span>
                </label>
                <input
                  type="url"
                  value={formData.redirect_url || ''}
                  onChange={(e) => setFormData({ ...formData, redirect_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('redirectPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('webhookUrl')}
                  <span className="font-normal text-gray-500 ml-1">{t('receiveNotifications')}</span>
                </label>
                <input
                  type="url"
                  value={formData.webhook_url || ''}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('webhookPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('externalId')}
                  <span className="font-normal text-gray-500 ml-1">{t('yourReference')}</span>
                </label>
                <input
                  type="text"
                  value={formData.external_id || ''}
                  onChange={(e) => setFormData({ ...formData, external_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('externalIdPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('logoUrl')}
                  <span className="font-normal text-gray-500 ml-1">{t('customBranding')}</span>
                </label>
                <input
                  type="url"
                  value={formData.logo_url || ''}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('logoPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('brandColor')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={formData.primary_color || '#3B82F6'}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="w-12 h-10 rounded border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.primary_color || '#3B82F6'}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('allowedDomains')}
                  <span className="font-normal text-gray-500 ml-1">{t('restrictEmbedding')}</span>
                </label>
                <input
                  type="text"
                  value={formData.allowed_domains || ''}
                  onChange={(e) => setFormData({ ...formData, allowed_domains: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={t('domainsPlaceholder')}
                />
                <p className="text-xs text-gray-500 mt-1">{t('domainsHelp')}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? t('creating') : t('createLink')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
