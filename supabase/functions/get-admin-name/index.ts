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

    // Fetch one admin profile
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('first_name, last_name')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
      console.error("Error querying admin profile:", error.message);
      return new Response(JSON.stringify({ error: `Database query error: ${error.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const adminName = data ? `${data.first_name || ''} ${data.last_name || ''}`.trim() : null;

    return new Response(JSON.stringify({ adminName }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Unexpected error in get-admin-name:", error.message || error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});