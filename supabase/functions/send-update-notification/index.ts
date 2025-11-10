import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateNotificationRequest {
  title: string;
  message: string;
  type: 'update' | 'announcement' | 'maintenance' | 'new_feature' | 'bug_fix' | 'urgent' | 'legal_policy' | 'reminder' | 'security';
  category?: string;
  actionLink?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📢 Starting send-update-notification function');

    // Create Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the request is from an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify admin status using the authorization header
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('❌ Authentication error:', userError);
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_website_admin');
    
    if (adminError || !isAdmin) {
      console.error('❌ Admin check failed:', adminError);
      throw new Error('Unauthorized - Admin access required');
    }

    console.log('✅ Admin verified');

    // Parse request body
    const { title, message, type, category, actionLink }: UpdateNotificationRequest = await req.json();

    if (!title || !message) {
      throw new Error('Title and message are required');
    }

    console.log('📝 Update details:', { title, type, category });

    // Get all profiles with their user_ids and account_ids
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, account_id');

    if (profilesError) {
      console.error('❌ Error fetching profiles:', profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log('⚠️ No users found');
      return new Response(
        JSON.stringify({ success: true, count: 0, message: 'No users to notify' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log(`👥 Found ${profiles.length} users`);

    // Create notification records for all users
    const notifications = profiles.map(profile => ({
      user_id: profile.user_id,
      account_id: profile.account_id,
      category: category || 'update',
      notification_type: type,
      title,
      message,
      priority: type === 'critical' ? 'high' : type === 'warning' ? 'medium' : 'low',
      actionable: !!actionLink,
      action_label: actionLink ? 'View Details' : null,
      action_url: actionLink || null,
      read: false,
      sent_at: new Date().toISOString(),
    }));

    // Insert all notifications in a single batch
    const { error: insertError } = await supabase
      .from('notification_history')
      .insert(notifications);

    if (insertError) {
      console.error('❌ Error inserting notifications:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully sent update to ${profiles.length} users`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: profiles.length,
        message: `Update sent to ${profiles.length} users` 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: any) {
    console.error('❌ Error in send-update-notification:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to send update notification' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
