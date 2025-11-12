import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Generating referral code for user: ${user.id}`);

    // Get user's profile with company name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company, my_referral_code')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      throw new Error('Failed to fetch profile');
    }

    // Check if user already has a referral code
    if (profile.my_referral_code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'You already have a referral code. Referral codes cannot be changed.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.company) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Please add your company name in Settings before generating a referral code.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate code from company name
    // Remove special characters, spaces, convert to uppercase
    let baseCode = profile.company
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    // Limit to 20 characters
    if (baseCode.length > 20) {
      baseCode = baseCode.substring(0, 20);
    }

    // Ensure at least 3 characters
    if (baseCode.length < 3) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Company name is too short. Please use at least 3 alphanumeric characters.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for uniqueness and add suffix if needed
    let finalCode = baseCode;
    let suffix = 1;
    let isUnique = false;

    while (!isUnique && suffix <= 999) {
      const { data: existingCode } = await supabase
        .from('profiles')
        .select('my_referral_code')
        .eq('my_referral_code', finalCode)
        .single();

      if (!existingCode) {
        isUnique = true;
      } else {
        finalCode = `${baseCode}${suffix}`;
        suffix++;
      }
    }

    if (!isUnique) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Unable to generate unique code. Please contact support.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user's profile with the generated code
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ my_referral_code: finalCode })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to save referral code');
    }

    console.log(`Successfully generated referral code: ${finalCode} for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        code: finalCode,
        message: 'Referral code generated successfully!' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-referral-code:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});