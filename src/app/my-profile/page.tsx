"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import IconButton
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi kata sandi minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Kata sandi baru dan konfirmasi kata sandi tidak cocok",
  path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface UserProfile {
  id: string;
  email: string; // Added email to UserProfile interface
  first_name: string | null;
  last_name: string | null;
  role: string;
  class_taught: string | null;
}

export default function MyProfilePage() {
  const { session, isLoadingSession } = useSupabase(); // Get isLoadingSession
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit: handleProfileSubmit, register: registerProfile, formState: profileFormState, setValue: setProfileValue } = profileForm;
  const { errors: profileErrors, isSubmitting: isProfileSubmitting } = profileFormState;

  const { handleSubmit: handlePasswordSubmit, register: registerPassword, formState: passwordFormState, reset: resetPasswordForm } = passwordForm;
  const { errors: passwordErrors, isSubmitting: isPasswordSubmitting } = passwordFormState;

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoadingProfile(true);
      setError(null);

      if (isLoadingSession) { // Wait for session to load
        return;
      }

      if (!session?.user?.id) {
        console.log("No session user ID found, cannot fetch profile.");
        setError("Anda harus login untuk melihat profil Anda.");
        setLoadingProfile(false);
        return;
      }

      console.log("Fetching profile for user ID:", session.user.id);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, role, class_taught")
        .eq("id", session.user.id)
        .single();

      if (error || !data) {
        console.error("Error fetching user profile:", error);
        setError("Gagal memuat profil pengguna.");
        showErrorToast("Gagal memuat profil Anda.");
        setLoadingProfile(false);
        return;
      }

      console.log("Fetched profile data successfully:", data);
      // Combine profile data with user email from session
      setUserProfile({ ...data, email: session.user.email || '' });
      setProfileValue("firstName", data.first_name || "");
      setProfileValue("lastName", data.last_name || "");
      setLoadingProfile(false);
    };

    fetchUserProfile();
  }, [session, setProfileValue, isLoadingSession]); // Add isLoadingSession to dependencies

  const onProfileSubmit = async (values: ProfileFormValues) => {
    if (!session?.user?.id) {
      showErrorToast("Anda harus login untuk memperbarui profil Anda.");
      return;
    }

    console.log("Attempting to update profile for user:", session.user.id, "with values:", values);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: values.firstName || null,
        last_name: values.lastName || null,
      })
      .eq("id", session.user.id);

    if (error) {
      console.error("Error updating profile:", error);
      showErrorToast("Gagal memperbarui profil: " + error.message);
    } else {
      console.log("Profile updated successfully for user:", session.user.id);
      showSuccessToast("Profil berhasil diperbarui!");
      // Optionally refresh session or profile data if needed
      // For now, just navigate back to dashboard based on role
      let backHref = "/login";
      if (userProfile?.role === "admin") {
        backHref = "/admin/dashboard";
      } else if (userProfile?.role === "teacher") {
        backHref = "/teacher/dashboard";
      } else if (userProfile?.role === "parent") {
        backHref = "/parent/dashboard";
      }
      router.push(backHref);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    if (!session) {
      showErrorToast("Anda tidak terautentikasi. Silakan login kembali.");
      return;
    }

    console.log("Attempting to change password for user:", session.user.email);
    const { error } = await supabase.auth.updateUser({
      password: values.newPassword,
    });

    if (error) {
      console.error("Error changing password:", error); // Log full error object
      showErrorToast("Gagal mengubah kata sandi: " + error.message);
    } else {
      console.log("Password changed successfully for user:", session.user.email);
      showSuccessToast("Kata sandi berhasil diubah! Silakan login kembali dengan kata sandi baru Anda.");
      resetPasswordForm();
      // Force sign out after successful password change for security and to ensure new password is used
      await supabase.auth.signOut();
      router.push("/login"); // Redirect to login page
    }
  };

  // Handle loading state from SessionContextProvider
  if (isLoadingSession || loadingProfile) {
    return <StatusCard status="loading" title="Memuat Profil Anda..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/login" backButtonText="Kembali ke Login" />;
  }

  // Determine backHref based on fetched userProfile role
  let backHref = "/login";
  if (userProfile?.role === "admin") {
    backHref = "/admin/dashboard";
  } else if (userProfile?.role === "teacher") {
    backHref = "/teacher/dashboard";
  } else if (userProfile?.role === "parent") {
    backHref = "/parent/dashboard";
  }

  return (
    <PageCardLayout
      title="Profil Saya"
      backHref={backHref}
      className="w-full" // Removed max-w-md
    >
      <CardDescription className="text-center mb-4">
        Perbarui informasi profil Anda.
      </CardDescription>
      <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={userProfile?.email || ""}
            readOnly
            disabled
            className="bg-muted"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="firstName">Nama Depan</Label>
          <Input
            id="firstName"
            type="text"
            placeholder="Nama Depan"
            {...registerProfile("firstName")}
          />
          {profileErrors.firstName && (
            <p className="text-red-500 text-sm">{profileErrors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nama Belakang</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Nama Belakang"
            {...registerProfile("lastName")}
          />
          {profileErrors.lastName && (
            <p className="text-red-500 text-sm">{profileErrors.lastName.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isProfileSubmitting}>
          {isProfileSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
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
    </PageCardLayout>
  );
}