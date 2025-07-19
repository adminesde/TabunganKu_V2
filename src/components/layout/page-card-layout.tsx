"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { IconButton } from '@/components/common/icon-button'; // Import IconButton

interface PageCardLayoutProps {
  title: string;
  backHref: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode; // Optional prop for additional buttons/actions in header
}

export function PageCardLayout({ title, backHref, children, className, actions }: PageCardLayoutProps) {
  const router = useRouter();

  return (
    <Card className={`w-full mx-auto ${className || ''} p-4 md:p-6 max-w-5xl`}> {/* Added max-w-5xl here */}
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-2 md:space-y-0 pb-2"> {/* Adjusted for mobile stacking */}
        <CardTitle className="text-xl sm:text-2xl md:text-3xl text-left flex-grow min-w-0">{title}</CardTitle> {/* Increased title size, added text-left, flex-grow, min-w-0 */}
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0 flex-shrink-0"> {/* Added flex-wrap and gap for mobile, added flex-shrink-0 */}
          {actions}
          <IconButton
            icon={ArrowLeft}
            tooltip="Kembali"
            onClick={() => router.push(backHref)}
            variant="outline"
          />
        </div>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}