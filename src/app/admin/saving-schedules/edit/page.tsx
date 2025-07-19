"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { StatusCard } from "@/components/common/status-card";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

// Updated Zod schema to include amount_expected, frequency, and day_of_week
const editSavingScheduleSchema = z.object({
  amount_expected: z.string().min(1, "Jumlah diharapkan tidak boleh kosong").regex(/^\d+(\.\d{1,2})?$/, "Jumlah harus angka positif"),
  frequency: z.enum(["daily", "weekly", "monthly"], { message: "Pilih frekuensi yang valid" }),
  day_of_week: z.string().nullable().optional(), // Nullable for daily/monthly
}).superRefine((data, ctx) => {
  if (data.frequency === "weekly" && (!data.day_of_week || data.day_of_week.trim() === "")) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Hari dalam seminggu tidak boleh kosong untuk frekuensi mingguan.",
      path: ["day_of_week"],
    });
  }
});

type EditSavingScheduleFormValues = z.infer<typeof editSavingScheduleSchema>;

export default function AdminEditSavingSchedulePage() {
  const { session } = useSupabase(); // Still need session for access_token
  const router = useRouter();
  const searchParams = useSearchParams();

  const oldClass = searchParams.get('class');
  const oldAmountExpected = searchParams.get('amount');
  const oldFrequency = searchParams.get('frequency');
  const oldDayOfWeek = searchParams.get('day'); // Can be empty string if null

  const [loadingInitialData, setLoadingInitialData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EditSavingScheduleFormValues>({
    resolver: zodResolver(editSavingScheduleSchema),
    defaultValues: {
      amount_expected: "",
      frequency: "weekly",
      day_of_week: null,
    },
  });

  const { handleSubmit, register, formState, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const currentFrequency = watch("frequency"); // Watch frequency to conditionally render day_of_week

  useEffect(() => {
    if (!oldClass || !oldAmountExpected || !oldFrequency) {
      setError("Parameter jadwal tidak lengkap. Tidak dapat mengedit.");
      setLoadingInitialData(false);
      return;
    }
    // Set form values from search params
    setValue("amount_expected", oldAmountExpected);
    setValue("frequency", oldFrequency as "daily" | "weekly" | "monthly");
    setValue("day_of_week", oldDayOfWeek === '' ? null : oldDayOfWeek);
    setLoadingInitialData(false);
  }, [oldClass, oldAmountExpected, oldFrequency, oldDayOfWeek, setValue]);

  const onSubmit = async (values: EditSavingScheduleFormValues) => {
    if (!session?.user?.id) {
      showErrorToast("Anda harus login sebagai admin untuk mengedit jadwal menabung.");
      return;
    }

    if (!oldClass || !oldAmountExpected || !oldFrequency) {
      showErrorToast("Parameter jadwal asli tidak lengkap. Tidak dapat memperbarui.");
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("update-grouped-saving-schedule"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          old_class: oldClass,
          old_amount_expected: parseFloat(oldAmountExpected),
          old_frequency: oldFrequency,
          old_day_of_week: oldDayOfWeek === '' ? null : oldDayOfWeek,
          new_amount_expected: parseFloat(values.amount_expected), // Use new amount from form
          new_frequency: values.frequency, // Use new frequency from form
          new_day_of_week: values.frequency === "weekly" ? values.day_of_week : null, // Only save day_of_week if frequency is weekly
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memperbarui jadwal menabung.");
      }

      showSuccessToast(`Jadwal menabung untuk kelas ${oldClass} berhasil diperbarui!`);
      router.push("/admin/saving-schedules");
    } catch (err: any) {
      showErrorToast("Gagal memperbarui jadwal: " + err.message);
    }
  };

  const frequencyOptions = [
    { value: "daily", label: "Harian" },
    { value: "weekly", label: "Mingguan" },
    { value: "monthly", label: "Bulanan" },
  ];

  const daysOfWeek = [
    { value: "Monday", label: "Senin" },
    { value: "Tuesday", label: "Selasa" },
    { value: "Wednesday", label: "Rabu" },
    { value: "Thursday", label: "Kamis" },
    { value: "Friday", label: "Jumat" },
    { value: "Saturday", label: "Sabtu" },
    { value: "Sunday", label: "Minggu" },
  ];

  if (loadingInitialData) {
    return <StatusCard status="loading" title="Memuat Data Jadwal..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/admin/saving-schedules" backButtonText="Kembali ke Jadwal Menabung" />;
  }

  return (
    <PageCardLayout
      title="Edit Jadwal Menabung"
      backHref="/admin/saving-schedules"
      className="max-w-md"
    >
      <p className="text-center text-muted-foreground mb-4">
        Mengedit jadwal untuk kelas <span className="font-semibold">{oldClass}</span>
      </p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount_expected">Jumlah Diharapkan</Label>
          <Input
            id="amount_expected"
            type="number"
            step="0.01"
            placeholder="Masukkan jumlah diharapkan"
            {...register("amount_expected")}
          />
          {errors.amount_expected && (
            <p className="text-red-500 text-sm">{errors.amount_expected.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="frequency">Frekuensi</Label>
          <Select onValueChange={(value: "daily" | "weekly" | "monthly") => setValue("frequency", value)} value={form.watch("frequency")}>
            <SelectTrigger id="frequency">
              <SelectValue placeholder="Pilih frekuensi" />
            </SelectTrigger>
            <SelectContent>
              {frequencyOptions.map((freq) => (
                <SelectItem key={freq.value} value={freq.value}>
                  {freq.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.frequency && (
            <p className="text-red-500 text-sm">{errors.frequency.message}</p>
          )}
        </div>
        {currentFrequency === "weekly" && (
          <div className="space-y-2">
            <Label htmlFor="day_of_week">Hari dalam Seminggu</Label>
            <Select onValueChange={(value) => setValue("day_of_week", value)} value={watch("day_of_week") || ""}>
              <SelectTrigger id="day_of_week">
                <SelectValue placeholder="Pilih hari" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((day) => (
                  <SelectItem key={day.value} value={day.value}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.day_of_week && (
              <p className="text-red-500 text-sm">{errors.day_of_week.message}</p>
            )}
          </div>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : "Simpan Perubahan Jadwal"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => router.push("/admin/saving-schedules")}
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Batal
        </Button>
      </form>
    </PageCardLayout>
  );
}