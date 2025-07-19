"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import React, { useEffect, useState } from "react"; // Import React
import { Skeleton } from "@/components/ui/skeleton";
import { classOptions } from "@/lib/constants"; // Import classOptions
import { getSupabaseFunctionUrl } from "@/lib/utils"; // Import the utility function
import { PageCardLayout } from "@/components/layout/page-card-layout"; // Import the new layout
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const editUserSchema = z.object({
  firstName: z.string().optional(), // Changed from fullName
  lastName: z.string().optional(), // New field
  role: z.enum(["admin", "teacher", "parent"], { message: "Pilih peran yang valid" }),
  class_taught: z.string().nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "teacher") {
    if (!data.firstName || data.firstName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama depan tidak boleh kosong untuk peran guru.",
        path: ["firstName"],
      });
    }
    if (!data.class_taught || data.class_taught.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kelas yang diajar tidak boleh kosong untuk peran guru.",
        path: ["class_taught"],
      });
    }
  }
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi kata sandi minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Kata sandi baru dan konfirmasi kata sandi tidak cocok",
  path: ["confirmPassword"],
});

type EditUserFormValues = z.infer<typeof editUserSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  class_taught: string | null;
}

export default function EditUserPage({ params }: { params: { userId: string } }) {
  const { userId } = React.use(params); // Menggunakan React.use()
  const { session } = useSupabase(); // Still need session for access_token
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingUser, setLoadingUser] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      role: "teacher",
      class_taught: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const selectedRole = watch("role");

  const { handleSubmit: handlePasswordSubmit, register: registerPassword, formState: passwordFormState, reset: resetPasswordForm } = passwordForm;
  const { errors: passwordErrors, isSubmitting: isPasswordSubmitting } = passwordFormState;

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoadingUser(true);
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login sebagai admin untuk mengedit pengguna.");
        setLoadingUser(false);
        return;
      }

      try {
        const response = await fetch(getSupabaseFunctionUrl("get-user-by-admin"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal memuat data pengguna.");
        }

        const fetchedProfile = data.user;
        setUserProfile(fetchedProfile);

        // Set form default values
        setValue("firstName", fetchedProfile.first_name || "");
        setValue("lastName", fetchedProfile.last_name || "");
        setValue("role", fetchedProfile.role as "admin" | "teacher" | "parent");
        setValue("class_taught", fetchedProfile.class_taught || "");
      } catch (err: any) {
        setError(err.message);
        showErrorToast("Gagal memuat data pengguna: " + err.message);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserProfile();
  }, [userId, session, setValue]); // Removed supabase from dependencies

  const onSubmit = async (values: EditUserFormValues) => {
    if (!session?.user?.id || !userProfile) {
      showErrorToast("Anda harus login sebagai admin untuk mengedit pengguna.");
      return;
    }

    // Ensure only admin can edit users (this check is also done in the Edge Function)
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "admin") {
      showErrorToast("Akses ditolak. Anda tidak memiliki izin untuk mengedit pengguna.");
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("update-user-by-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
          firstName: values.firstName, // Changed
          lastName: values.lastName,   // New
          role: values.role,
          class_taught: values.class_taught,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memperbarui profil pengguna.");
      }

      showSuccessToast(`Profil pengguna ${userProfile.email} berhasil diperbarui!`);
      router.push("/admin/users");
    } catch (err: any) {
      showErrorToast("Gagal memperbarui pengguna: " + err.message);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    if (!session?.user?.id || !userProfile) {
      showErrorToast("Anda harus login sebagai admin untuk mengubah kata sandi.");
      return;
    }

    console.log("Attempting to change password for user ID:", userId);
    try {
      const response = await fetch(getSupabaseFunctionUrl("update-user-password-by-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId: userId,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mengubah kata sandi pengguna.");
      }

      console.log("Password changed successfully for user ID:", userId);
      showSuccessToast(`Kata sandi untuk ${userProfile.email} berhasil diubah!`);
      resetPasswordForm();
    } catch (err: any) {
      console.error("Error changing password for user ID:", userId, err.message);
      showErrorToast("Gagal mengubah kata sandi: " + err.message);
    }
  };

  if (loadingUser) {
    return <StatusCard status="loading" title="Memuat Data Pengguna..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/admin/users" backButtonText="Kembali ke Manajemen Pengguna" />;
  }

  return (
    <PageCardLayout
      title="Edit Pengguna"
      backHref="/admin/users"
      className="max-w-md"
    >
      <p className="text-center text-muted-foreground mb-4">Mengedit: {userProfile?.email}</p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nama Depan</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Nama Depan"
            {...register("firstName")}
          />
          {errors.firstName && (
            <p className="text-red-500 text-sm">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nama Belakang</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Nama Belakang"
            {...register("lastName")}
          />
          {errors.lastName && (
            <p className="text-red-500 text-sm">{errors.lastName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Peran</Label>
          <Select onValueChange={(value: "admin" | "teacher" | "parent") => setValue("role", value)} value={form.watch("role")}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Pilih peran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="teacher">Guru</SelectItem>
              <SelectItem value="parent">Orang Tua</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-red-500 text-sm">{errors.role.message}</p>
          )}
        </div>
        {selectedRole === "teacher" && (
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
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Profil"}
        </Button>
      </form>

      <div className="relative flex items-center py-5">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-400">Ubah Kata Sandi</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Kata Sandi Baru</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Masukkan kata sandi baru"
            {...registerPassword("newPassword")}
          />
          {passwordErrors.newPassword && (
            <p className="text-red-500 text-sm">{passwordErrors.newPassword.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Konfirmasi kata sandi baru"
            {...registerPassword("confirmPassword")}
          />
          {passwordErrors.confirmPassword && (
            <p className="text-red-500 text-sm">{passwordErrors.confirmPassword.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isPasswordSubmitting}>
          {isPasswordSubmitting ? "Mengubah..." : "Ubah Kata Sandi"}
        </Button>
      </form>

      <IconButton
        type="button"
        variant="outline"
        className="w-full mt-4"
        onClick={() => router.push("/admin/users")}
        disabled={isSubmitting || isPasswordSubmitting}
        icon={ArrowLeft}
        tooltip="Batal"
      >
        {!isMobile && "Batal"}
      </IconButton>
    </PageCardLayout>
  );
}