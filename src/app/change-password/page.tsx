"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient";

const changePasswordSchema = z.object({
  newPassword: z.string().min(6, "Kata sandi baru minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi kata sandi minimal 6 karakter"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Kata sandi baru dan konfirmasi kata sandi tidak cocok",
  path: ["confirmPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const { handleSubmit, register, formState, reset } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = async (values: ChangePasswordFormValues) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword,
      });

      if (error) {
        showErrorToast("Gagal mengubah kata sandi: " + error.message);
      } else {
        showSuccessToast("Kata sandi berhasil diubah! Silakan login dengan kata sandi baru Anda.");
        reset();
        router.push("/login");
      }
    } catch (error: any) {
      showErrorToast("Terjadi kesalahan: " + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary p-4">
      <Card className="w-full max-w-md rounded-3xl shadow-xl pt-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary text-center">Ubah Kata Sandi</CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            Masukkan kata sandi baru Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Kata Sandi Baru</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Masukkan kata sandi baru"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-red-500 text-sm">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Kata Sandi Baru</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Konfirmasi kata sandi baru"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={isSubmitting}>
              {isSubmitting ? "Mengubah..." : "Ubah Kata Sandi"}
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
  );
}