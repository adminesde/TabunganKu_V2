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

interface GroupedSavingSchedule {
  class: string;
  amount_expected: number;
  frequency: string;
  day_of_week: string | null;
  student_count: number;
}

interface DeleteSavingScheduleDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  scheduleToDelete: GroupedSavingSchedule | null;
  onConfirm: () => void;
}

export function DeleteSavingScheduleDialog({
  isOpen,
  onOpenChange,
  scheduleToDelete,
  onConfirm,
}: DeleteSavingScheduleDialogProps) {
  const frequencyMap: Record<string, string> = {
    daily: "Harian",
    weekly: "Mingguan",
    monthly: "Bulanan",
  };

  const dayOfWeekMap: Record<string, string> = {
    Monday: "Senin",
    Tuesday: "Selasa",
    Wednesday: "Rabu",
    Thursday: "Kamis",
    Friday: "Jumat",
    Saturday: "Sabtu",
    Sunday: "Minggu",
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin ingin menghapus jadwal menabung ini?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus semua jadwal menabung dengan kriteria berikut:
            <ul className="list-disc list-inside mt-2 ml-4">
              <li>Kelas: <span className="font-semibold">{scheduleToDelete?.class}</span></li>
              <li>Jumlah Diharapkan: <span className="font-semibold">Rp {scheduleToDelete?.amount_expected.toLocaleString('id-ID')}</span></li>
              <li>Frekuensi: <span className="font-semibold">{scheduleToDelete?.frequency ? frequencyMap[scheduleToDelete.frequency] : '-'}</span></li>
              {scheduleToDelete?.frequency === 'weekly' && (
                <li>Hari: <span className="font-semibold">{scheduleToDelete?.day_of_week ? dayOfWeekMap[scheduleToDelete.day_of_week] : '-'}</span></li>
              )}
              <li>Jumlah Siswa Terdampak: <span className="font-semibold">{scheduleToDelete?.student_count}</span></li>
            </ul>
            <br />
            Apakah Anda benar-benar yakin ingin melanjutkan?
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