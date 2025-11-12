import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { affiliate_code, user_id } = await req.json();

    if (!affiliate_code || !user_id) {
      return new Response(
        JSON.stringify({ error: "affiliate_code and user_id are required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Validate affiliate code
    const { data: affiliate, error: affiliateError } = await supabaseAdmin
      .from('affiliates')
      .select('id')
      .eq('affiliate_code', affiliate_code.toUpperCase())
      .eq('status', 'approved')
      .single();

    if (affiliateError || !affiliate) {
      return new Response(
        JSON.stringify({ error: "Invalid or inactive affiliate code" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabaseAdmin
      .from('affiliate_referrals')
      .select('id')
      .eq('referred_user_id', user_id)
      .single();

    if (existingReferral) {
      return new Response(
        JSON.stringify({ error: "Referral already exists for this user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 409 }
      );
    }

    // Create referral record
    const { data: referral, error: referralError } = await supabaseAdmin
      .from('affiliate_referrals')
      .insert({
        affiliate_id: affiliate.id,
        referred_user_id: user_id,
        status: 'trial',
        referral_date: new Date().toISOString()
      })
      .select()
      .single();

    if (referralError) {
      throw referralError;
    }

    // Update affiliate metrics
    await supabaseAdmin
      .from('affiliates')
      .update({
        trial_referrals: supabaseAdmin.sql`trial_referrals + 1`,
        total_referrals: supabaseAdmin.sql`total_referrals + 1`,
        updated_at: new Date().toISOString()
      })
      .eq('id', affiliate.id);

    return new Response(
      JSON.stringify({ success: true, referral }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error recording affiliate referral:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
