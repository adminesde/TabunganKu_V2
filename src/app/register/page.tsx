"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Perbaikan di sini: '=' diganti 'from'
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Wallet, LogIn } from "lucide-react";
import { useEffect, useState } from "react";
import { getSupabaseFunctionUrl } from "@/lib/utils"; // Import the utility function
import { PageCardLayout } from "@/components/layout/page-card-layout"; // Import PageCardLayout
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const registerSchema = z.object({
  nisn: z.string().min(1, "NISN tidak boleh kosong"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  fullName: z.string().min(1, "Nama lengkap tidak boleh kosong"), // Diubah menjadi wajib
  studentName: z.string().min(1, "Nama siswa tidak boleh kosong").optional(), // Optional as it's auto-filled
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingStudent, setLoadingStudent] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nisn: "",
      password: "",
      fullName: "",
      studentName: "",
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const nisnValue = watch("nisn");

  useEffect(() => {
    const fetchStudentName = async () => {
      if (nisnValue && nisnValue.length > 0) {
        setLoadingStudent(true);
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
            showErrorToast("NISN tidak ditemukan.");
          }
        } catch (error: any) {
          setValue("studentName", "");
          showErrorToast("Gagal memuat nama siswa: " + error.message);
        } finally {
          setLoadingStudent(false);
        }
      } else {
        setValue("studentName", "");
        setLoadingStudent(false);
      }
    };

    const handler = setTimeout(() => {
      fetchStudentName();
    }, 500); // Debounce for 500ms

    return () => {
      clearTimeout(handler);
      setLoadingStudent(false); // Clear loading on unmount or value change
    };
  }, [nisnValue, setValue]); // Removed supabase from dependencies

  const onSubmit = async (values: RegisterFormValues) => {
    // Use the new Edge Function to securely get student data and check parent_id
    let studentIdToLink: string | null = null;
    let studentNameForToast: string | null = null;

    try {
      const response = await fetch(getSupabaseFunctionUrl("get-student-for-parent-registration"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ nisn: values.nisn }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memverifikasi siswa.");
      }

      studentIdToLink = data.studentId;
      studentNameForToast = data.studentName;

    } catch (error: any) {
      showErrorToast(error.message);
      return;
    }

    // Generate a unique email for the parent based on NISN
    const parentEmail = `nisn-${values.nisn}@tabunganku.com`;

    // Sign up the parent user with the generated email
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: parentEmail,
      password: values.password,
      options: {
        // emailConfirm: true, // Removed: This option is for admin.createUser, not signUp
        data: {
          role: "parent", // Role is fixed to parent
          first_name: values.fullName || null,
          last_name: null,
          class_taught: null, // Ensure this is null for parents
        },
      },
    });

    if (signUpError) {
      showErrorToast("Gagal membuat akun orang tua: " + signUpError.message);
      return;
    }

    const newParentId = signUpData.user?.id;

    if (newParentId && studentIdToLink) {
      // Now, call the new Edge Function to link the student to this new parent
      try {
        const linkResponse = await fetch(getSupabaseFunctionUrl("link-student-to-parent"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`, // Use anon key for edge function call
          },
          body: JSON.stringify({ studentId: studentIdToLink, parentId: newParentId }),
        });

        const linkData = await linkResponse.json();

        if (!linkResponse.ok) {
          throw new Error(linkData.error || "Gagal menghubungkan anak.");
        }

        showSuccessToast(`Pendaftaran berhasil! Akun Anda terhubung dengan ${studentNameForToast}. Silakan login.`);
      } catch (linkError: any) {
        showErrorToast("Gagal menghubungkan anak: " + linkError.message + ". Pendaftaran berhasil, tetapi anak tidak terhubung.");
      }
    } else {
      showErrorToast("Pendaftaran berhasil, tetapi ID pengguna atau siswa tidak ditemukan untuk menghubungkan anak.");
    }
    router.replace("/parent-login"); // Explicitly redirect to parent-specific login
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary p-4">
      <div className="relative w-full max-w-md">
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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  placeholder={loadingStudent ? "Mencari nama siswa..." : "Nama siswa akan muncul di sini"}
                  {...register("studentName")}
                  readOnly
                  disabled={loadingStudent}
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
                  placeholder="Minimal 6 karakter"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Nama Lengkap Orang Tua</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm">{errors.fullName.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={isSubmitting || loadingStudent || !watch("studentName")}>
                {isSubmitting ? "MENDAFTAR..." : "DAFTAR SEBAGAI ORANG TUA"}
              </Button>
              <div className="text-center"> {/* Added text-center */}
                <IconButton
                  icon={ArrowLeft}
                  tooltip="Kembali ke Login Umum"
                  onClick={() => router.push("/login")}
                  variant="outline"
                  className="w-full rounded-full py-2 h-auto"
                  disabled={isSubmitting}
                >
                  {!isMobile && "Kembali ke Login Umum"}
                </IconButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}