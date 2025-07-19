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
import { format, getDay } from 'date-fns';
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

const transactionSchema = z.object({
  amount: z.string().min(1, "Jumlah tidak boleh kosong").regex(/^\d+(\.\d{1,2})?$/, "Jumlah harus angka positif"),
  type: z.enum(["deposit", "withdrawal"], { message: "Tipe transaksi tidak valid" }),
  description: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

interface SavingSchedule {
  amount_expected: number;
  frequency: "daily" | "weekly" | "monthly";
  day_of_week: string | null;
}

interface TeacherAddTransactionFormProps {
  studentId: string;
  currentBalance: number;
  onTransactionAdded: () => void;
}

export function TeacherAddTransactionForm({
  studentId,
  currentBalance,
  onTransactionAdded,
}: TeacherAddTransactionFormProps) {
  const { session } = useSupabase(); // Still need session for user.id
  const [studentSavingSchedule, setStudentSavingSchedule] = useState<SavingSchedule | null>(null);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      type: "deposit",
      description: "",
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const transactionType = watch("type");

  // Effect to fetch saving schedule for the student
  useEffect(() => {
    const fetchSavingSchedule = async () => {
      if (studentId) {
        setLoadingSchedule(true);
        const { data, error } = await supabase
          .from("saving_schedules")
          .select("amount_expected, frequency, day_of_week")
          .eq("student_id", studentId)
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
  }, [studentId]); // Removed supabase from dependencies

  const onSubmit = async (values: TransactionFormValues) => {
    if (!session?.user?.id || !studentId) {
      showErrorToast("Anda harus login sebagai guru untuk menambahkan transaksi.");
      return;
    }

    const amount = parseFloat(values.amount);
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
      if (amount > currentBalance) {
        showErrorToast("Jumlah penarikan melebihi saldo yang tersedia.");
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

    const { error: insertError } = await supabase
      .from("transactions")
      .insert({
        student_id: studentId,
        amount: amount,
        type: values.type,
        description: values.description,
        teacher_id: session.user.id,
      });

    if (insertError) {
      showErrorToast("Gagal menambahkan transaksi: " + insertError.message);
    } else {
      showSuccessToast("Transaksi berhasil ditambahkan!");
      reset();
      setValue("type", "deposit");
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
      {loadingSchedule ? (
        <Skeleton className="h-16 w-full" />
      ) : studentSavingSchedule && (
        <div className="text-sm text-muted-foreground p-2 border rounded-md bg-blue-50 dark:bg-blue-900/20">
          <p className="font-semibold">Jadwal Menabung Siswa:</p>
          <p>Jumlah Diharapkan: Rp {studentSavingSchedule.amount_expected.toLocaleString('id-ID')}</p>
          <p>Frekuensi: {frequencyMap[studentSavingSchedule.frequency]}</p>
          {studentSavingSchedule.day_of_week && <p>Hari: {dayOfWeekMap[studentSavingSchedule.day_of_week] || studentSavingSchedule.day_of_week}</p>}
        </div>
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
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Menyimpan..." : "Tambah Transaksi"}
      </Button>
    </form>
  );
}