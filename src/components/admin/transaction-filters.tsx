"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TransactionFiltersProps {
  classes: string[];
  selectedClass: string | undefined;
  setSelectedClass: (cls: string | undefined) => void;
  transactionFilterType: "all" | "deposit" | "withdrawal";
  setTransactionFilterType: (type: "all" | "deposit" | "withdrawal") => void;
  loadingClasses: boolean;
}

export function TransactionFilters({
  classes,
  selectedClass,
  setSelectedClass,
  transactionFilterType,
  setTransactionFilterType,
  loadingClasses,
}: TransactionFiltersProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <Label htmlFor="classFilter">Filter Kelas</Label>
        <Select
          onValueChange={(value) => setSelectedClass(value === "all" ? undefined : value)}
          value={selectedClass || "all"}
          disabled={loadingClasses || classes.length === 0}
        >
          <SelectTrigger id="classFilter">
            <SelectValue placeholder={classes.length === 0 ? "Tidak ada kelas tersedia" : "Pilih kelas (Opsional)"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls} value={cls}>
                {cls}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
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
    </div>
  );
}