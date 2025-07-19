"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import React, { useState } from "react"; // Import React
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudentTransactions } from "@/hooks/use-student-transactions";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { Download } from "lucide-react";
import { TeacherAddTransactionForm } from "@/components/teacher/add-transaction-form"; // Import the new component
import { Label } from "@/components/ui/label"; // Import Label
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

export default function StudentTransactionsPage({ params }: { params: { studentId: string } }) {
  const { studentId } = React.use(params); // Menggunakan React.use()
  const router = useRouter();
  const [transactionFilterType, setTransactionFilterType] = useState<"all" | "deposit" | "withdrawal">("all");

  const { student, transactions, balance, totalDeposits, totalWithdrawals, loading, error, refetch } = useStudentTransactions({
    studentId,
    userRole: "teacher",
    transactionType: transactionFilterType,
  });

  if (loading) {
    return <StatusCard status="loading" title="Memuat Data Siswa..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref={`/teacher/students/${studentId}/detail`} backButtonText="Kembali ke Detail Siswa" />;
  }

  if (!student) {
    return <StatusCard status="empty" title="Siswa Tidak Ditemukan" message="Detail siswa tidak dapat dimuat." backButtonHref={`/teacher/students/${studentId}/detail`} backButtonText="Kembali ke Detail Siswa" />;
  }

  return (
    <PageCardLayout
      title={`Kelola Transaksi ${student?.name} (${student?.class})`}
      backHref={`/teacher/students/${studentId}/detail`}
      className="w-full"
    >
      <p className="text-center text-lg font-semibold mt-2">
        Saldo Saat Ini: Rp {Math.max(0, balance).toLocaleString('id-ID')}
      </p>
      <div className="space-y-6">
        <h3 className="text-xl font-semibold">Tambah Transaksi Baru</h3>
        <TeacherAddTransactionForm
          studentId={studentId}
          currentBalance={balance}
          onTransactionAdded={refetch}
        />

        <h3 className="text-xl font-semibold mt-8">Riwayat Transaksi</h3>
        <div className="space-y-2 mb-4">
          <Label htmlFor="transactionFilterType">Filter Tipe Transaksi</Label>
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
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
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
                    <TableCell className="text-right whitespace-nowrap">
                      {transaction.type === 'withdrawal' && (
                        <IconButton
                          icon={Download}
                          tooltip="Bukti Penarikan"
                          onClick={() => router.push(`/teacher/withdrawal-proof/${transaction.id}`)}
                          variant="outline"
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PageCardLayout>
  );
}