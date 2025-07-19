"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Eye, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { IconButton } from "@/components/common/icon-button";

interface StudentWithBalance {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  overall_current_balance: number;
  period_deposits: number;
  period_withdrawals: number;
}

interface TeacherStudentsTableProps {
  students: StudentWithBalance[];
}

export function TeacherStudentsTable({ students }: TeacherStudentsTableProps) {
  const router = useRouter();

  return (
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
            <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => (
            <TableRow key={student.student_id}>
              <TableCell className="font-medium whitespace-nowrap">{student.student_name}</TableCell>
              <TableCell className="whitespace-nowrap">{student.nisn}</TableCell>
              <TableCell className="whitespace-nowrap">{student.class}</TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <span>Rp </span>{student.period_deposits.toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right whitespace-nowrap">
                <span>Rp </span>{student.period_withdrawals.toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right font-semibold whitespace-nowrap">
                <span>Rp </span>{Math.max(0, student.overall_current_balance).toLocaleString('id-ID')}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  <IconButton
                    icon={Eye}
                    tooltip="Lihat Detail"
                    onClick={() => router.push(`/teacher/students/${student.student_id}/detail`)}
                    variant="outline"
                  />
                  <IconButton
                    icon={Pencil}
                    tooltip="Edit Siswa"
                    onClick={() => router.push(`/teacher/students/${student.student_id}/edit`)}
                    variant="outline"
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}