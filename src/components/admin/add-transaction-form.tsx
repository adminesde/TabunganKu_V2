"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useSupabase } from "@/components/session-context-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { format, getDay } from 'date-fns'; // Import date-fns functions
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const transactionSchema = z.object({
  studentId: z.string().uuid("Pilih siswa yang valid."),
  amount: z.string().min(1, "Jumlah tidak boleh kosong").regex(/^\d+(\.\d{1,2})?$/, "Jumlah harus angka positif"),
  type: z.enum(["deposit", "withdrawal"], { message: "Tipe transaksi tidak valid" }),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface StudentOption {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  current_balance: number;
  teacher_id: string | null;
}

interface SavingSchedule {
  amount_expected: number;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week: string | null;
}

interface AddTransactionFormProps {
  allStudents: StudentOption[];
  classes: string[];
  loadingStudents: boolean;
  loadingClasses: boolean;
  onTransactionAdded: () => void;
}

export function AddTransactionForm({ allStudents, classes, loadingStudents, loadingClasses, onTransactionAdded }: AddTransactionFormProps) {
  const { session } = useSupabase(); // Still need session for user.id
  const [selectedClassForForm, setSelectedClassForForm] = useState<string | undefined>(undefined);
  const [studentsInSelectedClass, setStudentsInSelectedClass] = useState<StudentOption[]>([]);
  const [studentSavingSchedule, setStudentSavingSchedule] = useState<SavingSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      studentId: '', // Changed from undefined to ''
      amount: "",
      type: "deposit",
      description: "",
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const selectedStudentId = watch("studentId");
  const transactionType = watch("type");

  // Effect to filter students when selectedClassForForm or allStudents changes
  useEffect(() => {
    if (selectedClassForForm && selectedClassForForm !== "all") {
      const filtered = allStudents.filter(student => student.class === selectedClassForForm);
      setStudentsInSelectedClass(filtered);
    } else {
      setStudentsInSelectedClass(allStudents); // If no class selected, show all students
    }
    setValue("studentId", ''); // Reset student selection when class filter changes
  }, [selectedClassForForm, allStudents, setValue]);

  // Effect to fetch saving schedule for selected student
  useEffect(() => {
    const fetchSavingSchedule = async () => {
      if (selectedStudentId) {
        setLoadingSchedule(true);
        const { data, error } = await supabase
          .from("saving_schedules")
          .select("amount_expected, frequency, day_of_week")
          .eq("student_id", selectedStudentId)
          .limit(1)
          .single();

        if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
          console.error("Error fetching saving schedule:", error.message);
          setStudentSavingSchedule(null);
        } else if (data) {
          setStudentSavingSchedule(data as SavingSchedule);
        } else {
          setStudentSavingSchedule(null);
        }
        setLoadingSchedule(false);
      } else {
        setStudentSavingSchedule(null);
        setLoadingSchedule(false);
      }
    };
    fetchSavingSchedule();
  }, [selectedStudentId]); // Removed supabase from dependencies

  const onSubmit = async (values: TransactionFormValues) => {
    if (!session?.user?.id) {
      showErrorToast("Anda harus login sebagai admin untuk menambahkan transaksi.");
      return;
    }
    if (!values.studentId) {
      showErrorToast("Pilih siswa terlebih dahulu.");
      return;
    }

    const amount = parseFloat(values.amount);
    const selectedStudent = studentsInSelectedClass.find(s => s.student_id === values.studentId);
    const currentStudentBalance = selectedStudent ? selectedStudent.current_balance : 0;
    const studentTeacherId = selectedStudent ? selectedStudent.teacher_id : null;

    const frequencyMap: Record<string, string> = {
      daily: "Harian",
      weekly: "Mingguan",
      monthly: "Bulanan",
    };

    const dayOfWeekMap: Record<string, string> = {
      Monday: "Senin",
      Tuesday: "Selasa",
      Wednesday: "Rabu",
      Thursday: "Kamis",
      Friday: "Jumat",
      Saturday: "Sabtu",
      Sunday: "Minggu",
    };

    if (values.type === "withdrawal") {
      if (amount > currentStudentBalance) {
        showErrorToast("Jumlah penarikan melebihi saldo yang tersedia untuk siswa ini.");
        return;
      }
    } else { // type === "deposit"
      if (studentSavingSchedule) {
        const today = new Date();
        const dayOfWeekMapForValidation: Record<string, number> = {
          sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6
        };
        const scheduledDayIndex = studentSavingSchedule.day_of_week ? dayOfWeekMapForValidation[studentSavingSchedule.day_of_week.toLowerCase()] : -1;
        const todayIndex = getDay(today); // 0 for Sunday, 1 for Monday, etc.

        if (studentSavingSchedule.frequency === "weekly" && studentSavingSchedule.day_of_week && scheduledDayIndex !== todayIndex) {
          showErrorToast(`Setoran hanya dapat dilakukan pada hari ${dayOfWeekMap[studentSavingSchedule.day_of_week]} sesuai jadwal.`);
          return;
        }
        // For daily/monthly, no specific day check is needed if day_of_week is null
      }
    }

    const { error } = await supabase
      .from("transactions")
      .insert({
        student_id: values.studentId,
        amount: amount,
        type: values.type,
        description: values.description,
        teacher_id: studentTeacherId,
      });

    if (error) {
      showErrorToast("Gagal menambahkan transaksi: " + error.message);
    } else {
      showSuccessToast("Transaksi berhasil ditambahkan!");
      reset({
        studentId: '', // Changed from undefined to ''
        amount: "",
        type: "deposit",
        description: "",
      });
      setSelectedClassForForm(undefined);
      setStudentSavingSchedule(null); // Clear schedule info
      onTransactionAdded();
    }
  };

  const dayOfWeekMap: Record<string, string> = {
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
    Sunday: "Minggu",
  };

  const frequencyMap: Record<string, string> = {
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="classFilterForForm">Pilih Kelas</Label>
        {loadingClasses ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            onValueChange={(value) => setSelectedClassForForm(value === "all" ? undefined : value)}
            value={selectedClassForForm || "all"}
            disabled={classes.length === 0}
          >
            <SelectTrigger id="classFilterForForm">
              <SelectValue placeholder={classes.length === 0 ? "Tidak ada kelas tersedia" : "Pilih kelas"} />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls} value={cls}>
                  {cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="studentId">Pilih Siswa</Label>
        {loadingStudents ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <Select
            onValueChange={(value) => setValue("studentId", value || '')} // Changed undefined to ''
            value={selectedStudentId || ""}
            disabled={studentsInSelectedClass.length === 0}
          >
            <SelectTrigger id="studentId">
              <SelectValue placeholder={studentsInSelectedClass.length === 0 ? "Tidak ada siswa tersedia di kelas ini" : "Pilih siswa"} />
            </SelectTrigger>
            <SelectContent>
              {studentsInSelectedClass.map((student) => (
                <SelectItem key={student.student_id} value={student.student_id}>
                  {student.student_name} ({student.class} - {student.nisn}) - Saldo: Rp {Math.max(0, student.current_balance)?.toLocaleString('id-ID') || '0'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {errors.studentId && (
          <p className="text-red-500 text-sm">{errors.studentId.message}</p>
        )}
      </div>
      {selectedStudentId && !loadingSchedule && studentSavingSchedule && (
        <div className="text-sm text-muted-foreground p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20">
          <p className="font-semibold">Jadwal Menabung Siswa:</p>
          <p>Jumlah Diharapkan: Rp {studentSavingSchedule.amount_expected.toLocaleString('id-ID')}</p>
          <p>Frekuensi: {frequencyMap[studentSavingSchedule.frequency]}</p>
          {studentSavingSchedule.day_of_week && <p>Hari: {dayOfWeekMap[studentSavingSchedule.day_of_week] || studentSavingSchedule.day_of_week}</p>}
        </div>
      )}
      {selectedStudentId && loadingSchedule && (
        <Skeleton className="h-16 w-full" />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Jumlah</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            placeholder="Masukkan jumlah"
            {...register("amount")}
          />
          {errors.amount && (
            <p className="text-red-500 text-sm">{errors.amount.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Tipe Transaksi</Label>
          <Select onValueChange={(value: "deposit" | "withdrawal") => setValue("type", value)} defaultValue="deposit">
            <SelectTrigger id="type">
              <SelectValue placeholder="Pilih tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="deposit">Setoran</SelectItem>
              <SelectItem value="withdrawal">Penarikan</SelectItem>
            </SelectContent>
          </Select>
          {errors.type && (
            <p className="text-red-500 text-sm">{errors.type.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (Opsional)</Label>
        <Textarea
          id="description"
          placeholder="Contoh: Uang saku, Beli buku"
          {...register("description")}
        />
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting || studentsInSelectedClass.length === 0 || !selectedStudentId}>
        {isSubmitting ? "Menyimpan..." : "Tambah Transaksi"}
      </Button>
    </form>
  );
}