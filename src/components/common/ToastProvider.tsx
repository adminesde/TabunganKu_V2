"use client";

import React from 'react';
import { Toaster } from 'sonner';

interface ToastProviderProps {
  children: React.ReactNode;
}

const ToastProvider = ({ children }: ToastProviderProps) => {
  return (
    <>
      <Toaster richColors position="top-center" />
      {children}
    </>
  );
};

export default ToastProvider;