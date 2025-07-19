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
    const {
      old_class,
      old_amount_expected,
      old_frequency,
      old_day_of_week,
      new_amount_expected,
      new_frequency,
      new_day_of_week,
    } = await req.json();

    if (!old_class || !old_amount_expected || !old_frequency || !new_amount_expected || !new_frequency) {
      return new Response(JSON.stringify({ error: 'Missing required parameters for update.' }), {
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

    // Verify the caller is an admin (optional but good practice for sensitive operations)
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
      return new Response(JSON.stringify({ error: 'Akses ditolak. Hanya Admin yang dapat mengubah jadwal menabung.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    // Find student IDs that match the old schedule criteria and class
    const { data: studentsData, error: studentsError } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('class', old_class);

    if (studentsError) {
      console.error("Error fetching students by class:", studentsError.message);
      return new Response(JSON.stringify({ error: `Failed to fetch students for class filter: ${studentsError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    const studentIdsInClass = studentsData?.map(s => s.id) || [];

    if (studentIdsInClass.length === 0) {
      return new Response(JSON.stringify({ message: 'No students found in the specified class with the old schedule criteria. No updates performed.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Build the update query for saving_schedules
    let updateQuery = supabaseAdmin
      .from('saving_schedules')
      .update({
        amount_expected: new_amount_expected,
        frequency: new_frequency,
        day_of_week: new_day_of_week === '' ? null : new_day_of_week, // Handle empty string for day_of_week as null
      })
      .eq('amount_expected', old_amount_expected)
      .eq('frequency', old_frequency)
      .in('student_id', studentIdsInClass); // Filter by students in the old class

    // Conditionally add day_of_week filter
    if (old_day_of_week === '') {
      updateQuery = updateQuery.is('day_of_week', null);
    } else if (old_day_of_week !== null && old_day_of_week !== undefined) {
      updateQuery = updateQuery.eq('day_of_week', old_day_of_week);
    }

    // Corrected: Removed .select().maybeSingle() as it's not appropriate for bulk updates
    const { error: updateError, count } = await updateQuery;

    if (updateError) {
      console.error("Error updating saving schedules:", updateError.message);
      return new Response(JSON.stringify({ error: `Failed to update saving schedules: ${updateError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    return new Response(JSON.stringify({ message: 'Saving schedules updated successfully', updatedCount: count }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("Unexpected error in update-grouped-saving-schedule:", error.message || error);
    return new Response(JSON.stringify({ error: `Internal server error: ${error.message || 'Unknown error'}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});