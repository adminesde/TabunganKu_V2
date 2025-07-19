"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Calendar as CalendarIcon, XCircle } from "lucide-react"; // Import XCircle
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusCard } from "@/components/common/status-card";
import jsPDF from "jspdf";
import 'jspdf-autotable';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfDay, endOfDay } from "date-fns";
import { id } from "date-fns/locale";
import * as XLSX from "xlsx";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button";
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface StudentWithBalance {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  overall_current_balance: number; // This is the all-time balance
  period_deposits: number;
  period_withdrawals: number;
}

interface Transaction {
  amount: number;
  type: "deposit" | "withdrawal";
  student_id: string;
}

export default function AdminRecapPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [allStudentsData, setAllStudentsData] = useState<StudentWithBalance[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [shouldShowTable, setShouldShowTable] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // State for client-only rendering

  const [totalPeriodDeposits, setTotalPeriodDeposits] = useState(0);
  const [totalPeriodWithdrawals, setTotalPeriodWithdrawals] = useState(0);
  const [totalNetBalancePeriod, setTotalNetBalancePeriod] = useState(0); // New state for net balance of the period

  useEffect(() => {
    setIsMounted(true); // Set mounted to true on client side
  }, []);

  const fetchRecapData = async () => {
    setLoading(true);
    setError(null);

    if (!session?.user?.id) {
      setError("Anda harus login untuk melihat data rekapitulasi.");
      setLoading(false);
      return;
    }

    // 1. Fetch all students with their overall balances from the view
    const { data: studentsViewData, error: studentsViewError } = await supabase
      .from("student_balances_view")
      .select("student_id, student_name, nisn, class, current_balance");

    if (studentsViewError) {
      setError(studentsViewError.message);
      showErrorToast("Gagal memuat data siswa: " + studentsViewError.message);
      setLoading(false);
      return;
    }

    const studentsMap = new Map<string, StudentWithBalance>();
    const uniqueClasses = new Set<string>();

    (studentsViewData || []).forEach(s => {
      studentsMap.set(s.student_id, {
        student_id: s.student_id,
        student_name: s.student_name,
        nisn: s.nisn,
        class: s.class,
        overall_current_balance: s.current_balance, // Use current_balance from view
        period_deposits: 0, // Initialize for period
        period_withdrawals: 0, // Initialize for period
      });
      uniqueClasses.add(s.class);
    });

    // 2. If a date is selected, fetch transactions for that date and update period totals
    if (selectedDate) {
      let transactionsQuery = supabase
        .from("transactions")
        .select("student_id, amount, type")
        .gte("created_at", format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
        .lte("created_at", format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

      const { data: transactionsData, error: transactionsError } = await transactionsQuery;

      if (transactionsError) {
        console.error("Error fetching transactions for selected date:", transactionsError.message);
        showErrorToast("Gagal memuat transaksi untuk tanggal yang dipilih.");
      } else {
        (transactionsData || []).forEach((transaction: Transaction) => {
          const student = studentsMap.get(transaction.student_id);
          if (student) {
            if (transaction.type === "deposit") {
              student.period_deposits += transaction.amount;
            } else {
              student.period_withdrawals += transaction.amount;
            }
          }
        });
      }
    }

    const finalStudentsData = Array.from(studentsMap.values()).sort((a, b) => {
      if (a.class !== b.class) return a.class.localeCompare(b.class);
      return a.student_name.localeCompare(b.student_name);
    });

    setAllStudentsData(finalStudentsData);
    setClasses(Array.from(uniqueClasses).sort());
    setLoading(false);
  };

  useEffect(() => {
    fetchRecapData();
  }, [session, selectedDate]); // Removed supabase from dependencies

  useEffect(() => {
    let currentFiltered = allStudentsData;

    if (selectedClass && selectedClass !== "all") {
      currentFiltered = currentFiltered.filter(student => student.class === selectedClass);
    }

    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      currentFiltered = currentFiltered.filter(
        student =>
          student.student_name.toLowerCase().includes(lowerCaseSearchTerm) ||
          student.nisn.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    setFilteredStudents(currentFiltered);

    let totalDep = 0;
    let totalWith = 0;
    let totalNetBal = 0; // Calculate net balance for the period

    currentFiltered.forEach(student => {
      totalDep += student.period_deposits;
      totalWith += student.period_withdrawals;
      // For overall balance, we still use the all-time balance from the view
      // The request is to change the *label* to reflect the period filter,
      // and the sum of period deposits/withdrawals is the net change for the period.
      // So, totalNetBalancePeriod will be totalDep - totalWith.
    });
    setTotalPeriodDeposits(totalDep);
    setTotalPeriodWithdrawals(totalWith);
    setTotalNetBalancePeriod(totalDep - totalWith); // Net change for the period

  }, [selectedClass, searchTerm, allStudentsData]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
  };

  const handleGenerateReport = () => {
    setShouldShowTable(true);
  };

  const generatePdfReport = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF();
      
      if (typeof (doc as any).autoTable !== 'function') {
        throw new Error("jsPDF-AutoTable plugin not loaded correctly.");
      }

      const title = "Rekapitulasi Tabungan Siswa";
      const subtitle = selectedClass && selectedClass !== "all" ? `Kelas: ${selectedClass}` : "Semua Kelas";
      const date = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
      const dateFilterText = selectedDate 
        ? `Tanggal Filter: ${format(selectedDate, "dd MMM yyyy", { locale: id })}`
        : "Semua Tanggal";

      (doc as any).setFontSize(18);
      (doc as any).text(title, 105, 20, { align: "center" });
      (doc as any).setFontSize(12);
      (doc as any).text(subtitle, 105, 27, { align: "center" });
      (doc as any).setFontSize(10);
      (doc as any).text(`Tanggal Cetak: ${date}`, 105, 34, { align: "center" });
      (doc as any).text(dateFilterText, 105, 41, { align: "center" });

      const tableColumn = ["No", "Nama", "NISN", "Kelas", "Setoran (Periode Ini)", "Penarikan (Periode Ini)", "Saldo Saat Ini"];
      const tableRows: any[] = [];

      for (const student of filteredStudents) {
        tableRows.push([
          tableRows.length + 1,
          student.student_name,
          student.nisn,
          student.class,
          `Rp ${student.period_deposits.toLocaleString('id-ID')}`,
          `Rp ${student.period_withdrawals.toLocaleString('id-ID')}`,
          `Rp ${Math.max(0, student.overall_current_balance).toLocaleString('id-ID')}`,
        ]);
      }

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 48,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [22, 163, 74], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 30 }, // Adjusted width
          2: { cellWidth: 20 }, // Adjusted width
          3: { cellWidth: 15 }, // Adjusted width
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' },
          6: { cellWidth: 25, halign: 'right' },
        },
        didDrawPage: function (data: any) {
          let str = "Halaman " + (doc as any).internal.getNumberOfPages();
          (doc as any).setFontSize(10);
          (doc as any).text(str, data.settings.margin.left, (doc as any).internal.pageSize.height - 10);
          (doc as any).setFontSize(8);
          (doc as any).text("TabunganKu | Anang Creative Production", (doc as any).internal.pageSize.width / 2, (doc as any).internal.pageSize.height - 5, { align: "center" });
        }
      });

      const finalY = (doc as any).autoTable.previous.finalY + 10;
      (doc as any).setFontSize(10);
      (doc as any).text(`Total Setoran Keseluruhan (Periode Ini): Rp ${totalPeriodDeposits.toLocaleString('id-ID')}`, 14, finalY);
      (doc as any).text(`Total Penarikan Keseluruhan (Periode Ini): Rp ${totalPeriodWithdrawals.toLocaleString('id-ID')}`, 14, finalY + 7);
      (doc as any).text(`Total Saldo Bersih (Periode Ini): Rp ${totalNetBalancePeriod.toLocaleString('id-ID')}`, 14, finalY + 14); // Changed label and value

      doc.save(`rekapitulasi-tabungan-${selectedClass || 'semua-kelas'}-${selectedDate ? format(selectedDate, 'yyyyMMdd') : 'semua-tanggal'}.pdf`);
      showSuccessToast("Laporan PDF berhasil diunduh!");
    } catch (err: any) {
      console.error("Error generating PDF:", err);
      showErrorToast("Gagal mengunduh laporan PDF: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateExcelReport = () => {
    setLoading(true);
    try {
      const data = filteredStudents.map((student, index) => ({
        No: index + 1,
        Nama: student.student_name,
        NISN: student.nisn,
        Kelas: student.class,
        "Setoran (Periode Ini)": student.period_deposits,
        "Penarikan (Periode Ini)": student.period_withdrawals,
        "Saldo Saat Ini": Math.max(0, student.overall_current_balance),
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Rekapitulasi Tabungan");
      XLSX.writeFile(wb, `rekapitulasi-tabungan-${selectedClass || 'semua-kelas'}-${selectedDate ? format(selectedDate, 'yyyyMMdd') : 'semua-tanggal'}.xlsx`);
      showSuccessToast("Laporan Excel berhasil diunduh!");
    } catch (err: any) {
      console.error("Error generating Excel:", err);
      showErrorToast("Gagal mengunduh laporan Excel: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <StatusCard status="loading" title="Memuat Rekapitulasi Siswa..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/admin/dashboard" backButtonText="Kembali ke Dashboard Admin" />;
  }

  return (
    <Card className="w-full mx-auto max-w-6xl">
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
            icon={Download}
            tooltip="Unduh Rekap Excel"
            onClick={generateExcelReport}
            variant="secondary"
          >
            {!isMobile && "Unduh Rekap Excel"}
          </IconButton>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="classFilter">Filter Kelas</Label>
            <Select
              onValueChange={(value) => setSelectedClass(value === "all" ? undefined : value)}
              value={selectedClass || "all"}
              disabled={classes.length === 0}
            >
              <SelectTrigger id="classFilter">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="searchStudent">Cari Siswa (Nama/NISN)</Label>
            <Input
              id="searchStudent"
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="space-y-2 col-span-full">
            <Label htmlFor="dateFilter">Filter Tanggal</Label>
            {isMounted && ( // Render Popover only on client
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateFilter"
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "LLL dd, y", { locale: id })
                    ) : (
                      <span>Pilih tanggal</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateSelect}
                    locale={id}
                  />
                </PopoverContent>
              </Popover>
            )}
            {selectedDate && (
              <IconButton
                icon={XCircle}
                tooltip="Hapus Filter Tanggal"
                onClick={() => setSelectedDate(undefined)}
                variant="ghost"
                className="w-full mt-2"
              >
                {!isMobile && "Hapus Filter Tanggal"}
              </IconButton>
            )}
          </div>
        </div>
        <Button onClick={handleGenerateReport} className="w-full mb-6" disabled={loading}>
          {loading ? "Memuat..." : "Generate Laporan"}
        </Button>

        <h3 className="text-xl font-semibold mt-8">Statistik Rekapitulasi (Periode Ini)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Setoran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalPeriodDeposits.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Jumlah total setoran</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penarikan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalPeriodWithdrawals.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Jumlah total penarikan</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saldo Bersih (Periode Ini)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalNetBalancePeriod.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Saldo bersih dari transaksi periode ini</p>
            </CardContent>
          </Card>
        </div>

        <h3 className="text-xl font-semibold mt-8">Daftar Siswa</h3>
        {!shouldShowTable ? (
          <p className="text-center text-muted-foreground">Klik "Generate Laporan" untuk menampilkan data siswa.</p>
        ) : loading ? ( // Show skeleton while generating
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <p className="text-center text-muted-foreground">Tidak ada siswa yang ditemukan dengan filter ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nama</TableHead>
                  <TableHead className="whitespace-nowrap">NISN</TableHead>
                  <TableHead className="whitespace-nowrap">Kelas</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Setoran (Periode Ini)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Penarikan (Periode Ini)</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Saldo Saat Ini</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.map((student) => (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-medium whitespace-nowrap">{student.student_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{student.nisn}</TableCell>
                    <TableCell className="whitespace-nowrap">{student.class}</TableCell>
                    <TableCell className="text-right whitespace-nowrap"><span>Rp </span>{student.period_deposits.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right whitespace-nowrap"><span>Rp </span>{student.period_withdrawals.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap"><span>Rp </span>{Math.max(0, student.overall_current_balance).toLocaleString('id-ID')}</TableCell>
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