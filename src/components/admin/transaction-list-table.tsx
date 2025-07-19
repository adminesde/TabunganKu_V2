"use client";

import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description?: string;
  student_id: string;
  students: { // Changed from array to single object
    name: string;
    class: string;
    nisn: string;
  } | null;
}

interface TransactionListTableProps {
  transactions: Transaction[];
  onDeleteClick: (transaction: Transaction) => void;
}

export function TransactionListTable({ transactions, onDeleteClick }: TransactionListTableProps) {
  const router = useRouter();

  return (
    <>
      {transactions.length === 0 ? (
        <p className="text-center text-muted-foreground">Belum ada riwayat transaksi.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Tanggal</TableHead>
                <TableHead className="whitespace-nowrap">Nama Siswa</TableHead> {/* Changed from Siswa */}
                <TableHead className="whitespace-nowrap">Kelas</TableHead> {/* New column */}
                <TableHead className="whitespace-nowrap">Tipe</TableHead>
                <TableHead className="whitespace-nowrap">Jumlah</TableHead>
                <TableHead className="whitespace-normal">Deskripsi</TableHead> {/* Changed to normal for description */}
                <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="whitespace-nowrap">{new Date(transaction.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-medium whitespace-nowrap">
                    {transaction.students?.name || '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {transaction.students?.class || '-'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className={`font-medium ${transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'deposit' ? 'Setoran' : 'Penarikan'}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">Rp {transaction.amount.toLocaleString('id-ID')}</TableCell>
                  <TableCell className="whitespace-normal">{transaction.description || '-'}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <div className="flex justify-end space-x-2">
                      {transaction.type === 'withdrawal' && (
                        <IconButton
                          icon={Download}
                          tooltip="Bukti Penarikan"
                          onClick={() => router.push(`/admin/withdrawal-proof/${transaction.id}`)}
                          variant="outline"
                        />
                      )}
                      <IconButton
                        icon={Trash2}
                        tooltip="Hapus Transaksi"
                        onClick={() => onDeleteClick(transaction)}
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
    </>
  );
}