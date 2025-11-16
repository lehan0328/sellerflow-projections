import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBSITE_ADMIN_EMAILS = ['chuandy914@gmail.com', 'orders@imarand.com'];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !caller) {
      throw new Error("Authentication failed");
    }

    // Verify caller is website admin
    if (!WEBSITE_ADMIN_EMAILS.includes(caller.email || '')) {
      throw new Error("Unauthorized - Admin access required");
    }

    const { userEmail, planTier, reason, maxBankConnections, maxTeamMembers } = await req.json();

    if (!userEmail || !planTier) {
      throw new Error("userEmail and planTier are required");
    }

    // CRITICAL: Reason is now mandatory for audit trail
    if (!reason || reason.trim() === '') {
      throw new Error("Reason is required for all plan override changes");
    }

    // Valid plan tiers (basic plans and specific enterprise tiers)
    const validPlans = ['starter', 'growing', 'professional', 'tier1', 'tier2', 'tier3', 'lifetime', 'lifetime_access'];
    if (!validPlans.includes(planTier)) {
      throw new Error(`Invalid plan tier. Must be one of: ${validPlans.join(', ')}`);
    }

    // Find user by email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.listUsers();
    if (userError) throw userError;

    const targetUser = userData.users.find(u => u.email?.toLowerCase() === userEmail.toLowerCase());
    if (!targetUser) {
      throw new Error(`User not found: ${userEmail}`);
    }

    // Get current profile data for audit log
    const { data: currentProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('plan_override, plan_tier, max_bank_connections, max_team_members')
      .eq('user_id', targetUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching current profile:', profileError);
    }

    const oldPlanTier = currentProfile?.plan_override || currentProfile?.plan_tier || null;
    const oldMaxBankConnections = currentProfile?.max_bank_connections || null;
    const oldMaxTeamMembers = currentProfile?.max_team_members || null;

    // Build update object
    const updateData: any = {
      plan_override: planTier,
      plan_override_reason: reason.trim(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (maxBankConnections !== undefined && maxBankConnections !== null && maxBankConnections !== '') {
      updateData.max_bank_connections = parseInt(maxBankConnections);
    }
    if (maxTeamMembers !== undefined && maxTeamMembers !== null && maxTeamMembers !== '') {
      updateData.max_team_members = parseInt(maxTeamMembers);
    }

    // Update profile with plan override
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update(updateData)
      .eq('user_id', targetUser.id);

    if (updateError) throw updateError;

    // Log the change to audit table
    const auditLog = {
      user_id: targetUser.id,
      user_email: userEmail.toLowerCase(),
      changed_by: caller.id,
      changed_by_email: caller.email || '',
      old_plan_tier: oldPlanTier,
      new_plan_tier: planTier,
      old_max_bank_connections: oldMaxBankConnections,
      new_max_bank_connections: maxBankConnections ? parseInt(maxBankConnections) : null,
      old_max_team_members: oldMaxTeamMembers,
      new_max_team_members: maxTeamMembers ? parseInt(maxTeamMembers) : null,
      reason: reason.trim()
    };

    const { error: auditError } = await supabaseClient
      .from('plan_override_audit')
      .insert(auditLog);

    if (auditError) {
      console.error('Error logging to audit table:', auditError);
      // Don't fail the request if audit logging fails, but log the error
    }

    console.log('Plan override set successfully:', {
      targetUser: userEmail,
      planTier,
      changedBy: caller.email,
      reason: reason.trim()
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Successfully set ${userEmail} to ${planTier} plan`,
        userId: targetUser.id
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Error setting plan override:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});