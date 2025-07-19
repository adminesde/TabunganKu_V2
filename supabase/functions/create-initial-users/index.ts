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
    const { users } = await req.json();

    if (!users || !Array.isArray(users)) {
      return new Response(JSON.stringify({ error: 'Invalid input: "users" array is required.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const createdUsers = [];
    const errors = [];

    for (const user of users) {
      const { email, password, role, first_name, last_name } = user;

      if (!email || !password || !role) {
        errors.push({ user: email || 'unknown', message: 'Email, password, and role are required.' });
        continue;
      }

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Automatically confirm email for admin/teacher accounts
        user_metadata: {
          role,
          first_name: first_name || null,
          last_name: last_name || null,
        },
      });

      if (error) {
        errors.push({ user: email, message: error.message });
      } else {
        createdUsers.push({ email: data.user?.email, role: user.role, id: data.user?.id });
      }
    }

    return new Response(JSON.stringify({ createdUsers, errors }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errors.length > 0 ? 207 : 200, // 207 Multi-Status if some errors occurred
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});