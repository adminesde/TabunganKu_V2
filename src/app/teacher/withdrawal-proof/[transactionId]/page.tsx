"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react"; // Import React
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Download } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { PageCardLayout } from "@/components/layout/page-card-layout";
import { StatusCard } from "@/components/common/status-card";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface StudentDataFromTransaction {
  name: string;
  nisn: string;
  class: string;
  parent_id: string | null;
  teacher_id: string | null;
}

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
}

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description?: string;
  student_id: string;
  students: StudentDataFromTransaction | null; // Changed from array to single object
  teacher_id: string | null;
  teacher_profile: ProfileData | null;
  parent_profile: ProfileData | null;
}

export default function TeacherWithdrawalProofPage({ params }: { params: { transactionId: string } }) {
  const { transactionId } = React.use(params); // Menggunakan React.use()
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) {
      setLoading(false);
      return;
    }

    const fetchTransactionDetails = async () => {
      setLoading(true);
      setError(null);

      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

      if (!uuidRegex.test(transactionId)) {
        setError("ID transaksi tidak valid. Harap pastikan Anda menggunakan ID transaksi yang benar.");
        showErrorToast("ID transaksi tidak valid.");
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select(`
          id,
          created_at,
          amount,
          type,
          description,
          student_id,
          students (
            name,
            nisn,
            class,
            parent_id,
            teacher_id
          ),
          teacher_id
        `)
        .eq("id", transactionId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          setError("Transaksi tidak ditemukan.");
          showErrorToast("Transaksi tidak ditemukan.");
        } else {
          setError(`Gagal memuat transaksi: ${fetchError.message}`);
          showErrorToast("Gagal memuat transaksi: " + fetchError.message);
        }
      } else if (!data) {
        setError("Transaksi tidak ditemukan.");
        showErrorToast("Transaksi tidak ditemukan.");
      } else if (data.type !== "withdrawal") {
        setError("Transaksi yang diminta bukan transaksi penarikan.");
        showErrorToast("Hanya bukti penarikan yang dapat dilihat.");
      } else if (data.students?.teacher_id !== session.user.id) { // Corrected: Access teacher_id directly from object
        setError("Akses ditolak. Anda tidak memiliki izin untuk melihat bukti penarikan siswa ini.");
        showErrorToast("Akses ditolak. Anda bukan guru siswa ini.");
      }
      else {
        let teacherProfileData = null;
        if (data.teacher_id) {
          const { data: tData, error: tError } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", data.teacher_id)
            .single();
          if (tError) {
            console.error("Error fetching teacher profile:", tError.message);
          } else {
            teacherProfileData = tData;
          }
        }

        let parentProfileData = null;
        // Safely access parent_id from the students object
        if (data.students?.parent_id) { // Corrected: Access parent_id directly from object
          const { data: pData, error: pError } = await supabase
            .from("profiles")
            .select("first_name, last_name")
            .eq("id", data.students.parent_id) // Corrected: Access parent_id directly from object
            .single();
          if (pError) {
            console.error("Error fetching parent profile:", pError.message);
          } else {
            parentProfileData = pData;
          }
        }
        setTransaction({ ...data, teacher_profile: teacherProfileData, parent_profile: parentProfileData } as unknown as Transaction);
      }
      setLoading(false);
    };

    fetchTransactionDetails();
  }, [transactionId, session]); // Removed supabase from dependencies

  const generatePdf = async () => {
    if (!contentRef.current) {
      showErrorToast("Konten untuk PDF tidak ditemukan.");
      return;
    }

    setLoading(true);
    try {
      const canvas = await html2canvas(contentRef.current, { scale: 3 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const pageCount = (pdf as any).internal.getNumberOfPages(); // Cast pdf to any
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        (pdf as any).setFontSize(8);
        (pdf as any).text("TabunganKu | Anang Creative Production", (pdf as any).internal.pageSize.width / 2, (pdf as any).internal.pageSize.height - 10, { align: "center" }); // Cast pdf to any
      }

      pdf.save(`bukti-penarikan-${transaction?.students?.name}-${transaction?.id}.pdf`); // Corrected: Access name directly from object
      showSuccessToast("Bukti penarikan berhasil diunduh!");
    } catch (err) {
      console.error("Error generating PDF:", err);
      showErrorToast("Gagal mengunduh bukti penarikan.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <StatusCard status="loading" title="Memuat Bukti Penarikan..." />;
  }

  if (error) {
    // Fallback to a generic dashboard if student_id is not available
    const backHref = transaction?.student_id ? `/teacher/students/${transaction.student_id}/transactions` : "/teacher/dashboard";
    return <StatusCard status="error" message={error} backButtonHref={backHref} backButtonText="Kembali ke Transaksi Siswa" />;
  }

  if (!transaction) {
    return <StatusCard status="empty" title="Transaksi Tidak Ditemukan" message="Detail transaksi penarikan tidak dapat dimuat." backButtonHref={`/teacher/students`} backButtonText="Kembali ke Transaksi Siswa" />;
  }

  const formattedDate = new Date(transaction.created_at).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const teacherName = transaction.teacher_profile?.first_name || transaction.teacher_profile?.last_name
    ? `${transaction.teacher_profile.first_name || ''} ${transaction.teacher_profile.last_name || ''}`.trim()
    : 'Guru';

  const parentName = transaction.parent_profile?.first_name || transaction.parent_profile?.last_name
    ? `${transaction.parent_profile.first_name || ''} ${transaction.parent_profile.last_name || ''}`.trim()
    : 'Orang Tua';

  const printDate = new Date().toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PageCardLayout
      title="Bukti Penarikan"
      backHref={`/teacher/students/${transaction.student_id}/transactions`}
      className="w-full" // Removed max-w-2xl
      actions={
        <IconButton
          icon={Download}
          tooltip="Unduh PDF"
          onClick={generatePdf}
          disabled={loading}
        />
      }
    >
      <div ref={contentRef} className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md relative">
        <div className="absolute top-4 right-4 text-xs text-gray-500 dark:text-gray-400">
          Tanggal Cetak: {printDate}
        </div>
        <h2 className="text-xl font-bold text-center mb-6 uppercase">BUKTI PENARIKAN TABUNGAN SISWA</h2>
        <div className="space-y-3 text-sm mb-8">
          <p><strong>Tanggal Transaksi:</strong> {formattedDate}</p>
          <p><strong>ID Transaksi:</strong> {transaction.id}</p>
          <p><strong>Nama Siswa:</strong> {transaction.students?.name}</p> {/* Corrected: Access name directly from object */}
          <p><strong>NISN:</strong> {transaction.students?.nisn}</p> {/* Corrected: Access nisn directly from object */}
          <p><strong>Kelas:</strong> {transaction.students?.class}</p> {/* Corrected: Access class directly from object */}
          <p className="text-lg font-bold"><strong>Jumlah Penarikan:</strong> Rp {transaction.amount.toLocaleString('id-ID')}</p>
          <p><strong>Deskripsi:</strong> {transaction.description || '-'}</p>
        </div>
        <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-8">Terima kasih telah menggunakan layanan kami.</p>
          
          <div className="flex justify-around items-start mt-12">
            <div className="flex flex-col items-center">
              <p>Tanda tangan Orang Tua:</p>
              <div className="mt-8 border-b border-gray-300 w-48 pt-2"></div>
              <p className="mt-1 font-semibold">{parentName}</p>
            </div>
            <div className="flex flex-col items-center">
              <p>Tanda tangan Guru:</p>
              <div className="mt-8 border-b border-gray-300 w-48 pt-2"></div>
              <p className="mt-1 font-semibold">{teacherName}</p>
            </div>
          </div>
        </div>
      </div>
    </PageCardLayout>
  );
}