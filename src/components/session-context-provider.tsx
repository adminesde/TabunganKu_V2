"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";
import { showErrorToast } from "@/lib/toast";
import { StatusCard } from "@/components/common/status-card";
import { supabase } from "@/lib/supabaseClient";
import { AuthenticatedLayout } from "@/components/layout/authenticated-layout";

interface SupabaseContextType {
  supabase: SupabaseClient;
  session: Session | null;
  isLoadingSession: boolean;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

export function SessionContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  const publicRoutes = [
    "/login",
    "/admin/initial-setup",
    "/register",
    "/parent-login",
    "/teacher/register",
    "/forgot-password",
    "/change-password",
  ];

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    const handleAuthStateChange = async (event: string, currentSession: Session | null) => {
      setSession(currentSession);
      setIsLoadingSession(true);

      if (currentSession) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentSession.user.id)
          .single();

        if (profileError) {
          console.error("Error fetching user profile for redirection:", profileError.message);
          showErrorToast("Gagal memuat peran pengguna. Silakan coba lagi.");
          await supabase.auth.signOut();
          setUserRole(null);
          setIsLoadingSession(false);
          return;
        }

        const fetchedRole = profile?.role;
        setUserRole(fetchedRole);

        let targetDashboardPath = "/login";
        switch (fetchedRole) {
          case "admin":
            targetDashboardPath = "/admin/dashboard";
            break;
          case "teacher":
            targetDashboardPath = "/teacher/dashboard";
            break;
          case "parent":
            targetDashboardPath = "/parent/dashboard";
            break;
          default:
            showErrorToast("Peran pengguna tidak dikenal. Silakan hubungi administrator.");
            await supabase.auth.signOut();
            router.replace("/login");
            setIsLoadingSession(false);
            return;
        }

        if (isPublicRoute || pathname === "/") {
          router.replace(targetDashboardPath);
        }
      } else {
        setUserRole(null);
        if (!isPublicRoute && pathname !== "/") {
          router.replace("/login");
        } else if (pathname === "/") {
          router.replace("/login");
        }
      }
      setIsLoadingSession(false);
    };

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleAuthStateChange("INITIAL_LOAD", initialSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    return () => subscription.unsubscribe();
  }, [supabase, pathname, router, isPublicRoute]);

  // Selalu render penyedia konteks.
  // Logika rendering kondisional sekarang akan berada di dalam komponen yang mengonsumsi konteks.
  // Ini memastikan pohon komponen yang stabil di root SessionContextProvider.
  return (
    <SupabaseContext.Provider value={{ supabase, session, isLoadingSession }}>
      {isLoadingSession ? (
        <StatusCard status="loading" title="Memuat Sesi Pengguna..." message="Mohon tunggu sebentar." />
      ) : session ? (
        // Jika terautentikasi, bungkus children dengan AuthenticatedLayout
        <AuthenticatedLayout>{children}</AuthenticatedLayout>
      ) : (
        // Jika tidak terautentikasi, dan itu adalah rute publik, render children secara langsung.
        // Jika tidak terautentikasi, dan itu BUKAN rute publik, useEffect seharusnya mengarahkan.
        // Jika karena alasan tertentu tidak, kita merender children, dengan asumsi halaman itu sendiri akan menangani otentikasi.
        // Ini adalah cara paling stabil untuk merender children tanpa menyebabkan React me-remount seluruh pohon.
        children
      )}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error("useSupabase must be used within a SupabaseProvider");
  }
  return context;
};