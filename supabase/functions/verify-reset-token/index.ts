import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, newPassword }: ResetPasswordRequest = await req.json();
    console.log("Verifying reset token");

    // Validate inputs
    if (!token || !newPassword) {
      throw new Error('Token and new password are required');
    }

    if (newPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    // Create Supabase client with service role
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

    // Verify token
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !tokenData) {
      console.error('Token verification failed:', tokenError);
      throw new Error('Invalid or expired reset token');
    }

    // Update user's password using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      tokenData.user_id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update failed:', updateError);
      throw new Error('Failed to update password');
    }

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token);

    // Get user's email to sign them in
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
      tokenData.user_id
    );

    if (userError || !userData?.user?.email) {
      console.error('Failed to get user data:', userError);
      throw new Error('Failed to retrieve user information');
    }

    // Sign in the user and get session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: newPassword
    });

    if (signInError) {
      console.error('Failed to sign in user:', signInError);
      // Still return success since password was updated
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Password updated. Please sign in with your new password.'
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("Password reset and auto-login successful");

    return new Response(JSON.stringify({ 
      success: true,
      session: signInData.session,
      user: signInData.user
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in verify-reset-token:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
