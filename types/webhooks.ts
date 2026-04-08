// Webhook Types

import type { SessionStatus } from './sessions';

export type WebhookEvent =
  | 'kyc.started'
  | 'kyc.step_completed'
  | 'kyc.completed'
  | 'kyc.expired'
  | 'link.accessed'
  // Session status events
  | 'session.status_changed'
  | 'session.submitted'
  | 'session.approved'
  | 'session.rejected';

export type WebhookStatus = 'active' | 'inactive' | 'failed';

export interface Webhook {
  id: string;
  user_id: string;
  url: string;
  secret?: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  description?: string;
  failure_count: number;
  last_triggered_at?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  response_status?: number;
  response_body?: string;
  success: boolean;
  duration_ms?: number;
  error_message?: string;
  created_at: string;
}

export interface CreateWebhookRequest {
  url: string;
  events: WebhookEvent[];
  description?: string;
  secret?: string;
}

export interface UpdateWebhookRequest {
  url?: string;
  events?: WebhookEvent[];
  description?: string;
  status?: WebhookStatus;
  secret?: string;
}

// Available webhook events with descriptions
export const WEBHOOK_EVENTS: { event: WebhookEvent; label: string; description: string }[] = [
  {
    event: 'kyc.started',
    label: 'KYC Started',
    description: 'User opened the KYC form and started filling it out',
  },
  {
    event: 'kyc.step_completed',
    label: 'Step Completed',
    description: 'User completed a step in the KYC process',
  },
  {
    event: 'kyc.completed',
    label: 'KYC Completed',
    description: 'User successfully submitted all KYC information',
  },
  {
    event: 'kyc.expired',
    label: 'KYC Expired',
    description: 'KYC session or link expired before completion',
  },
  {
    event: 'link.accessed',
    label: 'Link Accessed',
    description: 'Someone accessed a KYC link',
  },
  // Session status events
  {
    event: 'session.status_changed',
    label: 'Session Status Changed',
    description: 'Session moved to a new workflow status',
  },
  {
    event: 'session.submitted',
    label: 'Session Submitted',
    description: 'User submitted their verification for review',
  },
  {
    event: 'session.approved',
    label: 'Session Approved',
    description: 'Verification has been approved',
  },
  {
    event: 'session.rejected',
    label: 'Session Rejected',
    description: 'Verification has been rejected',
  },
];

// Session status change webhook payload
export interface SessionStatusChangedPayload {
  event: 'session.status_changed' | 'session.submitted' | 'session.approved' | 'session.rejected';
  session_id: string;
  link_id: string;
  external_id?: string;
  customer_id?: string;
  previous_status: SessionStatus;
  new_status: SessionStatus;
  changed_at: string;
  changed_by: string;
  reason?: string;
  metadata?: Record<string, unknown>;
}
