'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { Webhook, WebhookDelivery, CreateWebhookRequest, WebhookEvent } from '@/types/webhooks';
import { WEBHOOK_EVENTS } from '@/types/webhooks';

export default function WebhooksPage() {
  const t = useTranslations('webhooks');
  const tCommon = useTranslations('common');

  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [activeTab, setActiveTab] = useState<'webhooks' | 'deliveries'>('webhooks');

  useEffect(() => {
    fetchWebhooks();
    fetchDeliveries();
  }, []);

  async function fetchWebhooks() {
    try {
      const response = await fetch('/api/webhooks', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeliveries() {
    try {
      const response = await fetch('/api/webhooks/deliveries', { credentials: 'include' });
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data.deliveries || []);
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
    }
  }

  async function deleteWebhook(id: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (response.ok) {
        setWebhooks(webhooks.filter(w => w.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  }

  async function testWebhook(id: string) {
    try {
      const response = await fetch(`/api/webhooks/${id}/test`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Test sent! Response: ${data.status}`);
        fetchDeliveries();
      } else {
        alert(`Test failed: ${data.error}`);
      }
    } catch (error) {
      alert('Failed to send test webhook');
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      failed: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full ${styles[status] || styles.inactive}`}>
        {status}
      </span>
    );
  }

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
          {t('addWebhook')}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-medium text-blue-900 mb-2">{t('howWebhooksWork')}</h3>
        <p className="text-sm text-blue-800 mb-2">
          {t('webhooksDescription')}
        </p>
        <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
          <li>{t('jsonEncoded')}</li>
          <li>{t('signatureHeader')}</li>
          <li>{t('retriedDeliveries')}</li>
        </ul>
      </div>

      {/* Tabs */}
      <div className="border-b mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'webhooks'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('endpoints')} ({webhooks.length})
          </button>
          <button
            onClick={() => setActiveTab('deliveries')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'deliveries'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('recentDeliveries')} ({deliveries.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : activeTab === 'webhooks' ? (
        webhooks.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-1">{t('noWebhooksConfigured')}</h3>
            <p className="text-gray-600 mb-4">{t('addWebhookDescription')}</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {t('addWebhook')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(webhook.status)}
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded truncate max-w-md">
                        {webhook.url}
                      </code>
                    </div>
                    {webhook.description && (
                      <p className="text-sm text-gray-600 mb-2">{webhook.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {webhook.events.map((event) => (
                        <span key={event} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          {event}
                        </span>
                      ))}
                    </div>
                    {webhook.last_triggered_at && (
                      <p className="text-xs text-gray-500 mt-2">
                        {t('lastTriggered')} {new Date(webhook.last_triggered_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => testWebhook(webhook.id)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    >
                      {t('test')}
                    </button>
                    <button
                      onClick={() => setSelectedWebhook(webhook)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      {tCommon('edit')}
                    </button>
                    <button
                      onClick={() => deleteWebhook(webhook.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                    >
                      {tCommon('delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        deliveries.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-600">{t('noDeliveriesYet')}</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('event')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tCommon('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('response')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('duration')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('time')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {deliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="text-sm font-mono">{delivery.event}</span>
                    </td>
                    <td className="px-6 py-4">
                      {delivery.success ? (
                        <span className="flex items-center text-green-600 text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {t('successStatus')}
                        </span>
                      ) : (
                        <span className="flex items-center text-red-600 text-sm">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          {t('failedStatus')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {delivery.response_status || delivery.error_message || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {delivery.duration_ms ? `${delivery.duration_ms}${t('ms')}` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(delivery.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && (
        <WebhookModal
          onClose={() => setShowCreateModal(false)}
          onSaved={(webhook) => {
            setWebhooks([webhook, ...webhooks]);
            setShowCreateModal(false);
          }}
        />
      )}

      {/* Edit Webhook Modal */}
      {selectedWebhook && (
        <WebhookModal
          webhook={selectedWebhook}
          onClose={() => setSelectedWebhook(null)}
          onSaved={(webhook) => {
            setWebhooks(webhooks.map(w => w.id === webhook.id ? webhook : w));
            setSelectedWebhook(null);
          }}
        />
      )}
    </div>
  );
}

function WebhookModal({
  webhook,
  onClose,
  onSaved,
}: {
  webhook?: Webhook;
  onClose: () => void;
  onSaved: (webhook: Webhook) => void;
}) {
  const t = useTranslations('webhooks');
  const tCommon = useTranslations('common');
  const tErrors = useTranslations('errors');

  const [formData, setFormData] = useState<CreateWebhookRequest>({
    url: webhook?.url || '',
    events: webhook?.events || [],
    description: webhook?.description || '',
    secret: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleEvent(event: WebhookEvent) {
    if (formData.events.includes(event)) {
      setFormData({ ...formData, events: formData.events.filter(e => e !== event) });
    } else {
      setFormData({ ...formData, events: [...formData.events, event] });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!formData.url || formData.events.length === 0) {
      setError(tErrors('formDataRequired'));
      setSaving(false);
      return;
    }

    try {
      const response = await fetch(
        webhook ? `/api/webhooks/${webhook.id}` : '/api/webhooks',
        {
          method: webhook ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || tErrors('saveFailed'));
        setSaving(false);
        return;
      }

      onSaved(data.webhook);
    } catch (err) {
      setError(tErrors('saveFailed'));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {webhook ? t('editWebhook') : t('addWebhook')}
          </h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('endpointUrl')} *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('endpointPlaceholder')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('webhookDescription')}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('webhookDescPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('signingSecret')}
              <span className="font-normal text-gray-500 ml-1">{t('signingSecretOptional')}</span>
            </label>
            <input
              type="password"
              value={formData.secret}
              onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('signingSecretHelp')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('signingSecretNote')}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('eventsToSubscribe')} *
            </label>
            <div className="space-y-2">
              {WEBHOOK_EVENTS.map(({ event, label, description }) => (
                <label
                  key={event}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                    formData.events.includes(event) ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.events.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="mt-0.5 mr-3"
                  />
                  <div>
                    <div className="font-medium text-sm">{label}</div>
                    <div className="text-xs text-gray-500">{description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

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
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? tCommon('loading') : webhook ? t('saveChanges') : t('addWebhook')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
