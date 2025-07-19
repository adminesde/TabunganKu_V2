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
import { ArrowLeft, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react"; // Import React
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { classOptions } from "@/lib/constants";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast, showSuccessToast, showWarningToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const editStudentSchema = z.object({
  name: z.string().min(1, "Nama tidak boleh kosong"),
  nisn: z.string().min(1, "NISN tidak boleh kosong"),
  class: z.enum(classOptions as [string, ...string[]], { message: "Pilih kelas yang valid" }),
});

type EditStudentFormValues = z.infer<typeof editStudentSchema>;

interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  teacher_id: string;
}

export default function EditStudentPage({ params }: { params: { studentId: string } }) {
  const { studentId } = React.use(params); // Menggunakan React.use()
  const { session } = useSupabase(); // Still need session for user.id
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const form = useForm<EditStudentFormValues>({
    resolver: zodResolver(editStudentSchema),
    defaultValues: {
      name: "",
      nisn: "",
      class: classOptions[0],
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    const fetchStudent = async () => {
      setLoadingStudent(true);
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login sebagai guru untuk mengedit siswa.");
        setLoadingStudent(false);
        return;
      }

      const { data, error } = await supabase
        .from("students")
        .select("id, name, nisn, class, teacher_id")
        .eq("id", studentId)
        .eq("teacher_id", session.user.id) // Ensure the teacher owns this student
        .single();

      if (error || !data) {
        setError("Siswa tidak ditemukan atau Anda tidak memiliki akses untuk mengedit siswa ini.");
        showErrorToast("Siswa tidak ditemukan atau akses ditolak.");
        setLoadingStudent(false);
        return;
      }

      setStudent(data);
      setValue("name", data.name);
      setValue("nisn", data.nisn);
      setValue("class", data.class as typeof classOptions[number]);
      setLoadingStudent(false);
    };

    fetchStudent();
  }, [studentId, session, setValue]); // Removed supabase from dependencies

  const onSubmit = async (values: EditStudentFormValues) => {
    if (!session?.user?.id || !student) {
      showErrorToast("Anda harus login sebagai guru untuk mengedit siswa.");
      return;
    }

    let newTeacherId = student.teacher_id; // Default to current teacher's ID
    let classChanged = false;

    // If the class is changed, find the teacher for the new class
    if (values.class !== student.class) {
      classChanged = true;
      const { data: newTeacherProfile, error: teacherError } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "teacher")
        .eq("class_taught", values.class)
        .single();

      if (teacherError) {
        if (teacherError.code === "PGRST116") { // No rows found
          showWarningToast(`Tidak ada guru yang ditemukan untuk kelas ${values.class}. Siswa akan tetap di bawah guru saat ini.`);
        } else {
          console.error("Error fetching new teacher:", teacherError.message);
          showErrorToast("Gagal mencari guru untuk kelas baru. Siswa akan tetap di bawah guru saat ini.");
        }
      } else if (newTeacherProfile) {
        newTeacherId = newTeacherProfile.id;
      }
    }

    // Perform updates
    if (classChanged && newTeacherId !== student.teacher_id) {
      // If class changed AND a new teacher was found, use the SQL function for transfer
      const { error: transferError } = await supabase.rpc('transfer_student_teacher', {
        student_id_param: studentId,
        new_teacher_id_param: newTeacherId,
      });

      if (transferError) {
        showErrorToast("Gagal mentransfer siswa: " + transferError.message);
        return;
      }
    }

    // Update other student details (name, nisn, class)
    // Note: teacher_id is handled by the function if changed
    const { error: updateError } = await supabase
      .from("students")
      .update({
        name: values.name,
        nisn: values.nisn,
        class: values.class,
        // Do NOT update teacher_id here directly if it was handled by the function
      })
      .eq("id", studentId)
      .eq("teacher_id", session.user.id); // Ensure current teacher still owns it for other updates

    if (updateError) {
      if (updateError.code === "23505") {
        showErrorToast("NISN ini sudah terdaftar untuk siswa lain. Harap gunakan NISN yang berbeda.");
      } else {
        showErrorToast("Gagal memperbarui data siswa: " + updateError.message);
      }
    } else {
      showSuccessToast("Data siswa berhasil diperbarui!");
      router.push("/teacher/students"); // Redirect back to student list
    }
  };

  const handleDeleteStudent = async () => {
    if (!session?.user?.id || !student) {
      showErrorToast("Terjadi kesalahan saat menghapus siswa.");
      return;
    }

    const { error } = await supabase
      .from("students")
      .delete()
      .eq("id", studentId)
      .eq("teacher_id", session.user.id); // Ensure the teacher owns this student

    if (error) {
      showErrorToast("Gagal menghapus siswa: " + error.message);
    } else {
      showSuccessToast(`Siswa ${student.name} berhasil dihapus.`);
      router.push("/teacher/students"); // Redirect back to student list
    }
    setIsDeleteDialogOpen(false);
  };

  if (loadingStudent) {
    return <StatusCard status="loading" title="Memuat Data Siswa..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/teacher/students" backButtonText="Kembali ke Daftar Siswa" />;
  }

  if (!student) {
    return <StatusCard status="empty" title="Siswa Tidak Ditemukan" message="Detail siswa tidak dapat dimuat." backButtonHref="/teacher/students" backButtonText="Kembali ke Daftar Siswa" />;
  }

  return (
    <PageCardLayout
      title="Edit Data Siswa"
      backHref="/teacher/students"
      className="max-w-md"
    >
      <p className="text-center text-muted-foreground mb-4">Mengedit: {student.name}</p>
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
          <Select
            onValueChange={(value) => setValue("class", value as typeof classOptions[number])}
            value={form.watch("class")}
          >
            <SelectTrigger id="class">
              <SelectValue placeholder="Pilih kelas siswa" />
            </SelectTrigger>
            <SelectContent>
                {classOptions.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.class && (
            <p className="text-red-500 text-sm">{errors.class.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
        <IconButton
          icon={Trash2}
          tooltip="Hapus Siswa"
          variant="destructive"
          className="w-full"
          onClick={() => setIsDeleteDialogOpen(true)}
          disabled={isSubmitting}
        >
          {!isMobile && "Hapus Siswa"}
        </IconButton>
        <IconButton
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/teacher/students")}
          disabled={isSubmitting}
          icon={ArrowLeft}
          tooltip="Batal"
        >
          {!isMobile && "Batal"}
        </IconButton>
      </form>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin ingin menghapus siswa ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus data siswa{" "}
              <span className="font-semibold">{student?.name}</span> secara permanen dan semua transaksi terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudent} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageCardLayout>
  );
}