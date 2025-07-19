"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import React, { useState } from "react"; // Import React
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components
import { PlusCircle } from "lucide-react";
import { useStudentTransactions } from "@/hooks/use-student-transactions";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export default function TeacherStudentDetailPage({ params }: { params: { studentId: string } }) {
  const { studentId } = React.use(params); // Menggunakan React.use()
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [transactionFilterType, setTransactionFilterType] = useState<"all" | "deposit" | "withdrawal">("all");

  const { student, transactions, balance, totalDeposits, totalWithdrawals, loading, error } = useStudentTransactions({
    studentId,
    userRole: "teacher",
    transactionType: transactionFilterType,
  });

  if (loading) {
    return <StatusCard status="loading" title="Memuat Detail Siswa..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/teacher/students" backButtonText="Kembali ke Rekapitulasi Siswa" />;
  }

  if (!student) {
    return <StatusCard status="empty" title="Siswa Tidak Ditemukan" message="Detail siswa tidak dapat dimuat." backButtonHref="/teacher/students" backButtonText="Kembali ke Rekapitulasi Siswa" />;
  }

  return (
    <PageCardLayout
      title="Detail Tabungan Siswa"
      backHref="/teacher/students"
      className="w-full"
      actions={
        <IconButton
          icon={PlusCircle}
          tooltip="Kelola Transaksi"
          onClick={() => router.push(`/teacher/students/${studentId}/transactions`)}
        >
          {!isMobile && "Kelola Transaksi"}
        </IconButton>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-xl font-semibold mb-2">Identitas Siswa</h3>
          <p><strong>Nama:</strong> {student.name}</p>
          <p><strong>NISN:</strong> {student.nisn}</p>
          <p><strong>Kelas:</strong> {student.class}</p>
          <p><strong>Saldo Saat Ini:</strong> <span className="font-semibold text-lg"><span>Rp </span>{Math.max(0, balance).toLocaleString('id-ID')}</span></p>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-2">Filter Riwayat Transaksi</h3>
          <Select
            onValueChange={(value: "all" | "deposit" | "withdrawal") => setTransactionFilterType(value)}
            value={transactionFilterType}
          >
            <SelectTrigger id="transactionFilterType">
              <SelectValue placeholder="Filter berdasarkan tipe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              <SelectItem value="deposit">Setoran</SelectItem>
              <SelectItem value="withdrawal">Penarikan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <h3 className="text-xl font-semibold mt-8">Statistik Tabungan</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uang Masuk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600"><span>Rp </span>{totalDeposits.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Jumlah total setoran</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uang Keluar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600"><span>Rp </span>{totalWithdrawals.toLocaleString('id-ID')}</div>
            <p className="text-xs text-muted-foreground">Jumlah total penarikan</p>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-xl font-semibold mt-8">Riwayat Transaksi</h3>
      {transactions.length === 0 ? (
        <p className="text-center text-muted-foreground">Belum ada riwayat transaksi untuk siswa ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                <TableHead className="whitespace-nowrap">Tipe</TableHead>
                <TableHead className="whitespace-nowrap">Jumlah</TableHead>
                <TableHead className="whitespace-nowrap">Deskripsi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">{new Date(transaction.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}</TableCell>
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
    </PageCardLayout>
  );
}