"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet, LogIn } from "lucide-react"; // Import LogIn icon for the circular element
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export default function LoginPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingAdminCheck, setLoadingAdminCheck] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showRegisterOptions, setShowRegisterOptions] = useState(false);

  useEffect(() => {
    const checkAdminExists = async () => {
      try {
        const response = await fetch(getSupabaseFunctionUrl("check-admin-exists"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
          },
        });
        const data = await response.json();
        if (!data.adminExists) {
          router.push("/admin/initial-setup");
        }
      } catch (error) {
        console.error("Error checking admin existence:", error);
        showErrorToast("Gagal memeriksa keberadaan admin.");
      } finally {
        setLoadingAdminCheck(false);
      }
    };
    checkAdminExists();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showErrorToast(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Fetch user role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile after login:", profileError.message);
        showErrorToast("Gagal memuat peran pengguna. Silakan coba lagi.");
        await supabase.auth.signOut(); // Sign out if profile fetch fails
        setLoading(false);
        return;
      }

      showSuccessToast("Login berhasil! Mengarahkan...");
      setLoading(false);

      // Redirect based on role
      switch (profile?.role) {
        case "admin":
          router.replace("/admin/dashboard");
          break;
        case "teacher":
          router.replace("/teacher/dashboard");
          break;
        case "parent":
          router.replace("/parent/dashboard");
          break;
        default:
          showErrorToast("Peran pengguna tidak dikenal. Silakan hubungi administrator.");
          await supabase.auth.signOut();
          router.replace("/login");
          break;
      }
    }
  };

  if (loadingAdminCheck) {
    return <StatusCard status="loading" title="Memeriksa Status Admin..." message="Mohon tunggu sebentar." />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary p-4">
      <div className="relative w-full max-w-md mx-auto">
        {/* Removed the circular icon at the top as requested */}
        <Card className="w-full rounded-3xl shadow-xl pt-10">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-primary text-primary-foreground">
                <Wallet className="h-12 w-12 md:h-16 md:w-16" />
              </div>
            </div>
            <CardTitle className="text-2xl sm:text-3xl md:text-4xl text-primary font-extrabold text-center">
              TabunganKU
            </CardTitle>
            <p className="text-lg sm:text-xl md:text-2xl text-primary font-semibold font-sans text-center">
              SD Negeri Dukuhwaru 01
            </p>
            <CardDescription className="text-sm md:text-base text-muted-foreground text-center">
              Sistem Tabungan Digital Siswa
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="text-center text-sm"> {/* Changed from text-right to text-center */}
                <Link href="/forgot-password" className="text-primary hover:underline">
                  Lupa kata sandi?
                </Link>
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={loading}>
                {loading ? "MASUK..." : "MASUK"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm space-y-2"> {/* Changed from text-left to text-center */}
              <p className="text-muted-foreground">
                Belum punya akun?{" "}
                <Button variant="link" onClick={() => setShowRegisterOptions(!showRegisterOptions)} className="p-0 h-auto text-primary hover:underline">
                  Daftar di sini
                </Button>
              </p>
              {showRegisterOptions && (
                <div className="flex flex-col space-y-2 mt-2">
                  <Link href="/parent-login" className="text-primary hover:underline block">
                    Masuk sebagai Orang Tua (dengan NISN)
                  </Link>
                  <Link href="/teacher/register" className="text-primary hover:underline block">
                    Daftar Akun Guru Baru
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}