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
    const { class: targetClass, amount_expected, frequency, day_of_week } = await req.json();

    if (!targetClass || !amount_expected || !frequency) {
      return new Response(JSON.stringify({ error: 'Missing required parameters: class, amount_expected, and frequency.' }), {
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

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token or user not found.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || profile?.role !== "admin") {
      console.error("Authorization error: User role is not admin.", profileError?.message);
      return new Response(JSON.stringify({ error: 'Akses ditolak. Hanya Admin yang dapat menghapus jadwal menabung.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    // Find student IDs that match the class
    const { data: studentsData, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('class', targetClass);

    if (studentsError) {
      console.error("Error fetching students by class:", studentsError.message);
      return new Response(JSON.stringify({ error: `Failed to fetch students for class filter: ${studentsError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const studentIdsInClass = studentsData?.map(s => s.id) || [];

    if (studentIdsInClass.length === 0) {
      return new Response(JSON.stringify({ message: 'No students found in the specified class. No schedules deleted.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Build the delete query for saving_schedules
    let deleteQuery = supabaseAdmin
      .from('saving_schedules')
      .delete()
      .eq('amount_expected', amount_expected)
      .eq('frequency', frequency)
      .in('student_id', studentIdsInClass); // Filter by students in the target class

    // Conditionally add day_of_week filter
    if (day_of_week === null || day_of_week === '') {
      deleteQuery = deleteQuery.is('day_of_week', null);
    } else if (day_of_week !== undefined) { // Ensure it's not undefined if it was passed as a parameter
      deleteQuery = deleteQuery.eq('day_of_week', day_of_week);
    }

    // Corrected: Directly await the delete query to get count
    const { error: deleteError, count } = await deleteQuery;

    if (deleteError) {
      console.error("Error deleting saving schedules:", deleteError.message);
      return new Response(JSON.stringify({ error: `Failed to delete saving schedules: ${deleteError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: 'Saving schedules deleted successfully', deletedCount: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Unexpected error in delete-grouped-saving-schedule:", error.message || error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});