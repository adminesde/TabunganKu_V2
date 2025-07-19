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
import { Wallet, LogIn, ArrowLeft } from "lucide-react"; // Import Wallet and ArrowLeft icons
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { StatusCard } from "@/components/common/status-card";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const parentLoginSchema = z.object({
  nisn: z.string().min(1, "NISN tidak boleh kosong"),
  password: z.string().min(1, "Kata sandi tidak boleh kosong"),
  studentName: z.string().min(1, "Nama siswa tidak ditemukan untuk NISN ini").optional(),
});

type ParentLoginFormValues = z.infer<typeof parentLoginSchema>;

export default function ParentLoginPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingAdminCheck, setLoadingAdminCheck] = useState(true);
  const [loadingStudentName, setLoadingStudentName] = useState(false);

  const form = useForm<ParentLoginFormValues>({
    resolver: zodResolver(parentLoginSchema),
    defaultValues: {
      nisn: "",
      password: "",
      studentName: "",
    },
  });

  const { handleSubmit, register, formState, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const nisnValue = watch("nisn");

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
    checkAdminExists(); // Corrected: Call checkAdminExists
  }, [router]);

  useEffect(() => {
    const fetchStudentName = async () => {
      if (nisnValue && nisnValue.length > 0) {
        setLoadingStudentName(true);
        try {
          const response = await fetch(getSupabaseFunctionUrl("check-student-nisn"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
            },
            body: JSON.stringify({ nisn: nisnValue }),
          });
          const data = await response.json();

          if (!response.ok) {
            setValue("studentName", "");
            throw new Error(data.error || "Gagal memeriksa NISN.");
          }

          if (data.studentName) {
            setValue("studentName", data.studentName);
          } else {
            setValue("studentName", "");
            showErrorToast("NISN tidak ditemukan.");
          }
        } catch (error: any) {
          setValue("studentName", "");
          showErrorToast("Gagal memuat nama siswa: " + error.message);
        } finally {
          setLoadingStudentName(false);
        }
      } else {
        setValue("studentName", "");
        setLoadingStudentName(false);
      }
    };

    const handler = setTimeout(() => {
      fetchStudentName();
    }, 500);

    return () => {
      clearTimeout(handler);
      setLoadingStudentName(false);
    };
  }, [nisnValue, setValue]); // Removed supabase from dependencies as it's imported directly

  const handleLogin = async (values: ParentLoginFormValues) => {
    const parentEmail = `nisn-${values.nisn}@tabunganku.com`;

    console.log("Attempting parent login with email:", parentEmail);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: values.password,
    });

    if (error) {
      console.error("Parent login error:", error.message);
      showErrorToast(error.message);
      return;
    }

    if (data.user) {
      showSuccessToast("Login berhasil! Mengarahkan...");
      router.replace("/parent/dashboard"); // Explicitly redirect to parent dashboard
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
            <form onSubmit={handleSubmit(handleLogin)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nisn">NISN Anak</Label>
                <Input
                  id="nisn"
                  type="text"
                  placeholder="Masukkan NISN anak Anda"
                  {...register("nisn")}
                />
                {errors.nisn && (
                  <p className="text-red-500 text-sm">{errors.nisn.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentName">Nama Siswa</Label>
                <Input
                  id="studentName"
                  type="text"
                  placeholder={loadingStudentName ? "Mencari nama siswa..." : "Nama siswa akan muncul di sini"}
                  {...register("studentName")}
                  readOnly
                  disabled={loadingStudentName || !nisnValue}
                  className="bg-muted"
                />
                {errors.studentName && (
                  <p className="text-red-500 text-sm">{errors.studentName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Kata Sandi</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={watch("password")}
                  onChange={(e) => setValue("password", e.target.value)}
                  required
                />
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={isSubmitting || loadingStudentName || !watch("studentName")}>
                {isSubmitting ? "MASUK..." : "MASUK"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm"> {/* Changed from text-left to text-center */}
              <Link href="/register" className="underline block text-primary">
                Daftar Akun Orang Tua Baru
              </Link>
            </div>
            <div className="mt-4 text-center text-sm"> {/* Added text-center */}
              <IconButton variant="outline" className="w-full rounded-full py-2 h-auto" onClick={() => router.push("/login")} icon={ArrowLeft} tooltip="Kembali ke Login Umum">
                {!isMobile && "Kembali ke Login Umum"}
              </IconButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}