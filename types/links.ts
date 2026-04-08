// KYC Links Types

import type { SessionStatus, StatusTransition } from './sessions';

export type LinkStatus = 'active' | 'completed' | 'expired' | 'revoked';
export type LinkAccessType = 'single_use' | 'multi_use' | 'time_limited';
export type CustomerType = 'individual' | 'business';

// Re-export for convenience
export type { SessionStatus, StatusTransition } from './sessions';

// KYC Link - main link configuration
export interface KycLink {
  id: string;
  user_id: string;
  token: string;
  link_type: CustomerType;
  access_type: LinkAccessType;
  status: LinkStatus;
  title?: string;
  description?: string;
  redirect_url?: string;
  webhook_url?: string;
  logo_url?: string;
  primary_color?: string;
  allowed_domains?: string;
  expires_at?: string;
  max_submissions?: number;
  submission_count: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_accessed_at?: string;
  completed_at?: string;
}

// Link Session - tracks form progress
export interface LinkSession {
  id: string;
  link_id: string;
  session_token: string;
  current_step: number;
  total_steps: number;
  form_data?: Record<string, unknown>;
  is_completed: boolean;
  customer_id?: string;
  ip_address?: string;
  user_agent?: string;
  started_at: string;
  updated_at: string;
  completed_at?: string;
  expires_at: string;
  // Data retention - when form_data will be automatically deleted
  data_expires_at?: string;
  // Status workflow fields
  status: SessionStatus;
  status_changed_at: string;
  status_history: StatusTransition[];
  // Optional: link type for convenience
  link_type?: CustomerType;
}

// Link Access Log
export interface LinkAccessLog {
  id: string;
  link_id: string;
  session_id?: string;
  action: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Public link info (returned to anonymous users)
export interface PublicLinkInfo {
  id: string;
  link_type: CustomerType;
  title?: string;
  description?: string;
  logo_url?: string;
  primary_color?: string;
  is_valid: boolean;
}

// Create link request
export interface CreateLinkRequest {
  link_type: CustomerType;
  access_type?: LinkAccessType;
  title?: string;
  description?: string;
  redirect_url?: string;
  webhook_url?: string;
  logo_url?: string;
  primary_color?: string;
  allowed_domains?: string;
  expires_at?: string;
  max_submissions?: number;
  external_id?: string;
  metadata?: Record<string, unknown>;
}

// Update link request
export interface UpdateLinkRequest {
  title?: string;
  description?: string;
  redirect_url?: string;
  webhook_url?: string;
  logo_url?: string;
  primary_color?: string;
  allowed_domains?: string;
  expires_at?: string;
  max_submissions?: number;
  status?: LinkStatus;
  metadata?: Record<string, unknown>;
}

// Session progress update
export interface SessionProgressUpdate {
  session_token: string;
  current_step: number;
  form_data: Record<string, unknown>;
}

// Link statistics
export interface LinkStatistics {
  total_views: number;
  total_starts: number;
  total_completions: number;
  completion_rate: number;
  average_completion_time?: number;
}

// Embed configuration for iframe
export interface EmbedConfig {
  token: string;
  width?: string;
  height?: string;
  hideHeader?: boolean;
  hideFooter?: boolean;
  theme?: 'light' | 'dark';
}

// Generate embed code
export function generateEmbedCode(baseUrl: string, config: EmbedConfig): string {
  const params = new URLSearchParams();
  if (config.hideHeader) params.set('hideHeader', 'true');
  if (config.hideFooter) params.set('hideFooter', 'true');
  if (config.theme) params.set('theme', config.theme);

  const url = `${baseUrl}/embed/${config.token}${params.toString() ? '?' + params.toString() : ''}`;

  return `<iframe
  src="${url}"
  width="${config.width || '100%'}"
  height="${config.height || '800px'}"
  frameborder="0"
  allow="camera; microphone"
  style="border: none; max-width: 100%;"
></iframe>`;
}

// Generate shareable link
export function generateShareableLink(baseUrl: string, token: string): string {
  return `${baseUrl}/kyc/${token}`;
}
