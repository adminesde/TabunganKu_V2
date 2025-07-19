"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface FetchedSavingScheduleRow {
  amount_expected: number;
  frequency: string;
  day_of_week: string | null;
  students: {
    class: string;
  } | null;
  teacher_id: string | null;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

interface GroupedSavingSchedule {
  class: string;
  amount_expected: number;
  frequency: string;
  day_of_week: string | null;
  student_count: number;
  teacher_name: string;
}

export default function ParentSavingSchedulesPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [schedules, setSchedules] = useState<GroupedSavingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAndGroupSavingSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!session) {
      setLoading(false);
      return;
    }

    const { data: studentsData, error: studentsError } = await supabase
      .from("students")
      .select("id")
      .eq("parent_id", session.user.id);

    if (studentsError) {
      setError(studentsError.message);
      showErrorToast("Gagal memuat data anak: " + studentsError.message);
      setLoading(false);
      return;
    }

    const studentIds = studentsData?.map(s => s.id) || [];

    if (studentIds.length === 0) {
      setSchedules([]);
      setLoading(false);
      return;
    }

    const { data, error: schedulesError } = await supabase
      .from("saving_schedules")
      .select(`
          amount_expected,
          frequency,
          day_of_week,
          students (
            class
          ),
          teacher_id,
          profiles (
            first_name,
            last_name
          )
        `)
      .in("student_id", studentIds)
      .order("created_at", { ascending: false });

    if (schedulesError) {
      setError(schedulesError.message);
      showErrorToast("Gagal memuat jadwal menabung: " + schedulesError.message);
    } else {
      const grouped: { [key: string]: GroupedSavingSchedule } = {};

      (data as FetchedSavingScheduleRow[] || []).forEach(schedule => {
        const studentClass = schedule.students?.class;
        const teacherName = schedule.profiles?.first_name || schedule.profiles?.last_name
          ? `${schedule.profiles.first_name || ''} ${schedule.profiles.last_name || ''}`.trim()
          : 'Guru Tidak Ditetapkan';
        
        if (studentClass) {
          const key = `${studentClass}-${schedule.amount_expected}-${schedule.frequency}-${schedule.day_of_week || ''}-${teacherName}`;
          if (!grouped[key]) {
            grouped[key] = {
              class: studentClass,
              amount_expected: schedule.amount_expected,
              frequency: schedule.frequency,
              day_of_week: schedule.day_of_week,
              student_count: 0,
              teacher_name: teacherName,
            };
          }
          grouped[key].student_count++;
        }
      });
      setSchedules(Object.values(grouped));
    }
    setLoading(false);
  }, [session]); // Removed supabase from dependencies

  useEffect(() => {
    fetchAndGroupSavingSchedules();
  }, [fetchAndGroupSavingSchedules]);

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

  if (loading) {
    return <StatusCard status="loading" title="Memuat Jadwal Menabung..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/parent/dashboard" backButtonText="Kembali ke Dashboard Orang Tua" />;
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Jadwal Menabung Anak</CardTitle>
        <IconButton
          icon={ArrowLeft}
          tooltip="Kembali"
          onClick={() => router.push("/parent/dashboard")}
          variant="outline"
        >
          {!isMobile && "Kembali"}
        </IconButton>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada jadwal menabung yang terdaftar untuk anak Anda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Kelas</TableHead>
                  {/* Removed Jumlah Diharapkan for non-admin */}
                  <TableHead className="whitespace-nowrap">Frekuensi</TableHead>
                  <TableHead className="whitespace-nowrap">Hari</TableHead>
                  <TableHead className="whitespace-nowrap">Guru Pengajar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule, index) => (
                  <TableRow key={`${schedule.class}-${schedule.amount_expected}-${schedule.frequency}-${schedule.day_of_week || 'null'}-${schedule.teacher_name}`}>
                    <TableCell className="font-medium whitespace-nowrap">{schedule.class}</TableCell><TableCell className="whitespace-nowrap">{frequencyMap[schedule.frequency]}</TableCell><TableCell className="whitespace-nowrap">{dayOfWeekMap[schedule.day_of_week || ''] || '-'}</TableCell><TableCell className="whitespace-nowrap">{schedule.teacher_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}