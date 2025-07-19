"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, PlusCircle, Pencil, Trash2 } from "lucide-react";
import { StatusCard } from "@/components/common/status-card";
import { DeleteSavingScheduleDialog } from "@/components/admin/delete-saving-schedule-dialog";
import { getSupabaseFunctionUrl } from "@/lib/utils";
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

export default function AdminSavingSchedulesPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [schedules, setSchedules] = useState<GroupedSavingSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<GroupedSavingSchedule | null>(null);
  const [key, setKey] = useState(0);

  const fetchAndGroupSavingSchedules = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!session?.user?.id) {
      setError("Anda harus login untuk melihat jadwal menabung.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching saving schedules:", error.message);
      setError(error.message);
      showErrorToast("Gagal memuat jadwal menabung: " + error.message);
    } else {
      console.log("Fetched raw saving schedules data:", data);
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
        } else {
          console.warn("Skipping schedule due to missing student class:", schedule);
        }
      });
      console.log("Grouped schedules:", grouped);
      setSchedules(Object.values(grouped));
    }
    setLoading(false);
  }, [session]); // Removed supabase from dependencies

  useEffect(() => {
    fetchAndGroupSavingSchedules();
  }, [fetchAndGroupSavingSchedules, key]);

  const handleDeleteClick = (schedule: GroupedSavingSchedule) => {
    setScheduleToDelete(schedule);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete || !session?.user?.id) {
      showErrorToast("Terjadi kesalahan saat menghapus jadwal.");
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("delete-grouped-saving-schedule"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          class: scheduleToDelete.class,
          amount_expected: scheduleToDelete.amount_expected,
          frequency: scheduleToDelete.frequency,
          day_of_week: scheduleToDelete.day_of_week,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus jadwal menabung.");
      }

      toast.success(`Jadwal menabung untuk kelas ${scheduleToDelete.class} berhasil dihapus.`);
      setKey(prev => prev + 1);
    } catch (err: any) {
      showErrorToast("Gagal menghapus jadwal: " + err.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setScheduleToDelete(null);
    }
  };

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
    return <StatusCard status="error" message={error} backButtonHref="/admin/dashboard" backButtonText="Kembali ke Dashboard Admin" />;
  }

  return (
    <Card className="w-full mx-auto max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Jadwal Menabung Siswa</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={() => router.push("/admin/saving-schedules/add")} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {!isMobile && "Tambah Jadwal"}
          </Button>
          <IconButton
            icon={ArrowLeft}
            tooltip="Kembali"
            onClick={() => router.push("/admin/dashboard")}
            variant="outline"
          >
            {!isMobile && "Kembali"}
          </IconButton>
        </div>
      </CardHeader>
      <CardContent>
        {schedules.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada jadwal menabung yang terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Kelas</TableHead>
                  <TableHead className="whitespace-nowrap">Jumlah Diharapkan</TableHead>
                  <TableHead className="whitespace-nowrap">Frekuensi</TableHead>
                  <TableHead className="whitespace-nowrap">Hari</TableHead>
                  <TableHead className="whitespace-nowrap">Guru Pengajar</TableHead>
                  <TableHead className="whitespace-nowrap">Jumlah Siswa</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule, index) => (
                  <TableRow key={`${schedule.class}-${schedule.amount_expected}-${schedule.frequency}-${schedule.day_of_week || 'null'}-${schedule.teacher_name}`}>
                    <TableCell className="font-medium whitespace-nowrap">{schedule.class}</TableCell>
                    <TableCell className="whitespace-nowrap">Rp {schedule.amount_expected.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="whitespace-nowrap">{frequencyMap[schedule.frequency]}</TableCell>
                    <TableCell className="whitespace-nowrap">{dayOfWeekMap[schedule.day_of_week || ''] || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap">{schedule.teacher_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{schedule.student_count}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end space-x-2">
                        <IconButton
                          icon={Pencil}
                          tooltip="Edit"
                          onClick={() => router.push(`/admin/saving-schedules/edit?class=${encodeURIComponent(schedule.class)}&amount=${schedule.amount_expected}&frequency=${encodeURIComponent(schedule.frequency)}&day=${encodeURIComponent(schedule.day_of_week || '')}`)}
                          variant="outline"
                        />
                        <IconButton
                          icon={Trash2}
                          tooltip="Hapus"
                          onClick={() => handleDeleteClick(schedule)}
                          variant="destructive"
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <DeleteSavingScheduleDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        scheduleToDelete={scheduleToDelete}
        onConfirm={confirmDeleteSchedule}
      />
    </Card>
  );
}