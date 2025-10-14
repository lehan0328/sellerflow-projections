import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("🎭 Generating admin test data...");

    // Create 5 test user accounts
    const testUsers = [
      { email: "test1@example.com", password: "TestPass123!", firstName: "John", lastName: "Smith", company: "Smith LLC" },
      { email: "test2@example.com", password: "TestPass123!", firstName: "Sarah", lastName: "Johnson", company: "Johnson Corp" },
      { email: "test3@example.com", password: "TestPass123!", firstName: "Michael", lastName: "Brown", company: "Brown Industries" },
      { email: "test4@example.com", password: "TestPass123!", firstName: "Emily", lastName: "Davis", company: "Davis Enterprises" },
      { email: "test5@example.com", password: "TestPass123!", firstName: "David", lastName: "Wilson", company: "Wilson Group" },
    ];

    const createdUsers = [];

    for (const testUser of testUsers) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('user_id')
        .eq('first_name', testUser.firstName)
        .eq('last_name', testUser.lastName)
        .maybeSingle();

      if (existingUser) {
        console.log(`User ${testUser.email} already exists, skipping...`);
        createdUsers.push(existingUser.user_id);
        continue;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testUser.email,
        password: testUser.password,
        email_confirm: true,
        user_metadata: {
          first_name: testUser.firstName,
          last_name: testUser.lastName,
          company: testUser.company,
        },
      });

      if (authError) {
        console.error(`Failed to create user ${testUser.email}:`, authError);
        continue;
      }

      console.log(`✅ Created user: ${testUser.email}`);
      createdUsers.push(authData.user.id);
    }

    // Create sample support tickets for each test user
    const supportTickets = [];
    const ticketCategories = ['General', 'Billing', 'Technical', 'Feature Request'];
    const ticketStatuses = ['open', 'in_progress', 'needs_response'];
    
    for (let i = 0; i < createdUsers.length; i++) {
      const userId = createdUsers[i];
      const numTickets = Math.floor(Math.random() * 3) + 1; // 1-3 tickets per user
      
      for (let j = 0; j < numTickets; j++) {
        supportTickets.push({
          user_id: userId,
          subject: `Test Issue ${i * 3 + j + 1}`,
          message: `This is a test support ticket for demo purposes. User is experiencing issue #${i * 3 + j + 1}.`,
          category: ticketCategories[Math.floor(Math.random() * ticketCategories.length)],
          status: ticketStatuses[Math.floor(Math.random() * ticketStatuses.length)],
          priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        });
      }
    }

    const { error: ticketsError } = await supabaseAdmin
      .from('support_tickets')
      .insert(supportTickets);

    if (ticketsError) {
      console.error('Failed to create support tickets:', ticketsError);
    } else {
      console.log(`✅ Created ${supportTickets.length} support tickets`);
    }

    // Create referral codes for each test user
    const referralCodes = [];
    for (let i = 0; i < createdUsers.length; i++) {
      const userId = createdUsers[i];
      referralCodes.push({
        user_id: userId,
        code: `TEST${i + 1}REF${Date.now().toString().slice(-6)}`,
      });
    }

    const { error: codesError } = await supabaseAdmin
      .from('referral_codes')
      .insert(referralCodes);

    if (codesError) {
      console.error('Failed to create referral codes:', codesError);
    } else {
      console.log(`✅ Created ${referralCodes.length} referral codes`);
    }

    // Create some referrals between test users
    const referrals = [];
    if (createdUsers.length >= 2) {
      // User 0 referred users 1 and 2
      referrals.push({
        referrer_id: createdUsers[0],
        referred_user_id: createdUsers[1],
        referral_code: referralCodes[0].code,
        status: 'active',
        converted_at: new Date().toISOString(),
      });
      
      if (createdUsers.length >= 3) {
        referrals.push({
          referrer_id: createdUsers[0],
          referred_user_id: createdUsers[2],
          referral_code: referralCodes[0].code,
          status: 'trial',
        });
      }

      // User 1 referred user 3
      if (createdUsers.length >= 4) {
        referrals.push({
          referrer_id: createdUsers[1],
          referred_user_id: createdUsers[3],
          referral_code: referralCodes[1].code,
          status: 'active',
          converted_at: new Date().toISOString(),
        });
      }
    }

    if (referrals.length > 0) {
      const { error: referralsError } = await supabaseAdmin
        .from('referrals')
        .insert(referrals);

      if (referralsError) {
        console.error('Failed to create referrals:', referralsError);
      } else {
        console.log(`✅ Created ${referrals.length} referrals`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Admin test data generated successfully",
        data: {
          users_created: createdUsers.length,
          support_tickets: supportTickets.length,
          referral_codes: referralCodes.length,
          referrals: referrals.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating admin test data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});