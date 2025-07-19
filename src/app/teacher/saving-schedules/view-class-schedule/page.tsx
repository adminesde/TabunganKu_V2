"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface StudentInSchedule {
  id: string;
  name: string;
  nisn: string;
  class: string;
}

// Define interface for the raw fetched data from Supabase
interface FetchedSavingScheduleWithStudentRow {
  students: StudentInSchedule | null; // Corrected to be single object or null
}

export default function TeacherViewClassSchedulePage() {
  const { supabase, session } = useSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedClass = searchParams.get('class');
  const amountExpected = searchParams.get('amount'); // Still needed for query
  const frequency = searchParams.get('frequency'); // Still needed for query
  const dayOfWeek = searchParams.get('day');

  const [students, setStudents] = useState<StudentInSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    if (!selectedClass || !amountExpected || !frequency) {
      setError("Parameter jadwal tidak lengkap.");
      setLoading(false);
      return;
    }

    const fetchStudentsForSchedule = async () => {
      setLoading(true);
      setError(null);

      let query = supabase
        .from("saving_schedules")
        .select(`
          students (
            id,
            name,
            nisn,
            class
          )
        `)
        .eq("amount_expected", parseFloat(amountExpected))
        .eq("frequency", frequency)
        .eq("teacher_id", session.user.id); // Filter by current teacher's ID

      if (dayOfWeek) {
        query = query.eq("day_of_week", dayOfWeek);
      } else {
        query = query.is("day_of_week", null);
      }

      // Filter by student's class
      query = query.eq("students.class", selectedClass);

      const { data, error } = await query;

      if (error) {
        setError(error.message);
        showErrorToast("Gagal memuat siswa untuk jadwal ini: " + error.message);
      } else {
        const uniqueStudents: StudentInSchedule[] = [];
        const studentIds = new Set<string>();

        (data as FetchedSavingScheduleWithStudentRow[] || []).forEach(item => { // Explicitly cast data
          // Ensure item.students is not null before accessing properties
          if (item.students && !studentIds.has(item.students.id)) { // Corrected: Access id directly from object
            uniqueStudents.push(item.students); // Corrected: Push the object directly
            studentIds.add(item.students.id);
          }
        });
        setStudents(uniqueStudents);
      }
      setLoading(false);
    };

    fetchStudentsForSchedule();
  }, [session, supabase, selectedClass, amountExpected, frequency, dayOfWeek]);

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
    return <StatusCard status="loading" title="Memuat Detail Jadwal Kelas..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/teacher/saving-schedules" backButtonText="Kembali ke Jadwal Menabung" />;
  }

  return (
    <PageCardLayout
      title="Detail Jadwal Menabung Kelas"
      backHref="/teacher/saving-schedules"
      className="max-w-4xl"
    >
      <div className="space-y-4 mb-6">
        <p><strong>Kelas:</strong> {selectedClass}</p>
        {/* Removed Jumlah Diharapkan and Frekuensi */}
        {dayOfWeek && <p><strong>Hari:</strong> {dayOfWeekMap[dayOfWeek] || dayOfWeek}</p>}
      </div>

      <h3 className="text-xl font-semibold mb-4">Siswa dalam Jadwal Ini ({students.length})</h3>
      {students.length === 0 ? (
        <p className="text-center text-muted-foreground">Tidak ada siswa yang ditemukan dengan jadwal ini di kelas {selectedClass}.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead>Nama Siswa</TableHead>
                <TableHead>NISN</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">{student.name}</TableCell>
                  <TableCell>{student.nisn}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </PageCardLayout>
  );
}