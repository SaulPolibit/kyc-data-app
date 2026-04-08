import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { AuthError } from '@/lib/auth/errors';
import { requireAuth } from '@/lib/auth/guards';
import { validateRequestIp } from '@/lib/security/ip-whitelist';

// GET /api/customers - Get all customers for authenticated user
export async function GET() {
  try {
    // Validate IP whitelist
    const headersList = await headers();
    const ipValidation = validateRequestIp(headersList);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const user = await requireAuth();
    const supabase = await createServerSupabaseClient();

    // Get customers created via links (by this user)
    const { data: customers, error } = await supabase
      .from('customers')
      .select(`
        id,
        customer_type,
        first_name,
        last_name,
        business_name,
        email,
        status,
        created_at
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Handle schema mismatch - migration might not be applied
      if (error.code === '42703') {
        console.error('Schema error - please run database migrations:', error.message);
        return NextResponse.json({
          customers: [],
          warning: 'Database schema needs to be updated. Please run migrations.'
        });
      }
      throw error;
    }

    // Add computed full_name for convenience
    const customersWithFullName = (customers || []).map((c) => ({
      ...c,
      full_name: c.customer_type === 'individual'
        ? [c.first_name, c.last_name].filter(Boolean).join(' ') || null
        : c.business_name,
    }));

    return NextResponse.json({ customers: customersWithFullName });
  } catch (error) {
    if (error instanceof AuthError) {
      const status = error.code === 'UNAUTHORIZED' ? 401 : 403;
      return NextResponse.json({ error: error.message }, { status });
    }
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
  }
}
