"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { id } from "date-fns/locale";
import { format } from "date-fns";
import { StatusCard } from "@/components/common/status-card";
import { IconButton } from "@/components/common/icon-button";
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { useTeacherStudentsData } from "@/hooks/use-teacher-students-data";
import { TeacherStudentsFilters } from "@/components/teacher/teacher-students-filters";
import { TeacherRecapStats } from "@/components/teacher/teacher-recap-stats";
import { TeacherStudentsTable } from "@/components/teacher/teacher-students-table";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { Button } from "@/components/ui/button"; // Import Button for Generate Report
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export default function TeacherStudentsPage() {
  const { session } = useSupabase();
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [teacherName, setTeacherName] = useState("Guru");
  const [classTaught, setClassTaught] = useState<string | null>(null);
  const [adminName, setAdminName] = useState("Admin Sekolah");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    students,
    loading,
    error,
    refetch,
    totalPeriodDeposits,
    totalPeriodWithdrawals,
    totalOverallBalance,
  } = useTeacherStudentsData({ searchTerm, selectedDate });

  useEffect(() => {
    const fetchTeacherProfileAndAdminName = async () => {
      if (!session?.user?.id) {
        setTeacherName("Guru");
        setClassTaught(null);
        setAdminName("Admin Sekolah");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, class_taught")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching teacher profile:", profileError.message);
        showErrorToast("Gagal memuat profil guru.");
      } else if (profile) {
        const name = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
        setTeacherName(name || "Guru");
        setClassTaught(profile.class_taught);
      }

      try {
        const response = await fetch(getSupabaseFunctionUrl("get-admin-name"), {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Authorization": `Bearer ${session?.access_token}`,
          },
        });
        const data = await response.json();
        if (response.ok && data.adminName) {
          setAdminName(data.adminName);
        } else {
          console.warn("Could not fetch admin name:", data.error || "No admin found.");
          setAdminName("Admin Sekolah");
        }
      } catch (err) {
        console.error("Error calling get-admin-name function:", err);
        setAdminName("Admin Sekolah");
      }
    };
    fetchTeacherProfileAndAdminName();
  }, [session]);

  const generatePdfReport = async () => {
    if (loading) {
      showErrorToast("Data masih dimuat, mohon tunggu.");
      return;
    }
    
    const doc = new jsPDF();
    
    if (typeof (doc as any).autoTable !== 'function') {
      console.error("jsPDF-AutoTable plugin not loaded correctly.");
      showErrorToast("Gagal mengunduh laporan PDF: Plugin PDF tidak dimuat dengan benar.");
      return;
    }

    const title = "Rekapitulasi Tabungan Siswa";
    const subtitle = `Guru: ${teacherName} | Kelas: ${classTaught || "Tidak Ditetapkan"}`;
    const date = new Date().toLocaleDateString("id-ID", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const dateFilterText = selectedDate
      ? `Tanggal Filter: ${format(selectedDate, "dd MMM yyyy", { locale: id })}`
      : "Semua Tanggal";

    const pageWidth = (doc as any).internal.pageSize.width;
    const margin = 14;

    (doc as any).setFontSize(18);
    (doc as any).text(title, pageWidth / 2, 20, { align: "center" });
    (doc as any).setFontSize(12);
    (doc as any).text(subtitle, pageWidth / 2, 27, { align: "center" });
    (doc as any).setFontSize(10);
    (doc as any).text(`Tanggal Cetak: ${date}`, pageWidth / 2, 34, { align: "center" });
    (doc as any).text(dateFilterText, pageWidth / 2, 41, { align: "center" });

    const tableColumn = [
      "No",
      "Nama",
      "NISN",
      "Kelas",
      "Setoran (Periode Ini)",
      "Penarikan (Periode Ini)",
      "Saldo Saat Ini",
    ];
    const tableRows: any[] = [];

    for (const student of students) {
      tableRows.push([
        tableRows.length + 1,
        student.student_name,
        student.nisn,
        student.class,
        `Rp ${student.period_deposits.toLocaleString("id-ID")}`,
        `Rp ${student.period_withdrawals.toLocaleString("id-ID")}`,
        `Rp ${Math.max(0, student.overall_current_balance).toLocaleString("id-ID")}`,
      ]);
    }

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 48,
      theme: "grid",
      styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 30 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 25, halign: "right" },
        5: { cellWidth: 25, halign: "right" },
        6: { cellWidth: 25, halign: "right" },
      },
      margin: { left: margin, right: margin },
      didDrawPage: function (data: any) {
        let str = "Halaman " + (doc as any).internal.getNumberOfPages();
        (doc as any).setFontSize(10);
        (doc as any).text(str, data.settings.margin.left, (doc as any).internal.pageSize.height - 10);
        (doc as any).setFontSize(8);
        (doc as any).text("TabunganKu | Anang Creative Production", pageWidth / 2, (doc as any).internal.pageSize.height - 5, { align: "center" });
      },
    });

    const finalYAfterTable = (doc as any).autoTable.previous.finalY;
    const totalOverallBalanceForPdf = totalOverallBalance;

    (doc as any).setFontSize(10);
    (doc as any).text(`Total Setoran Keseluruhan (Periode Ini): Rp ${totalPeriodDeposits.toLocaleString("id-ID")}`, margin, finalYAfterTable + 10);
    (doc as any).text(`Total Penarikan Keseluruhan (Periode Ini): Rp ${totalPeriodWithdrawals.toLocaleString("id-ID")}`, margin, finalYAfterTable + 17);
    (doc as any).text(`Total Saldo Keseluruhan (Semua Waktu): Rp ${totalOverallBalanceForPdf.toLocaleString("id-ID")}`, margin, finalYAfterTable + 24);

    const signatureY = finalYAfterTable + 40;
    const signatureWidth = 50;
    const gap = 30;

    const adminX = pageWidth / 2 - signatureWidth - gap / 2;
    (doc as any).text("Mengetahui,", adminX, signatureY);
    (doc as any).text("Admin Sekolah", adminX, signatureY + 30);
    (doc as any).text(`(${adminName})`, adminX, signatureY + 35);

    const teacherX = pageWidth / 2 + gap / 2;
    (doc as any).text("Dibuat Oleh,", teacherX, signatureY);
    (doc as any).text("Guru Kelas", teacherX, signatureY + 30);
    (doc as any).text(`(${teacherName})`, teacherX, signatureY + 35);

    doc.save(
      `rekapitulasi-tabungan-guru-${classTaught?.replace(/\s/g, "-") || "tidak-ditetapkan"}-${selectedDate ? format(selectedDate, "yyyyMMdd") : "semua-tanggal"}.pdf`
    );
    showSuccessToast("Laporan PDF berhasil diunduh!");
  };

  if (loading) {
    return <StatusCard status="loading" title="Memuat Rekapitulasi Siswa..." />;
  }

  if (error) {
    return (
      <StatusCard
        status="error"
        message={error}
        backButtonHref="/teacher/dashboard"
        backButtonText="Kembali ke Dashboard"
      />
    );
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Rekapitulasi Tabungan Siswa</CardTitle>
        <div className="flex space-x-2">
          <IconButton
            icon={Download}
            tooltip="Unduh Rekap PDF"
            onClick={generatePdfReport}
            variant="outline"
          >
            {!isMobile && "Unduh Rekap PDF"}
          </IconButton>
          <IconButton
            icon={ArrowLeft}
            tooltip="Kembali"
            onClick={() => router.push("/teacher/dashboard")}
            variant="outline"
          >
            {!isMobile && "Kembali"}
          </IconButton>
        </div>
      </CardHeader>
      <CardContent>
        <TeacherStudentsFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          isMounted={isMounted}
        />

        <h3 className="text-xl font-semibold mt-8">Statistik Rekapitulasi (Periode Ini)</h3>
        <TeacherRecapStats
          totalPeriodDeposits={totalPeriodDeposits}
          totalPeriodWithdrawals={totalPeriodWithdrawals}
          totalOverallBalance={totalOverallBalance}
        />

        <h3 className="text-xl font-semibold mt-8">Daftar Siswa</h3>
        {students.length === 0 ? (
          <p className="text-center text-muted-foreground">Tidak ada siswa yang ditemukan dengan filter ini.</p>
        ) : (
          <TeacherStudentsTable students={students} />
        )}
      </CardContent>
    </Card>
  );
}