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

interface DeleteAllTransactionsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function DeleteAllTransactionsDialog({
  isOpen,
  onOpenChange,
  onConfirm,
}: DeleteAllTransactionsDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>PERINGATAN: Hapus Semua Transaksi?</AlertDialogTitle>
          <AlertDialogDescription className="text-red-600 font-bold">
            Tindakan ini akan menghapus <span className="underline">SEMUA</span> riwayat transaksi dari <span className="underline">SEMUA SISWA</span> secara permanen.
            <br />
            <br />
            Ini adalah tindakan yang <span className="font-extrabold">TIDAK DAPAT DIBATALKAN</span>.
            <br />
            <br />
            Apakah Anda benar-benar yakin ingin melanjutkan?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Ya, Hapus Semua Transaksi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}