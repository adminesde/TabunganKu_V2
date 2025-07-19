"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/session-context-provider";
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface UseClassesReturn {
  classes: string[];
  loadingClasses: boolean;
  errorClasses: string | null;
}

export function useClasses(): UseClassesReturn {
  const { session } = useSupabase(); // Still need session for auth context
  const [classes, setClasses] = useState<string[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [errorClasses, setErrorClasses] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setErrorClasses(null);
      const { data, error } = await supabase
        .from("students")
        .select("class");

      if (error) {
        setErrorClasses(error.message);
        showErrorToast("Gagal memuat daftar kelas: " + error.message);
      } else {
        const uniqueClasses = Array.from(new Set((data || []).map(s => s.class))).sort();
        setClasses(uniqueClasses);
      }
      setLoadingClasses(false);
    };

    fetchClasses();
  }, [session]); // Removed supabase from dependencies as it's imported directly

  return { classes, loadingClasses, errorClasses };
}