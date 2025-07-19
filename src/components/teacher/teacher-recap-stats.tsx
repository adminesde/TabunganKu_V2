"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TeacherRecapStatsProps {
  totalPeriodDeposits: number;
  totalPeriodWithdrawals: number;
  totalOverallBalance: number;
}

export function TeacherRecapStats({
  totalPeriodDeposits,
  totalPeriodWithdrawals,
  totalOverallBalance,
}: TeacherRecapStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Setoran (Periode Ini)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span>Rp </span>{totalPeriodDeposits.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-muted-foreground">Jumlah total setoran pada periode ini</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Penarikan (Periode Ini)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span>Rp </span>{totalPeriodWithdrawals.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-muted-foreground">Jumlah total penarikan pada periode ini</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Saldo Keseluruhan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            <span>Rp </span>{totalOverallBalance.toLocaleString('id-ID')}
          </div>
          <p className="text-xs text-muted-foreground">Jumlah saldo semua siswa (semua waktu)</p>
        </CardContent>
      </Card>
    </div>
  );
}