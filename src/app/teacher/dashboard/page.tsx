"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, startOfDay, endOfDay } from "date-fns"; // Disesuaikan untuk statistik harian
import { id } from "date-fns/locale";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { showErrorToast } from "@/lib/toast";
import Link from "next/link";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description?: string;
  students: {
    name: string;
    class: string;
  } | null;
}

export default function TeacherDashboardPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const { logout } = useAuthActions();
  const [teacherName, setTeacherName] = useState("Guru");
  const [classTaught, setClassTaught] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [latestTransactions, setLatestTransactions] = useState<Transaction[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [selectedDateForDailyStats, setSelectedDateForDailyStats] = useState<Date | undefined>(new Date());
  const [dailyTotalDeposits, setDailyTotalDeposits] = useState(0);
  const [dailyTotalWithdrawals, setDailyTotalWithdrawals] = useState(0);
  const [dailyNetBalance, setDailyNetBalance] = useState(0);
  const [loadingDailyStats, setLoadingDailyStats] = useState(false);
  const [isMounted, setIsMounted] = useState(false); // State for client-only rendering

  useEffect(() => {
    setIsMounted(true); // Set mounted to true on client side
  }, []);

  const refetchDashboardData = useCallback(async () => {
    setLoadingProfile(true);
    setLoadingStats(true);

    if (!session?.user?.id) {
      setLoadingProfile(false);
      setLoadingStats(false);
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
      setLoadingProfile(false);
      setLoadingStats(false);
      return;
    }

    if (profile) {
      const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
      setTeacherName(name || "Guru");
      setClassTaught(profile.class_taught);

      if (profile.class_taught) {
        const { data: classBalances, error: balancesError } = await supabase
          .from("student_balances_view")
          .select("student_id, current_balance, total_deposits, total_withdrawals")
          .eq("teacher_id", session.user.id)
          .eq("class", profile.class_taught);

        if (balancesError) {
          console.error("Error fetching class balances:", balancesError.message);
          showErrorToast("Gagal memuat statistik kelas.");
          setLoadingStats(false);
          return;
        }

        let totalClassBalance = 0;
        let totalClassDeposits = 0;
        let totalClassWithdrawals = 0;
        let studentCount = 0;

        if (classBalances) {
          studentCount = classBalances.length;
          classBalances.forEach(sb => {
            totalClassBalance += sb.current_balance;
            totalClassDeposits += sb.total_deposits;
            totalClassWithdrawals += sb.total_withdrawals;
          });
        }

        setTotalStudents(studentCount);
        setTotalBalance(totalClassBalance);
        setTotalDeposits(totalClassDeposits);
        setTotalWithdrawals(totalClassWithdrawals);

        const { data: studentsInClass, error: studentsInClassError } = await supabase
          .from("students")
          .select("id")
          .eq("teacher_id", session.user.id)
          .eq("class", profile.class_taught);

        if (studentsInClassError) {
          console.error("Error fetching students for latest transactions:", studentsInClassError.message);
          showErrorToast("Gagal memuat transaksi terbaru.");
          setLoadingStats(false);
          return;
        }

        const studentIdsInClass = studentsInClass?.map(s => s.id) || [];

        if (studentIdsInClass.length > 0) {
          const { data: transactionsData, error: transactionsError } = await supabase
            .from("transactions")
            .select(`
              id,
              created_at,
              amount,
              type,
              description,
              students (
                name,
                class
              )
            `)
            .in("student_id", studentIdsInClass)
            .order("created_at", { ascending: false })
            .limit(5);

          if (transactionsError) {
            console.error("Error fetching latest transactions:", transactionsError.message);
            showErrorToast("Gagal memuat transaksi terbaru.");
          } else {
            setLatestTransactions((transactionsData || []) as unknown as Transaction[]);
          }
        } else {
          setLatestTransactions([]);
        }

      } else {
        setTotalStudents(0);
        setTotalBalance(0);
        setTotalDeposits(0);
        setTotalWithdrawals(0);
        setLatestTransactions([]);
      }
    }
    setLoadingProfile(false);
    setLoadingStats(false);
  }, [session]); // Removed supabase from dependencies

  const fetchDailyStats = useCallback(async () => {
    setLoadingDailyStats(true);
    if (!session?.user?.id || !classTaught || !selectedDateForDailyStats) {
      setDailyTotalDeposits(0);
      setDailyTotalWithdrawals(0);
      setDailyNetBalance(0);
      setLoadingDailyStats(false);
      return;
    }

    const startOfSelectedDay = startOfDay(selectedDateForDailyStats);
    const endOfSelectedDay = endOfDay(selectedDateForDailyStats);

    const { data: studentsInClass, error: studentsInClassError } = await supabase
      .from("students")
      .select("id")
      .eq("teacher_id", session.user.id)
      .eq("class", classTaught);

    if (studentsInClassError) {
      console.error("Error fetching students for daily stats:", studentsInClassError.message);
      showErrorToast("Gagal memuat siswa untuk statistik harian.");
      setLoadingDailyStats(false);
      return;
    }

    const studentIdsInClass = studentsInClass?.map(s => s.id) || [];

    if (studentIdsInClass.length === 0) {
      setDailyTotalDeposits(0);
      setDailyTotalWithdrawals(0);
      setDailyNetBalance(0);
      setLoadingDailyStats(false);
      return;
    }

    const { data: dailyTransactions, error: dailyTransactionsError } = await supabase
      .from("transactions")
      .select("amount, type")
      .in("student_id", studentIdsInClass)
      .gte("created_at", format(startOfSelectedDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
      .lte("created_at", format(endOfSelectedDay, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"));

    if (dailyTransactionsError) {
      console.error("Error fetching daily transactions:", dailyTransactionsError.message);
      showErrorToast("Gagal memuat transaksi harian.");
      setDailyTotalDeposits(0);
      setDailyTotalWithdrawals(0);
      setDailyNetBalance(0);
    } else {
      let deposits = 0;
      let withdrawals = 0;
      (dailyTransactions || []).forEach(t => {
        if (t.type === "deposit") {
          deposits += t.amount;
        } else {
          withdrawals += t.amount;
        }
      });
      setDailyTotalDeposits(deposits);
      setDailyTotalWithdrawals(withdrawals);
      setDailyNetBalance(deposits - withdrawals);
    }
    setLoadingDailyStats(false);
  }, [session, classTaught, selectedDateForDailyStats]); // Removed supabase from dependencies

  useEffect(() => {
    refetchDashboardData();
  }, [session, refetchTrigger, refetchDashboardData]);

  useEffect(() => {
    fetchDailyStats();
  }, [selectedDateForDailyStats, classTaught, session, fetchDailyStats]);

  const handleLogout = async () => {
    await logout();
  };

  if (!session || loadingProfile) {
    return (
      <Card className="w-full mx-auto max-w-6xl"> {/* Added max-w-6xl */}
        <CardHeader>
          <CardTitle className="text-3xl text-center">Dashboard Guru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-6 w-1/2 mx-auto mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto max-w-6xl"> {/* Added max-w-6xl */}
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center">Dashboard Guru</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-lg">Selamat datang, Guru {teacherName}!</p>
        {classTaught && <p className="text-center text-md text-muted-foreground">Kelas yang Diajar: {classTaught}</p>}
        {!classTaught && <p className="text-center text-md text-red-500">Anda belum memiliki kelas yang diajar. Harap hubungi Admin.</p>}

        <h3 className="text-xl font-semibold mt-8">Statistik Kelas {classTaught || ''} (Keseluruhan)</h3>
        {loadingStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStudents}</div>
                <p className="text-xs text-muted-foreground">Siswa di kelas Anda</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Saldo Kelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><span>Rp </span>{totalBalance.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Jumlah saldo semua siswa</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Setoran Kelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><span>Rp </span>{totalDeposits.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Total uang masuk</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Penarikan Kelas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><span>Rp </span>{totalWithdrawals.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Total uang keluar</p>
              </CardContent>
            </Card>
          </div>
        )}

        <h3 className="text-xl font-semibold mt-8">Statistik Harian Kelas {classTaught || ''}</h3>
        <div className="space-y-2 mb-4">
          <Label htmlFor="dateFilter">Pilih Tanggal</Label>
          {isMounted && ( // Render Popover only on client
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="dateFilter"
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDateForDailyStats && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDateForDailyStats ? (
                    format(selectedDateForDailyStats, 'dd MMM yyyy', { locale: id })
                  ) : (
                    <span>Pilih tanggal</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="single"
                  selected={selectedDateForDailyStats}
                  onSelect={setSelectedDateForDailyStats}
                  locale={id}
                />
              </PopoverContent>
            </Popover>
          )}
          <Button
            onClick={() => setSelectedDateForDailyStats(new Date())}
            variant="ghost"
            className="w-full mt-2"
          >
            Reset ke Hari Ini
          </Button>
        </div>
        {loadingDailyStats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Setoran Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600"><span>Rp </span>{dailyTotalDeposits.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Total setoran hari ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Penarikan Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600"><span>Rp </span>{dailyTotalWithdrawals.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Total penarikan hari ini</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo Bersih Harian</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold"><span>Rp </span>{dailyNetBalance.toLocaleString('id-ID')}</div>
                <p className="text-xs text-muted-foreground">Perubahan saldo hari ini</p>
              </CardContent>
            </Card>
          </div>
        )}

        <h3 className="text-xl font-semibold mt-8">Transaksi Terbaru (Kelas {classTaught || ''})</h3>
        {loadingStats ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : latestTransactions.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada transaksi terbaru untuk kelas ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Siswa</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Deskripsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(transaction.created_at), 'dd MMM yyyy, HH:mm', { locale: id })}</TableCell>
                    <TableCell className="font-medium whitespace-normal">{transaction.students?.name}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className={`font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'deposit' ? 'Setoran' : 'Penarikan'}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap"><span>Rp </span>{transaction.amount.toLocaleString('id-ID')}</TableCell>
                    <TableCell className="whitespace-normal">{transaction.description || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Link href="/teacher/students/manage" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Manajemen Data Siswa</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Tambahkan siswa baru atau impor data siswa dari Excel.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/teacher/students" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Tabungan Siswa</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Lihat daftar siswa Anda dan rekapitulasi tabungan mereka.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/teacher/saving-schedules" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Jadwal Menabung</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Atur dan lihat jadwal menabung siswa Anda.</p>
              </CardContent>
            </Card>
          </Link>
        </div>
        <Button onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}