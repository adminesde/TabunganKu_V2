"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import Link from "next/link"; // Import Link
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export default function AdminDashboardPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const { logout } = useAuthActions();
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [errorStats, setErrorStats] = useState<string | null>(null); // Add error state

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoadingStats(true);
      setErrorStats(null); // Reset error state
      if (!session?.user?.id) {
        setErrorStats("Anda harus login untuk melihat statistik."); // Set error if no session
        setLoadingStats(false);
        return;
      }

      // Fetch global statistics from the new view
      const { data, error } = await supabase
        .from("app_global_stats_view")
        .select("total_students, total_balance, total_deposits, total_withdrawals")
        .single(); // Assuming there's only one row in this view

      if (error) {
        console.error("Error fetching global stats:", error.message);
        setErrorStats("Gagal memuat statistik global: " + error.message); // Set detailed error
        showErrorToast("Gagal memuat statistik global.");
      } else if (data) {
        setTotalStudents(data.total_students || 0);
        setTotalBalance(data.total_balance || 0);
        setTotalDeposits(data.total_deposits || 0);
        setTotalWithdrawals(data.total_withdrawals || 0);
      }
      setLoadingStats(false);
    };

    fetchAdminStats();
  }, [session]); // Removed supabase from dependencies

  const handleLogout = async () => {
    await logout();
  };

  if (!session) {
    return <StatusCard status="loading" title="Memuat Sesi Pengguna..." message="Mohon tunggu sebentar." />;
  }

  if (loadingStats) {
    return <StatusCard status="loading" title="Memuat Statistik Admin..." />;
  }

  if (errorStats) {
    return <StatusCard status="error" message={errorStats} backButtonHref="/login" backButtonText="Kembali ke Login" />;
  }

  return (
    <Card className="w-full mx-auto max-w-6xl"> {/* Added max-w-6xl */}
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center">Dashboard Admin</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-lg">Selamat datang, Admin!</p>

        <h3 className="text-xl font-semibold mt-8">Statistik Global</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Siswa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground">Siswa terdaftar</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saldo Aplikasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalBalance.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Jumlah saldo semua siswa</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Setoran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalDeposits.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Total uang masuk ke aplikasi</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penarikan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold"><span>Rp </span>{totalWithdrawals.toLocaleString('id-ID')}</div>
              <p className="text-xs text-muted-foreground">Total uang keluar dari aplikasi</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Link href="/admin/recap" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Rekapitulasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Lihat rekapitulasi berdasarkan kelas dan nama siswa.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/transactions" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Kelola Setor dan Penarikan.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/users" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Manajemen Pengguna</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Kelola akun admin, guru, dan orang tua.</p>
              </CardContent>
            </Card>
          </Link>
          <Link href="/admin/saving-schedules" passHref>
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Jadwal Menabung</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Atur jadwal menabung siswa.</p>
              </CardContent>
            </Card>
          </Link>
          {/* Removed the problematic card for withdrawal proof */}
        </div>
        <Button onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}