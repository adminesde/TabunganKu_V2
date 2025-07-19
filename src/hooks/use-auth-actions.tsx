"use client";

import { useSupabase } from "@/components/session-context-provider";
import { useRouter } from "next/navigation";
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export function useAuthActions() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showErrorToast("Gagal keluar: " + error.message);
    } else {
      showSuccessToast("Anda telah berhasil keluar.");
      router.push("/login");
    }
  };

  return { logout };
}