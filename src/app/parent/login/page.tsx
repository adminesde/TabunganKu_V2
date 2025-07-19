"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Wallet } from "lucide-react"; // Import Wallet icon
import { getSupabaseFunctionUrl } from "@/lib/utils"; // Import the utility function
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const parentLoginSchema = z.object({
  nisn: z.string().min(1, "NISN tidak boleh kosong"),
  password: z.string().min(1, "Kata sandi tidak boleh kosong"),
  studentName: z.string().min(1, "Nama siswa tidak ditemukan untuk NISN ini").optional(), // Optional as it's auto-filled
});

type ParentLoginFormValues = z.infer<typeof parentLoginSchema>;

export default function ParentLoginPage() {
  const { supabase } = useSupabase();
  const router = useRouter();
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
          router.push("/admin/initial-setup"); // Redirect to initial admin setup if no admin exists
        }
      } catch (error) {
        console.error("Error checking admin existence:", error);
        toast.error("Gagal memeriksa keberadaan admin.");
      } finally {
        setLoadingAdminCheck(false);
      }
    };
    checkAdminExists();
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
            setValue("studentName", ""); // Clear student name on error
            throw new Error(data.error || "Gagal memeriksa NISN.");
          }

          if (data.studentName) {
            setValue("studentName", data.studentName);
          } else {
            setValue("studentName", "");
            toast.error("NISN tidak ditemukan.");
          }
        } catch (error: any) {
          setValue("studentName", "");
          toast.error("Gagal memuat nama siswa: " + error.message);
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
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
      setLoadingStudentName(false); // Clear loading on unmount or value change
    };
  }, [nisnValue, supabase, setValue]);

  const handleLogin = async (values: ParentLoginFormValues) => {
    // Construct the email from NISN
    const parentEmail = `nisn-${values.nisn}@tabunganku.com`;

    console.log("Attempting parent login with email:", parentEmail); // Log login attempt
    const { error } = await supabase.auth.signInWithPassword({
      email: parentEmail,
      password: values.password,
    });

    if (error) {
      console.error("Parent login error:", error.message); // Log specific error
      toast.error(error.message);
      return;
    }

    console.log("Parent login successful, redirecting..."); // Log success
    toast.success("Login berhasil! Mengarahkan..."); // Inform user of pending redirect
  };

  if (loadingAdminCheck) {
    return <StatusCard status="loading" title="Memeriksa Status Admin..." message="Mohon tunggu sebentar." />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 bg-card">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary text-primary-foreground">
              <Wallet className="h-12 w-12" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center text-foreground">TabunganKu</CardTitle>
          <p className="text-lg text-center text-foreground font-semibold">SD Negeri Dukuhwaru 01</p>
          <CardDescription className="text-center text-muted-foreground">
            Sistem Tabungan Digital Siswa
          </CardDescription>
        </CardHeader>
        <CardContent className="bg-card">
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
                value={watch("password")} // Use watch to keep input controlled
                onChange={(e) => setValue("password", e.target.value)} // Use setValue for controlled input
                required
              />
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting || loadingStudentName || !watch("studentName")}>
              {isSubmitting ? "Memuat..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm space-y-2">
            <p>Belum punya akun?</p>
            <Link href="/register" className="underline block">
              Daftar Akun Orang Tua Baru
            </Link>
            <Link href="/teacher/register" className="underline block">
              Daftar Akun Guru Baru
            </Link>
          </div>
          <div className="mt-4 text-center text-sm">
            <Button variant="outline" className="w-full" onClick={() => router.push("/login")}>
              Login Umum (Admin/Guru)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}