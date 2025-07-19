"use client";

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Transaction {
  id: string;
  amount: number;
  type: "deposit" | "withdrawal";
  students: {
    name: string;
  } | null;
}

interface DeleteTransactionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  transactionToDelete: Transaction | null;
  onConfirm: () => void;
}

export function DeleteTransactionDialog({
  isOpen,
  onOpenChange,
  transactionToDelete,
  onConfirm,
}: DeleteTransactionDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin ingin menghapus transaksi ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus transaksi{" "}
            <span className="font-semibold">{transactionToDelete?.type === 'deposit' ? 'Setoran' : 'Penarikan'} sebesar Rp {transactionToDelete?.amount.toLocaleString('id-ID')}</span>{" "}
            untuk siswa <span className="font-semibold">{transactionToDelete?.students?.name}</span> secara permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}