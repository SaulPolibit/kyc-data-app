// Session status workflow types

/**
 * Session workflow status enum
 * Represents the current stage of a KYC/KYB session
 */
export type SessionStatus =
  | 'draft'              // Session created but not started
  | 'personal_info'      // KYC Step 1: Personal information
  | 'business_info'      // KYB Step 1: Business information
  | 'identification'     // KYC Step 2: ID upload
  | 'address'            // KYC Step 3 / KYB Step 2: Address
  | 'beneficial_owners'  // KYB Step 3: Beneficial owners & signers
  | 'documents'          // KYB Step 4: Document uploads
  | 'review'             // Final review before submission
  | 'submitted'          // Awaiting admin review
  | 'approved'           // Verification approved
  | 'rejected';          // Verification rejected

/**
 * Status transition record in history
 */
export interface StatusTransition {
  from: SessionStatus;
  to: SessionStatus;
  at: string; // ISO timestamp
  by: string; // 'user', 'system', 'admin', or user_id
}

/**
 * Session status log entry (from session_status_log table)
 */
export interface SessionStatusLog {
  id: string;
  session_id: string;
  previous_status: SessionStatus | null;
  new_status: SessionStatus;
  changed_by: string;
  reason?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Valid status transitions per link type
 */
export const VALID_STATUS_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  // Start states
  draft: ['personal_info', 'business_info'],

  // KYC flow
  personal_info: ['identification', 'draft'],
  identification: ['address', 'personal_info'],

  // KYB flow
  business_info: ['address', 'draft'],
  beneficial_owners: ['documents', 'address'],
  documents: ['review', 'beneficial_owners'],

  // Shared states (address depends on link type)
  address: ['review', 'identification', 'beneficial_owners', 'personal_info', 'business_info'],

  // Final stages
  review: ['submitted', 'address', 'documents', 'identification', 'beneficial_owners'],
  submitted: ['approved', 'rejected'],
  approved: [],
  rejected: [],
};

/**
 * Step to status mapping for Individual (KYC)
 * Total: 4 steps
 */
export const KYC_STEP_STATUS_MAP: Record<number, SessionStatus> = {
  1: 'personal_info',
  2: 'identification',
  3: 'address',
  4: 'review',
};

/**
 * Step to status mapping for Business (KYB)
 * Total: 5 steps
 */
export const KYB_STEP_STATUS_MAP: Record<number, SessionStatus> = {
  1: 'business_info',
  2: 'address',
  3: 'beneficial_owners',
  4: 'documents',
  5: 'review',
};

/**
 * Get status from step number based on link type
 */
export function getStatusFromStep(
  step: number,
  linkType: 'individual' | 'business'
): SessionStatus {
  if (linkType === 'individual') {
    return KYC_STEP_STATUS_MAP[step] || 'draft';
  }
  return KYB_STEP_STATUS_MAP[step] || 'draft';
}

/**
 * Get step number from status based on link type
 */
export function getStepFromStatus(
  status: SessionStatus,
  linkType: 'individual' | 'business'
): number {
  const map = linkType === 'individual' ? KYC_STEP_STATUS_MAP : KYB_STEP_STATUS_MAP;
  const entry = Object.entries(map).find(([, s]) => s === status);
  return entry ? parseInt(entry[0], 10) : 1;
}

/**
 * Get total steps for a link type
 */
export function getTotalSteps(linkType: 'individual' | 'business'): number {
  return linkType === 'individual' ? 4 : 5;
}

/**
 * Status display labels and descriptions
 */
export const STATUS_LABELS: Record<SessionStatus, { label: string; description: string }> = {
  draft: {
    label: 'Draft',
    description: 'Session created but not started',
  },
  personal_info: {
    label: 'Personal Information',
    description: 'Filling personal information',
  },
  business_info: {
    label: 'Business Information',
    description: 'Filling business information',
  },
  identification: {
    label: 'Identification',
    description: 'Uploading identification documents',
  },
  address: {
    label: 'Address',
    description: 'Providing address information',
  },
  beneficial_owners: {
    label: 'Beneficial Owners',
    description: 'Adding beneficial owners and signers',
  },
  documents: {
    label: 'Documents',
    description: 'Uploading required documents',
  },
  review: {
    label: 'Review',
    description: 'Reviewing information before submission',
  },
  submitted: {
    label: 'Submitted',
    description: 'Awaiting review',
  },
  approved: {
    label: 'Approved',
    description: 'Verification approved',
  },
  rejected: {
    label: 'Rejected',
    description: 'Verification rejected',
  },
};

/**
 * Check if a status is a terminal state (no further transitions possible)
 */
export function isTerminalStatus(status: SessionStatus): boolean {
  return status === 'approved' || status === 'rejected';
}

/**
 * Check if a status is an active/in-progress state
 */
export function isActiveStatus(status: SessionStatus): boolean {
  return !['draft', 'submitted', 'approved', 'rejected'].includes(status);
}

/**
 * Check if a status requires admin action
 */
export function requiresAdminAction(status: SessionStatus): boolean {
  return status === 'submitted';
}
