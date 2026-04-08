'use server';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { User } from '@supabase/supabase-js';
import { AuthError, type AuthResult } from './errors';

/**
 * Requires an authenticated user session.
 * Returns the user if authenticated, throws AuthError otherwise.
 */
export async function requireAuth(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Authentication required', 'UNAUTHORIZED');
  }

  return user;
}

/**
 * Requires an authenticated user with verified email and active account.
 * Returns the user if verified, throws AuthError otherwise.
 */
export async function requireVerifiedUser(): Promise<User> {
  const user = await requireAuth();
  const supabase = await createServerSupabaseClient();

  // Check if email is verified via Supabase auth
  if (!user.email_confirmed_at) {
    throw new AuthError('Email verification required', 'UNVERIFIED');
  }

  // Check user profile status
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('account_status, email_verified_at')
    .eq('id', user.id)
    .single();

  if (profileError) {
    // Profile may not exist yet for new users - just check email verification
    return user;
  }

  if (profile.account_status === 'suspended' || profile.account_status === 'locked') {
    throw new AuthError('Account is suspended or locked', 'FORBIDDEN');
  }

  return user;
}

/**
 * Requires an authenticated user with an approved customer record.
 * This is for KYC/KYB link operations - user must have completed their own verification.
 * Returns the user and customer data if approved, throws AuthError otherwise.
 */
export async function requireApprovedCustomer(
  customerType?: 'individual' | 'business'
): Promise<{ user: User; customer: { id: string; customer_type: string; status: string } }> {
  const user = await requireVerifiedUser();
  const supabase = await createServerSupabaseClient();

  // Build query
  let query = supabase
    .from('customers')
    .select('id, customer_type, status')
    .eq('user_id', user.id)
    .eq('status', 'approved');

  // Filter by customer type if specified
  if (customerType) {
    query = query.eq('customer_type', customerType);
  }

  const { data: customers, error } = await query;

  if (error) {
    throw new AuthError('Failed to verify customer status', 'FORBIDDEN');
  }

  if (!customers || customers.length === 0) {
    const typeMsg = customerType ? ` ${customerType}` : '';
    throw new AuthError(
      `Approved${typeMsg} KYC/KYB verification required to perform this action`,
      'FORBIDDEN'
    );
  }

  return { user, customer: customers[0] };
}

/**
 * Safe wrapper for server actions that handles auth errors gracefully.
 * Returns a result object instead of throwing.
 */
export async function withAuth<T>(
  fn: (user: User) => Promise<T>
): Promise<AuthResult<T>> {
  try {
    const user = await requireAuth();
    const data = await fn(user);
    return { success: true, data };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

/**
 * Safe wrapper for server actions requiring verified users.
 */
export async function withVerifiedUser<T>(
  fn: (user: User) => Promise<T>
): Promise<AuthResult<T>> {
  try {
    const user = await requireVerifiedUser();
    const data = await fn(user);
    return { success: true, data };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}

/**
 * Safe wrapper for server actions requiring approved customer status.
 */
export async function withApprovedCustomer<T>(
  fn: (user: User, customer: { id: string; customer_type: string; status: string }) => Promise<T>,
  customerType?: 'individual' | 'business'
): Promise<AuthResult<T>> {
  try {
    const { user, customer } = await requireApprovedCustomer(customerType);
    const data = await fn(user, customer);
    return { success: true, data };
  } catch (error) {
    if (error instanceof AuthError) {
      return { success: false, error: error.message, code: error.code };
    }
    throw error;
  }
}
