"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

interface StatusCardProps {
  status: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  loadingMessage?: string;
  errorMessage?: string;
  emptyMessage?: string;
  backButtonHref?: string;
  backButtonText?: string;
  className?: string;
}

export function StatusCard({
  status,
  title,
  message,
  loadingMessage = "Memuat data...",
  errorMessage = "Terjadi kesalahan saat memuat data.",
  emptyMessage = "Tidak ada data yang ditemukan.",
  backButtonHref,
  backButtonText = "Kembali",
  className,
}: StatusCardProps) {
  const router = useRouter();

  return (
    <Card className={`w-full max-w-4xl mx-auto p-4 md:p-6 ${className || ''}`}> {/* Added responsive padding */}
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl text-center"> {/* Increased title size */}
          {title || (status === 'loading' ? "Memuat..." : status === 'error' ? "Error" : "Informasi")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {status === 'loading' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-base md:text-lg">{message || loadingMessage}</p> {/* Increased font size */}
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-4">
            <p className="text-red-500 text-center text-base md:text-lg">{message || errorMessage}</p> {/* Increased font size */}
            {backButtonHref && (
              <Button onClick={() => router.push(backButtonHref)} className="w-full mt-4">
                {backButtonText}
              </Button>
            )}
          </div>
        )}
        {status === 'empty' && (
          <div className="space-y-4">
            <p className="text-center text-muted-foreground text-base md:text-lg">{message || emptyMessage}</p> {/* Increased font size */}
            {backButtonHref && (
              <Button onClick={() => router.push(backButtonHref)} className="w-full mt-4">
                {backButtonText}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}