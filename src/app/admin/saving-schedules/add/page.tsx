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
import { useEffect, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import { classOptions } from "@/lib/constants"; // Import classOptions
import { useClasses } from "@/hooks/use-classes"; // Import the new hook
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface StudentOption {
  id: string;
  name: string;
  nisn: string;
  class: string;
  teacher_id: string | null; // Added teacher_id
}

interface TeacherProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  class_taught: string | null;
}

// Updated Zod schema to include amount_expected, frequency, and day_of_week
const savingScheduleSchema = z.object({
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

type SavingScheduleFormValues = z.infer<typeof savingScheduleSchema>;

export default function AddSavingSchedulePage() {
  const { session } = useSupabase(); // Still need session for user.id
  const router = useRouter();
  const { classes: uniqueClasses, loadingClasses, errorClasses } = useClasses(); // Use the new hook
  const [studentsInSelectedClass, setStudentsInSelectedClass] = useState<StudentOption[]>([]); // Students filtered by class
  const [loadingStudents, setLoadingStudents] = useState(true); // Still need this for student data
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined); // State for selected class filter
  const [teachersByClass, setTeachersByClass] = useState<Record<string, { id: string; name: string } | null>>({});
  const [assignedTeacherName, setAssignedTeacherName] = useState<string | null>(null);
  const [loadingTeacherInfo, setLoadingTeacherInfo] = useState(true);


  const form = useForm<SavingScheduleFormValues>({
    resolver: zodResolver(savingScheduleSchema),
    defaultValues: {
      amount_expected: "",
      frequency: "weekly", // Default to weekly
      day_of_week: "Monday", // Default to Monday
    },
  });

  const { handleSubmit, register, formState, reset, setValue, watch } = form;
  const { errors, isSubmitting } = formState;
  const currentFrequency = watch("frequency"); // Watch frequency to conditionally render day_of_week

  // Effect to fetch all teachers and map them by class_taught
  useEffect(() => {
    const fetchTeachers = async () => {
      setLoadingTeacherInfo(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, class_taught")
        .eq("role", "teacher");

      if (error) {
        console.error("Error fetching teachers:", error.message);
        showErrorToast("Gagal memuat data guru.");
      } else {
        const map: Record<string, { id: string; name: string } | null> = {};
        (data || []).forEach(teacher => {
          if (teacher.class_taught) {
            map[teacher.class_taught] = {
              id: teacher.id,
              name: `${teacher.first_name || ''} ${teacher.last_name || ''}`.trim() || 'Nama Guru Tidak Ditetapkan'
            };
          }
        });
        setTeachersByClass(map);
      }
      setLoadingTeacherInfo(false);
    };
    fetchTeachers();
  }, []); // Removed supabase from dependencies

  // Effect to fetch students when selectedClass changes
  useEffect(() => {
    const fetchStudentsByClass = async () => {
      setLoadingStudents(true);
      setAssignedTeacherName(null); // Reset teacher name when class changes

      if (selectedClass && selectedClass !== "all") {
        // Update assigned teacher name based on selected class
        const teacherInfo = teachersByClass[selectedClass];
        if (teacherInfo) {
          setAssignedTeacherName(teacherInfo.name);
        } else {
          setAssignedTeacherName("Tidak ada guru yang ditetapkan untuk kelas ini.");
        }

        const { data, error } = await supabase
          .from("students")
          .select("id, name, nisn, class, teacher_id")
          .eq("class", selectedClass)
          .order("name", { ascending: true });

        if (error) {
          showErrorToast("Gagal memuat siswa untuk kelas ini: " + error.message);
          setStudentsInSelectedClass([]);
        } else {
          setStudentsInSelectedClass(data || []);
        }
      } else {
        setStudentsInSelectedClass([]); // Clear students if "All Classes" or no class selected
        setAssignedTeacherName(null);
      }
      setLoadingStudents(false);
    };

    if (!loadingTeacherInfo) { // Only fetch students once teacher info is loaded
      fetchStudentsByClass();
    }
  }, [selectedClass, teachersByClass, loadingTeacherInfo]); // Removed supabase from dependencies


  const onSubmit = async (values: SavingScheduleFormValues) => { // Re-added 'values' parameter
    if (!session?.user?.id) {
      showErrorToast("Anda harus login sebagai admin untuk menambahkan jadwal menabung.");
      return;
    }
    if (!selectedClass || selectedClass === "all") {
      showErrorToast("Pilih kelas terlebih dahulu.");
      return;
    }
    if (studentsInSelectedClass.length === 0) {
      showErrorToast("Tidak ada siswa di kelas ini untuk ditambahkan jadwal menabung.");
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errorsList: string[] = [];

    for (const student of studentsInSelectedClass) {
      // Use the teacher_id from the student object, which can be null
      const teacherIdToUse = student.teacher_id;

      const { error } = await supabase
        .from("saving_schedules")
        .insert({
          student_id: student.id,
          amount_expected: parseFloat(values.amount_expected),
          frequency: values.frequency,
          day_of_week: values.frequency === "weekly" ? values.day_of_week : null, // Only save day_of_week if frequency is weekly
          teacher_id: teacherIdToUse, // This can now be null
        });

      if (error) {
        errorsList.push(`Gagal menambahkan jadwal untuk ${student.name} (${student.nisn}): ${error.message}`);
        failCount++;
      } else {
        successCount++;
        // No need to refresh router here, just push
      }
    }

    if (successCount > 0) {
      showSuccessToast(`${successCount} jadwal menabung berhasil ditambahkan untuk kelas ${selectedClass}!`);
    }
    if (failCount > 0) {
      showErrorToast(`Gagal menambahkan ${failCount} jadwal. Detail kesalahan di konsol.`);
      console.error("Saving Schedule Errors:", errorsList);
    }

    reset();
    setSelectedClass(undefined); // Reset class selection
    router.push("/admin/saving-schedules"); // Navigate first
    router.refresh(); // Then trigger a refresh for the destination page
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

  if (loadingClasses || loadingTeacherInfo) {
    return <StatusCard status="loading" title="Memuat Data..." />;
  }

  if (errorClasses) {
    return <StatusCard status="error" message={errorClasses} backButtonHref="/admin/saving-schedules" backButtonText="Kembali ke Jadwal Menabung" />;
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Tambah Jadwal Menabung</CardTitle>
        <IconButton
          icon={ArrowLeft}
          tooltip="Kembali"
          onClick={() => router.push("/admin/saving-schedules")}
          variant="outline"
        />
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="classFilter">Pilih Kelas</Label>
            <Select
              onValueChange={(value) => setSelectedClass(value === "all" ? undefined : value)}
              value={selectedClass || "all"}
              disabled={uniqueClasses.length === 0}
            >
              <SelectTrigger id="classFilter">
                <SelectValue placeholder={uniqueClasses.length === 0 ? "Tidak ada kelas tersedia" : "Pilih kelas"} />
              </SelectTrigger>
              <SelectContent>
                {uniqueClasses.map((cls) => (
                  <SelectItem key={cls} value={cls}>
                    {cls}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {loadingStudents ? (
            <div className="space-y-2">
              <Label>Siswa di Kelas Ini</Label>
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Siswa di Kelas Ini ({selectedClass || 'Belum Dipilih'})</Label>
              {studentsInSelectedClass.length === 0 ? (
                <p className="text-muted-foreground text-sm text-red-500">Tidak ada siswa di kelas ini. Jadwal tidak dapat ditambahkan.</p>
              ) : (
                <ul className="list-disc list-inside text-sm text-muted-foreground max-h-32 overflow-y-auto border rounded-md p-2">
                  {studentsInSelectedClass.map(student => (
                    <li key={student.id}>{student.name} ({student.nisn})</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {selectedClass && (
            <div className="space-y-2">
              <Label>Guru Pengajar Kelas Ini</Label>
              {loadingTeacherInfo ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Input
                  id="assignedTeacher"
                  type="text"
                  value={assignedTeacherName || "Tidak ada guru yang ditetapkan."}
                  readOnly
                  disabled
                  className="bg-muted"
                />
              )}
            </div>
          )}
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
                  <SelectItem key={freq} value={freq.value}>
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
              <Select onValueChange={(value) => setValue("day_of_week", value)} value={form.watch("day_of_week") || ""}>
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
          <Button type="submit" className="w-full" disabled={isSubmitting || loadingStudents || !selectedClass || studentsInSelectedClass.length === 0}>
            {isSubmitting ? "Menyimpan..." : "Tambah Jadwal untuk Kelas"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => router.push("/admin/saving-schedules")}
            disabled={isSubmitting || loadingStudents}
          >
            Batal
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}