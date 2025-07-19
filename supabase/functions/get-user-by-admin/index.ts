/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'User ID is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.");
      return new Response(JSON.stringify({ error: 'Server configuration error: Supabase credentials missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    );

    // Fetch user from auth.users
    const { data: authUserData, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (authUserError) {
      console.error("Error fetching auth user:", authUserError.message);
      return new Response(JSON.stringify({ error: `Failed to fetch user: ${authUserError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Fetch profile from public.profiles
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, role, class_taught")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile:", profileError.message);
      return new Response(JSON.stringify({ error: `Failed to fetch profile: ${profileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const userProfile = {
      id: authUserData.user.id,
      email: authUserData.user.email,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      role: profileData.role,
      class_taught: profileData.class_taught,
    };

    return new Response(JSON.stringify({ user: userProfile }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Unexpected error in get-user-by-admin:", error.message || error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});