import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'reCAPTCHA token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const secretKey = Deno.env.get('RECAPTCHA_SECRET_KEY');
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'reCAPTCHA not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the token with Google reCAPTCHA API
    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verificationData = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    const verificationResponse = await fetch(verificationUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: verificationData.toString(),
    });

    const verificationResult = await verificationResponse.json();

    console.log('reCAPTCHA verification result:', {
      success: verificationResult.success,
      score: verificationResult.score,
      action: verificationResult.action,
    });

    // Check if verification was successful
    if (!verificationResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'reCAPTCHA verification failed',
          errorCodes: verificationResult['error-codes']
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check score threshold (0.5 is recommended minimum for v3)
    const score = verificationResult.score || 0;
    const threshold = 0.5;

    if (score < threshold) {
      console.warn(`Low reCAPTCHA score: ${score} (threshold: ${threshold})`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Bot-like behavior detected. Please try again.',
          score
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        score,
        message: 'reCAPTCHA verification successful'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error verifying reCAPTCHA:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error during reCAPTCHA verification' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
