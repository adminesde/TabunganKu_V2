"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Perbaikan di sini: '=' diganti 'from'
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Wallet, LogIn } from "lucide-react";
import { classOptions } from "@/lib/constants"; // Import classOptions
import { PageCardLayout } from "@/components/layout/page-card-layout"; // Import PageCardLayout
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const teacherRegisterSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  fullName: z.string().min(1, "Nama lengkap tidak boleh kosong"),
  class_taught: z.string().min(1, "Kelas yang diajar tidak boleh kosong"),
});

type TeacherRegisterFormValues = z.infer<typeof teacherRegisterSchema>;

export default function TeacherRegisterPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook

  const form = useForm<TeacherRegisterFormValues>({
    resolver: zodResolver(teacherRegisterSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      class_taught: "",
    },
  });

  const { handleSubmit, register, formState, setValue, watch } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = async (values: TeacherRegisterFormValues) => {
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        // emailConfirm: true, // Removed: This option is for admin.createUser, not signUp
        data: {
          role: "teacher",
          first_name: values.fullName,
          last_name: null,
          class_taught: values.class_taught,
        },
      },
    });

    if (error) {
      showErrorToast("Gagal mendaftar: " + error.message);
    } else {
      showSuccessToast("Pendaftaran guru berhasil! Silakan login.");
      // Explicitly redirect to login page after successful registration
      router.replace("/login");
    }
  };

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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Masukkan email Anda"
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
                <Label htmlFor="fullName">Nama Lengkap</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nama Lengkap"
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="text-red-500 text-sm">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_taught">Kelas yang Diajar</Label>
                <Select onValueChange={(value) => setValue("class_taught", value)} value={form.watch("class_taught") || ""}>
                  <SelectTrigger id="class_taught">
                    <SelectValue placeholder="Pilih kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((cls) => (
                      <SelectItem key={cls} value={cls}>
                        {cls}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.class_taught && (
                  <p className="text-red-500 text-sm">{errors.class_taught.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={isSubmitting}>
                {isSubmitting ? "MENDAFTAR..." : "DAFTAR SEBAGAI GURU"}
              </Button>
              <div className="text-center"> {/* Added text-center */}
                <IconButton
                  icon={ArrowLeft}
                  tooltip="Kembali ke Login"
                  onClick={() => router.push("/login")}
                  variant="outline"
                  className="w-full rounded-full py-2 h-auto"
                  disabled={isSubmitting}
                >
                  {!isMobile && "Kembali ke Login"}
                </IconButton>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}