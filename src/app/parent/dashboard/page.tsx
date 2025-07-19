"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye } from "lucide-react";
import { useAuthActions } from "@/hooks/use-auth-actions";
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface StudentWithBalance {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  current_balance: number;
}

export default function ParentDashboardPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const { logout } = useAuthActions();
  const [children, setChildren] = useState<StudentWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
  };

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchChildrenData = async () => {
      setLoading(true);
      setError(null);

      // Fetch students associated with this parent from the new view
      const { data, error } = await supabase
        .from("student_balances_view") // Use the new view
        .select("student_id, student_name, nisn, class, current_balance")
        .eq("parent_id", session.user.id); // Filter by parent_id

      if (error) {
        setError(error.message);
        showErrorToast("Gagal memuat data anak: " + error.message);
      } else {
        setChildren(data || []);
      }
      setLoading(false);
    };

    fetchChildrenData();
  }, [session]); // Removed supabase from dependencies

  if (loading) {
    return <StatusCard status="loading" title="Memuat Data Anak..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/parent/dashboard" backButtonText="Kembali ke Dashboard" />;
  }

  return (
    <Card className="w-full mx-auto max-w-6xl"> {/* Added max-w-6xl */}
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center">Dashboard Orang Tua</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-center text-lg">Selamat datang, Orang Tua!</p>
        {/* Removed "Hubungkan Anak" card as linking is now done during registration/login */}

        <h3 className="text-xl font-semibold mt-8">Rekapan Tabungan Anak</h3>
        {children.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada data anak yang terdaftar untuk akun ini. Silakan daftar atau login menggunakan NISN anak Anda.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nama Anak</TableHead>
                  <TableHead className="whitespace-nowrap">NISN</TableHead>
                  <TableHead className="whitespace-nowrap">Kelas</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Saldo</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.map((child) => (
                  <TableRow key={child.student_id}>
                    <TableCell className="font-medium whitespace-nowrap">{child.student_name}</TableCell>
                    <TableCell className="whitespace-nowrap">{child.nisn}</TableCell>
                    <TableCell className="whitespace-nowrap">{child.class}</TableCell>
                    <TableCell className="text-right font-semibold whitespace-nowrap"><span>Rp </span>{Math.max(0, child.current_balance).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <IconButton
                        icon={Eye}
                        tooltip="Lihat Detail"
                        onClick={() => router.push(`/parent/students/${child.student_id}/transactions`)}
                        variant="outline"
                      >
                        {!isMobile && "Lihat Detail"}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/parent/saving-schedules")}>
          <CardHeader>
            <CardTitle>Jadwal Menabung Anak</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Lihat jadwal menabung yang ditetapkan untuk anak Anda.</p>
          </CardContent>
        </Card>
        <Button onClick={handleLogout} className="w-full">
          Logout
        </Button>
      </CardContent>
    </Card>
  );
}