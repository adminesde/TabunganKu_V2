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
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const forgotPasswordSchema = z.object({
  email: z.string().email("Email tidak valid"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const { handleSubmit, register, formState } = form;
  const { errors, isSubmitting } = formState;

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${window.location.origin}/change-password`, // Redirect to change-password page after email click
      });

      if (error) {
        showErrorToast("Gagal mengirim email reset kata sandi: " + error.message);
      } else {
        showSuccessToast("Email reset kata sandi telah dikirim. Silakan periksa kotak masuk Anda.");
        // Removed: router.push("/login");
        // User will stay on this page with the success toast,
        // and can manually go back to login or wait for email.
      }
    } catch (error: any) {
      showErrorToast("Terjadi kesalahan: " + error.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-primary p-4">
      <Card className="w-full max-w-md mx-auto rounded-3xl shadow-xl pt-10">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-primary text-center">Lupa Kata Sandi?</CardTitle>
          <CardDescription className="text-muted-foreground text-center">
            Masukkan email Anda dan kami akan mengirimkan tautan untuk mereset kata sandi Anda.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@contoh.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-red-500 text-sm">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-2 h-auto" disabled={isSubmitting}>
              {isSubmitting ? "Mengirim..." : "Kirim Tautan Reset"}
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
                {!isMobile && "Kembali ke Login"}
              </IconButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}