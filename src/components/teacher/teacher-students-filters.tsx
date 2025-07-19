"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, XCircle } from "lucide-react"; // Import XCircle icon
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile

interface TeacherStudentsFiltersProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  isMounted: boolean;
}

export function TeacherStudentsFilters({
  searchTerm,
  setSearchTerm,
  selectedDate,
  setSelectedDate,
  isMounted,
}: TeacherStudentsFiltersProps) {
  const isMobile = useIsMobile();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="space-y-2">
        <Label htmlFor="searchStudent">Cari Siswa (Nama/NISN)</Label>
        <Input
          id="searchStudent"
          type="text"
          placeholder="Cari nama atau NISN siswa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="dateFilter">Filter Tanggal</Label>
        {isMounted && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="dateFilter"
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "LLL dd, y", { locale: id })
                ) : (
                  <span>Pilih tanggal</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={id}
              />
            </PopoverContent>
          </Popover>
        )}
        {selectedDate && (
          <IconButton
            icon={XCircle}
            tooltip="Hapus Filter Tanggal"
            onClick={() => setSelectedDate(undefined)}
            variant="ghost"
            className="w-full mt-2"
          >
            {!isMobile && "Hapus Filter Tanggal"}
          </IconButton>
        )}
      </div>
    </div>
  );
}