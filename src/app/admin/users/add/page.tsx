"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { classOptions } from "@/lib/constants";
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const addUserSchema = z.object({
  email: z.string().email("Email tidak valid").optional(),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
  role: z.enum(["teacher", "parent"], { message: "Pilih peran yang valid" }),
  fullName: z.string().optional(),
  class_taught: z.string().optional(),
  nisn: z.string().optional(),
  studentName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.role === "teacher") {
    if (!data.email || data.email.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Email tidak boleh kosong untuk peran guru.",
        path: ["email"],
      });
    }
    if (!data.fullName || data.fullName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama lengkap tidak boleh kosong untuk peran guru.",
        path: ["fullName"],
      });
    }
    if (!data.class_taught || data.class_taught.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Kelas yang diajar tidak boleh kosong untuk peran guru.",
        path: ["class_taught"],
      });
    }
  } else if (data.role === "parent") {
    if (!data.nisn || data.nisn.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "NISN anak tidak boleh kosong untuk peran orang tua.",
        path: ["nisn"],
      });
    }
    if (!data.studentName || data.studentName.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama siswa tidak ditemukan atau tidak valid.",
        path: ["studentName"],
      });
    }
  }
});

type AddUserFormValues = z.infer<typeof addUserSchema>;

export default function AddUserPage() {
  const { session } = useSupabase(); // Still need session for access_token
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingStudentName, setLoadingStudentName] = useState(false);

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      email: "",
      password: "",
      role: "teacher",
      fullName: "",
      class_taught: "",
      nisn: "",
      studentName: "",
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const selectedRole = watch("role");
  const nisnValue = watch("nisn");

  useEffect(() => {
    const fetchStudentName = async () => {
      if (selectedRole === "parent" && nisnValue && nisnValue.length > 0) {
        setLoadingStudentName(true);
        try {
          const response = await fetch(getSupabaseFunctionUrl("get-student-for-parent-registration"), {
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
            toast.error("NISN tidak ditemukan atau sudah terhubung.");
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
    }, 500);

    return () => {
      clearTimeout(handler);
      setLoadingStudentName(false);
    };
  }, [nisnValue, selectedRole, setValue]);

  const onSubmit = async (values: AddUserFormValues) => {
    if (!session?.user?.id) {
      toast.error("Anda harus login sebagai admin untuk menambahkan pengguna.");
      return;
    }

    try {
      if (values.role === "parent") {
        let studentIdToLink: string | null = null;
        let studentNameForToast: string | null = null;

        // Re-verify student and get studentId using the edge function
        try {
          const response = await fetch(getSupabaseFunctionUrl("get-student-for-parent-registration"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Authorization": `Bearer ${session.access_token}`, // Use admin's token for this service role function
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
          toast.error(error.message);
          return;
        }

        // Generate a unique email for the parent based on NISN
        const parentEmail = `nisn-${values.nisn}@tabunganku.com`;

        // Sign up the parent user with the generated email
        const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
          email: parentEmail,
          password: values.password,
          email_confirm: true,
          user_metadata: {
            role: "parent",
            first_name: values.fullName || null,
            last_name: null,
            class_taught: null,
          },
        });

        if (signUpError) {
          toast.error("Gagal membuat akun orang tua: " + signUpError.message);
          return;
        }

        const newParentId = signUpData.user?.id;

        if (newParentId && studentIdToLink) {
          // Now, call the new Edge Function to link the student to this new parent
          const linkResponse = await fetch(getSupabaseFunctionUrl("link-student-to-parent"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              "Authorization": `Bearer ${session.access_token}`, // Use admin's token for this service role function
            },
            body: JSON.stringify({ studentId: studentIdToLink, parentId: newParentId }),
          });

          const linkData = await linkResponse.json();

          if (!linkResponse.ok) {
            throw new Error(linkData.error || "Gagal menghubungkan anak.");
          }

          toast.success(`Akun orang tua untuk ${studentNameForToast} berhasil dibuat dan terhubung!`);
        } else {
          toast.error("Akun orang tua berhasil dibuat, tetapi ID pengguna atau siswa tidak ditemukan untuk menghubungkan anak.");
        }
      } else {
        // Existing logic for teacher/admin creation
        const response = await fetch(getSupabaseFunctionUrl("create-user-by-admin"), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: values.email,
            password: values.password,
            role: values.role,
            fullName: values.fullName,
            class_taught: values.class_taught,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Gagal membuat akun pengguna.");
        }

        toast.success(`Pengguna ${values.email} (${values.role}) berhasil ditambahkan!`);
      }

      reset();
      setValue("role", "teacher");
      setValue("class_taught", "");
      setValue("nisn", "");
      setValue("studentName", "");
      setValue("fullName", "");
      setValue("email", "");
      router.push("/admin/users");
    } catch (error: any) {
      toast.error("Gagal menambahkan pengguna: " + error.message);
    }
  };

  return (
    <PageCardLayout
      title="Tambah Pengguna Baru"
      backHref="/admin/users"
      className="max-w-md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="role">Peran</Label>
          <Select onValueChange={(value: "teacher" | "parent") => {
            setValue("role", value);
            setValue("email", "");
            setValue("nisn", "");
            setValue("studentName", "");
            setValue("fullName", "");
            setValue("class_taught", "");
          }} defaultValue="teacher">
            <SelectTrigger id="role">
              <SelectValue placeholder="Pilih peran" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="teacher">Guru</SelectItem>
              <SelectItem value="parent">Orang Tua</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-red-500 text-sm">{errors.role.message}</p>
          )}
        </div>

        {selectedRole !== "parent" && (
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="contoh@email.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-red-500 text-sm">{errors.email.message}</p>
            )}
          </div>
        )}
        {selectedRole === "parent" && (
          <>
            <div className="space-y-2">
              <Label htmlFor="nisn">NISN Anak</Label>
              <Input
                id="nisn"
                type="text"
                placeholder="Masukkan NISN anak"
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
          </>
        )}
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
        <Button type="submit" className="w-full" disabled={isSubmitting || (selectedRole === "parent" && (!watch("studentName") || loadingStudentName))}>
          {isSubmitting ? "Menambahkan..." : "Tambah Pengguna"}
        </Button>
        <IconButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/admin/users")}
          disabled={isSubmitting}
          icon={ArrowLeft}
          tooltip="Batal"
        >
          {!isMobile && "Batal"}
        </IconButton>
      </form>
    </PageCardLayout>
  );
}