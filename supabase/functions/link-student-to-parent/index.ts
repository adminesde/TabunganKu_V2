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
    const { studentId, parentId } = await req.json();

    if (!studentId || !parentId) {
      return new Response(JSON.stringify({ error: 'Student ID and Parent ID are required.' }), {
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

    // Re-check if student is already linked to prevent accidental overwrites
    const { data: studentData, error: studentFetchError } = await supabaseAdmin
      .from('students')
      .select('parent_id')
      .eq('id', studentId)
      .single();

    if (studentFetchError) {
      console.error("Error fetching student for linking:", studentFetchError.message);
      return new Response(JSON.stringify({ error: `Failed to verify student: ${studentFetchError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404, // Student not found or other fetch error
      });
    }

    if (studentData.parent_id !== null) {
      return new Response(JSON.stringify({ error: 'Siswa sudah terhubung dengan akun orang tua lain.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      });
    }

    // Perform the update using service role key
    const { error: updateError } = await supabaseAdmin
      .from('students')
      .update({ parent_id: parentId })
      .eq('id', studentId);

    if (updateError) {
      console.error("Error linking student to parent:", updateError.message);
      return new Response(JSON.stringify({ error: `Failed to link student: ${updateError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ message: 'Student linked successfully.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Unexpected error in link-student-to-parent:", error.message || error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});