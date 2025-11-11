import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is an admin
    const { data: adminCheck } = await supabaseClient
      .from('admin_permissions')
      .select('role')
      .eq('email', user.email)
      .eq('role', 'admin')
      .single();

    if (!adminCheck) {
      throw new Error('Admin access required');
    }

    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      throw new Error('Missing required fields: userId and newPassword');
    }

    // Validate password length
    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Validate password complexity
    const hasLower = /[a-z]/.test(newPassword);
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);

    if (!hasLower || !hasUpper || !hasSpecial) {
      throw new Error('Password must contain at least one lowercase letter, one uppercase letter, and one special character');
    }

    // Update user password using admin client
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }

    console.log(`Password updated successfully for user ${userId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in change-admin-password:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
