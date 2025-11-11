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

    const { userId, userEmail } = await req.json();

    if (!userId || !userEmail) {
      throw new Error('Missing required fields: userId and userEmail');
    }

    // Prevent deletion of hardcoded admin accounts
    const protectedEmails = ['chuandy914@gmail.com', 'orders@imarand.com'];
    if (protectedEmails.includes(userEmail)) {
      throw new Error('Cannot delete protected admin account');
    }

    // Delete from admin_permissions table first
    const { error: permError } = await supabaseAdmin
      .from('admin_permissions')
      .delete()
      .eq('email', userEmail);

    if (permError) {
      console.error('Error deleting admin permissions:', permError);
      throw new Error('Failed to delete admin permissions');
    }

    // Delete user account using admin client
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      throw deleteError;
    }

    console.log(`Account deleted successfully for user ${userId} (${userEmail})`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in delete-admin-account:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
