"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Upload } from "lucide-react";
import React, { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { classOptions } from "@/lib/constants";
import { importStudentsFromFile, downloadStudentTemplate } from "@/lib/student-import-utils";
import { StatusCard } from "@/components/common/status-card";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const studentSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong"),
  nisn: z.string().min(1, "NISN tidak boleh kosong"),
  class: z.enum(classOptions as [string, ...string[]], { message: "Pilih kelas yang valid" }),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function ManageStudentsPage() {
  const { session } = useSupabase(); // Still need session for user.id
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [isImporting, setIsImporting] = useState(false);
  const [teacherClassTaught, setTeacherClassTaught] = useState<string | null>(null);
  const [loadingTeacherProfile, setLoadingTeacherProfile] = useState(true);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      name: "",
      nisn: "",
      class: classOptions[0],
    },
  });

  const { handleSubmit, register, formState, reset, setValue } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      setLoadingTeacherProfile(true);
      if (session?.user?.id) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("class_taught")
          .eq("id", session.user.id)
          .single();

        if (error) {
          console.error("Error fetching teacher profile:", error.message);
          showErrorToast("Gagal memuat profil guru untuk impor siswa.");
          setTeacherClassTaught(null);
        } else if (profile) {
          setTeacherClassTaught(profile.class_taught);
          if (profile.class_taught) {
            setValue("class", profile.class_taught as typeof classOptions[number]);
          }
        }
      }
      setLoadingTeacherProfile(false);
    };
    fetchTeacherProfile();
  }, [session, setValue]); // Removed supabase from dependencies

  const onSubmit = async (values: StudentFormValues) => {
    if (!session?.user?.id) {
      showErrorToast("Anda harus login sebagai guru untuk menambahkan siswa.");
      return;
    }

    if (!teacherClassTaught) {
      showErrorToast("Kelas yang diajar guru tidak ditemukan. Harap hubungi Admin untuk menetapkan kelas Anda.");
      return;
    }

    if (values.class !== teacherClassTaught) {
      showErrorToast(`Anda hanya dapat menambahkan siswa ke kelas Anda sendiri: ${teacherClassTaught}.`);
      return;
    }

    const { error } = await supabase
      .from("students")
      .insert({
        name: values.name,
        nisn: values.nisn,
        class: values.class,
        teacher_id: session.user.id,
        parent_id: null,
      });

    if (error) {
      if (error.code === "23505") {
        showErrorToast("NISN ini sudah terdaftar. Harap gunakan NISN yang berbeda.");
      } else {
        showErrorToast("Gagal menambahkan siswa: " + error.message);
      }
    } else {
      showSuccessToast("Siswa berhasil ditambahkan!");
      reset();
      setValue("class", teacherClassTaught as typeof classOptions[number]);
      router.push("/teacher/students");
    }
  };

  const handleDownloadTemplate = () => {
    downloadStudentTemplate();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showErrorToast("Pilih file untuk diimpor.");
      return;
    }

    if (!session) {
      showErrorToast("Sesi tidak ditemukan. Harap login kembali.");
      return;
    }

    if (!teacherClassTaught) {
      showErrorToast("Kelas yang diajar guru tidak ditemukan. Harap hubungi Admin untuk menetapkan kelas Anda.");
      return;
    }

    await importStudentsFromFile({
      file,
      session,
      teacherClassTaught,
      onImportComplete: () => router.push("/teacher/students"),
      setIsImporting,
    });
    event.target.value = '';
  };

  if (loadingTeacherProfile) {
    return <StatusCard status="loading" title="Memuat Profil Guru..." />;
  }

  return (
    <PageCardLayout
      title="Manajemen Data Siswa"
      backHref="/teacher/dashboard"
      className="max-w-2xl"
    >
      <h3 className="text-xl font-semibold">Tambah Siswa Tunggal</h3>
      {!teacherClassTaught ? (
        <p className="text-red-500 text-center">Anda belum memiliki kelas yang diajar. Harap hubungi Admin untuk menetapkan kelas Anda sebelum menambahkan siswa.</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Siswa</Label>
            <Input
              id="name"
              type="text"
              placeholder="Masukkan nama siswa"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-red-500 text-sm">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="nisn">NISN</Label>
            <Input
              id="nisn"
              type="text"
              placeholder="Masukkan NISN siswa"
              {...register("nisn")}
            />
            {errors.nisn && (
              <p className="text-red-500 text-sm">{errors.nisn.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="class">Kelas</Label>
            <Input
              id="class"
              type="text"
              value={teacherClassTaught}
              readOnly
              disabled
              className="bg-muted"
            />
            {errors.class && (
              <p className="text-red-500 text-sm">{errors.class.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Menyimpan..." : "Tambah Siswa"}
          </Button>
        </form>
      )}

      <div className="relative flex items-center py-5">
        <div className="flex-grow border-t border-gray-300"></div>
        <span className="flex-shrink mx-4 text-gray-400">ATAU</span>
        <div className="flex-grow border-t border-gray-300"></div>
      </div>

      <h3 className="text-xl font-semibold">Impor Siswa dari Excel</h3>
      <p className="text-sm text-muted-foreground">
        Unduh template, isi data siswa (Nama, NISN, Kelas), lalu unggah. Pastikan kolom 'Kelas' di file cocok dengan kelas yang Anda ajar.
      </p>
      <div className="space-y-4">
        <IconButton onClick={handleDownloadTemplate} className="w-full" variant="outline" icon={Download} tooltip="Unduh Template Excel">
          {!isMobile && "Unduh Template Excel"}
        </IconButton>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="excel-import">Unggah File Excel</Label>
          <Input
            id="excel-import"
            type="file"
            accept=".xlsx, .xls"
            onChange={handleFileChange}
            disabled={isImporting || !teacherClassTaught}
          />
          {isImporting && <p className="text-sm text-muted-foreground">Mengimpor data, mohon tunggu...</p>}
          {!teacherClassTaught && <p className="text-red-500 text-sm">Tidak dapat mengimpor siswa karena kelas Anda belum ditetapkan.</p>}
        </div>
      </div>
    </PageCardLayout>
  );
}