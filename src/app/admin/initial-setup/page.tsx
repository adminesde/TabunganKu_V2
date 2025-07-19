"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState } from "react";
import { getSupabaseFunctionUrl } from "@/lib/utils"; // Import the utility function
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const initialAdminSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

type InitialAdminFormValues = z.infer<typeof initialAdminSchema>;

export default function InitialAdminSetupPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingCheck, setLoadingCheck] = useState(true);
  const [adminExists, setAdminExists] = useState(false);

  const form = useForm<InitialAdminFormValues>({
    resolver: zodResolver(initialAdminSchema),
    defaultValues: {
      email: "",
      password: "",
      first_name: "",
      last_name: "",
    },
  });

  const { handleSubmit, register, formState } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    const checkAdmin = async () => {
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
        if (data.adminExists) {
          router.push("/login"); // Redirect to general login if admin already exists
        }
      } catch (error) {
        console.error("Error checking admin existence:", error);
        showErrorToast("Gagal memeriksa keberadaan admin.");
      } finally {
        setLoadingCheck(false);
      }
    };
    checkAdmin();
  }, [router]);

  const onSubmit = async (values: InitialAdminFormValues) => {
    try {
      const response = await fetch(getSupabaseFunctionUrl("create-admin-user"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          role: "admin",
          first_name: values.first_name,
          last_name: values.last_name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal membuat akun admin.");
      }

      showSuccessToast("Akun admin pertama berhasil dibuat! Silakan login.");
      router.push("/login"); // Redirect to general login after setup
    } catch (error: any) {
      showErrorToast("Gagal mendaftar admin: " + error.message);
    }
  };

  if (loadingCheck) {
    return <StatusCard status="loading" title="Memuat Status Admin..." message="Mohon tunggu sebentar." />;
  }

  if (adminExists) {
    // This case should be handled by the redirect in useEffect, but as a fallback
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl pt-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl sm:text-3xl text-primary font-bold text-center">Pendaftaran Admin Pertama</CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            Buat akun admin utama untuk aplikasi ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata Sandi</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="first_name">Nama Depan (Opsional)</Label>
              <Input
                id="first_name"
                type="text"
                placeholder="Nama Depan"
                {...register("first_name")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Nama Belakang (Opsional)</Label>
              <Input
                id="last_name"
                type="text"
                placeholder="Nama Belakang"
                {...register("last_name")}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Mendaftar..." : "Daftar Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}