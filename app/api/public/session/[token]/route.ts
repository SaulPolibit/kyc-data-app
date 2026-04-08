import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getSessionWithStatus,
  updateSessionProgress,
  completeSession,
  logLinkAccess,
  notifyLinkCompletion,
  triggerStatusChangeWebhooks,
} from '@/lib/supabase/links';
import { validateRequestIp } from '@/lib/security/ip-whitelist';

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET /api/public/session/[token] - Get session info
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const { token } = await params;
    const session = await getSessionWithStatus(token);

    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      current_step: session.current_step,
      total_steps: session.total_steps,
      form_data: session.form_data,
      is_completed: session.is_completed,
      expires_at: session.expires_at,
      // Include status workflow fields
      status: session.status,
      status_changed_at: session.status_changed_at,
      link_type: session.link_type,
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// PUT /api/public/session/[token] - Update session progress
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const { token } = await params;
    const body = await request.json();

    const session = await getSessionWithStatus(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.is_completed) {
      return NextResponse.json(
        { error: 'Session has already been completed' },
        { status: 400 }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    const { current_step, form_data } = body;

    if (typeof current_step !== 'number' || current_step < 1) {
      return NextResponse.json(
        { error: 'Invalid current_step' },
        { status: 400 }
      );
    }

    // Update session progress (database function handles status transition)
    const success = await updateSessionProgress(token, current_step, form_data || {});

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to update session' },
        { status: 400 }
      );
    }

    // Get updated session to return new status
    const updatedSession = await getSessionWithStatus(token);

    return NextResponse.json({
      success: true,
      status: updatedSession?.status,
      current_step: updatedSession?.current_step,
    });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

// POST /api/public/session/[token]/complete - Complete session and submit data
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Validate IP whitelist
    const ipValidation = validateRequestIp(request.headers);
    if (!ipValidation.allowed) {
      return NextResponse.json(
        { error: ipValidation.reason || 'Access denied from your IP address' },
        { status: 403 }
      );
    }

    const { token } = await params;
    const body = await request.json();

    const session = await getSessionWithStatus(token);
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    if (session.is_completed) {
      return NextResponse.json(
        { error: 'Session has already been completed' },
        { status: 400 }
      );
    }

    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired' },
        { status: 410 }
      );
    }

    const previousStatus = session.status;

    // Validate form data
    const { form_data } = body;
    if (!form_data) {
      return NextResponse.json(
        { error: 'form_data is required' },
        { status: 400 }
      );
    }

    // Get the link info
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: link } = await supabase
      .from('kyc_links')
      .select('*')
      .eq('id', session.link_id)
      .single();

    if (!link) {
      return NextResponse.json(
        { error: 'Link not found' },
        { status: 404 }
      );
    }

    // Create customer record
    const customerData = {
      user_id: link.user_id,
      type: link.link_type,
      status: 'pending',
      ...extractCustomerFields(form_data, link.link_type),
    };

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single();

    if (customerError) {
      console.error('Error creating customer:', customerError);
      return NextResponse.json(
        { error: 'Failed to create customer record' },
        { status: 500 }
      );
    }

    // Create address if provided
    if (form_data.address) {
      await supabase.from('addresses').insert({
        customer_id: customer.id,
        address_type: 'primary',
        ...form_data.address,
      });
    }

    // Create identification if provided
    if (form_data.identification) {
      await supabase.from('identifications').insert({
        customer_id: customer.id,
        ...form_data.identification,
      });
    }

    // Create associated persons if provided (business only)
    if (form_data.associated_persons && Array.isArray(form_data.associated_persons)) {
      for (const person of form_data.associated_persons) {
        await supabase.from('associated_persons').insert({
          customer_id: customer.id,
          ...person,
        });
      }
    }

    // Complete the session (database function transitions to 'submitted')
    await completeSession(token, customer.id);

    // Log completion
    await logLinkAccess(
      session.link_id,
      'complete',
      session.id,
      undefined,
      undefined,
      undefined,
      { customer_id: customer.id }
    );

    // Trigger status change webhooks (review -> submitted)
    const updatedSession = await getSessionWithStatus(token);
    if (updatedSession) {
      await triggerStatusChangeWebhooks(
        { ...updatedSession, customer_id: customer.id },
        previousStatus,
        'submitted',
        'user',
        'Form submitted'
      );
    }

    // Also send legacy kyc.completed webhook for backwards compatibility
    await notifyLinkCompletion(link, session, customer.id);

    // Return response
    const response: Record<string, unknown> = {
      success: true,
      customer_id: customer.id,
      status: 'submitted',
    };

    // Include redirect URL if configured
    if (link.redirect_url) {
      response.redirect_url = link.redirect_url;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error completing session:', error);
    return NextResponse.json(
      { error: 'Failed to complete session' },
      { status: 500 }
    );
  }
}

// Helper to extract customer fields from form data
function extractCustomerFields(
  formData: Record<string, unknown>,
  linkType: string
): Record<string, unknown> {
  if (linkType === 'individual') {
    return {
      first_name: formData.first_name,
      middle_name: formData.middle_name,
      last_name: formData.last_name,
      email: formData.email,
      phone: formData.phone,
      birth_date: formData.birth_date,
      nationality: formData.nationality,
      individual_account_purpose: formData.account_purpose,
      individual_account_purpose_other: formData.account_purpose_other,
      employment_status: formData.employment_status,
      most_recent_occupation: formData.most_recent_occupation,
      individual_source_of_funds: formData.source_of_funds,
      individual_expected_monthly_payments: formData.expected_monthly_payments,
      individual_acting_as_intermediary: formData.acting_as_intermediary,
    };
  } else {
    return {
      // Use actual database column names (matching types/database.ts)
      business_legal_name: formData.business_legal_name,
      business_trade_name: formData.business_trade_name,
      email: formData.email,
      phone: formData.phone,
      business_type: formData.business_type,
      business_description: formData.business_description,
      primary_website: formData.primary_website,
      is_dao: formData.is_dao,
      business_source_of_funds: formData.source_of_funds,
      estimated_annual_revenue_usd: formData.estimated_annual_revenue,
      business_account_purpose: formData.account_purpose,
      business_account_purpose_other: formData.account_purpose_other,
      business_acting_as_intermediary: formData.acting_as_intermediary,
      operates_in_prohibited_countries: formData.operates_in_prohibited_countries,
      high_risk_activities: formData.high_risk_activities,
      high_risk_activities_explanation: formData.high_risk_activities_explanation,
      conducts_money_services: formData.conducts_money_services,
      conducts_money_services_using_bridge: formData.conducts_money_services_using_bridge,
      conducts_money_services_description: formData.conducts_money_services_description,
      compliance_screening_explanation: formData.compliance_screening_explanation,
    };
  }
}
