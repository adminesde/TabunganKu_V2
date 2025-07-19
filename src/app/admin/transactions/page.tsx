"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react"; // Import useEffect
import { ArrowLeft, Trash2 } from "lucide-react";
import { useClasses } from "@/hooks/use-classes";
import { StatusCard } from "@/components/common/status-card";
import { getSupabaseFunctionUrl } from "@/lib/utils";
import { useAdminTransactions } from "@/hooks/use-admin-transactions";
import { AddTransactionForm } from "@/components/admin/add-transaction-form";
import { TransactionFilters } from "@/components/admin/transaction-filters";
import { TransactionListTable } from "@/components/admin/transaction-list-table";
import { DeleteTransactionDialog } from "@/components/admin/delete-transaction-dialog";
import { DeleteAllTransactionsDialog } from "@/components/admin/delete-all-transactions-dialog";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { Pagination } from "@/components/common/pagination"; // Import Pagination component
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description?: string;
  student_id: string;
  students: {
    name: string;
    class: string;
    nisn: string;
  } | null;
}

export default function AdminTransactionsPage() {
  const { session } = useSupabase(); // Still need session for access_token
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const { classes, loadingClasses, errorClasses } = useClasses();

  const [selectedClassForList, setSelectedClassForList] = useState<string | undefined>(undefined);
  const [transactionFilterType, setTransactionFilterType] = useState<"all" | "deposit" | "withdrawal">("all");
  const [shouldFetchTransactions, setShouldFetchTransactions] = useState(false); // New state for generate button

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of items per page

  const {
    allStudents,
    transactions,
    loading,
    error,
    refetch,
    totalTransactionsCount, // Get total count from hook
  } = useAdminTransactions({
    selectedClass: selectedClassForList,
    transactionFilterType,
    shouldFetch: shouldFetchTransactions,
    currentPage,
    itemsPerPage,
  });

  const totalPages = Math.ceil(totalTransactionsCount / itemsPerPage);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);

  const handleGenerateReport = () => {
    setCurrentPage(1); // Reset to first page on new filter/generate
    setShouldFetchTransactions(true);
  };

  useEffect(() => {
    // Reset shouldFetchTransactions after data is fetched
    if (shouldFetchTransactions && !loading) {
      setShouldFetchTransactions(false);
    }
  }, [loading, shouldFetchTransactions]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    setShouldFetchTransactions(true); // Trigger refetch for the new page
  };

  const handleDeleteClick = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete || !session?.user?.id) {
      showErrorToast("Terjadi kesalahan saat menghapus transaksi.");
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("delete-transaction-by-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ transactionId: transactionToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus transaksi.");
      }

      showSuccessToast(`Transaksi berhasil dihapus.`);
      refetch(); // Re-fetch after delete
    } catch (err: any) {
      showErrorToast("Gagal menghapus transaksi: " + err.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const confirmDeleteAllTransactions = async () => {
    if (!session?.user?.id) {
      showErrorToast("Anda harus login sebagai admin untuk menghapus semua transaksi.");
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("delete-all-transactions-by-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus semua transaksi.");
      }

      showSuccessToast(`Semua transaksi berhasil dihapus.`);
      refetch(); // Re-fetch after delete
    } catch (err: any) {
      showErrorToast("Gagal menghapus semua transaksi: " + err.message);
    } finally {
      setIsDeleteAllDialogOpen(false);
    }
  };

  if (loadingClasses) { // Only check loadingClasses here, use `loading` for transaction data
    return <StatusCard status="loading" title="Memuat Data Transaksi..." />;
  }

  if (error || errorClasses) {
    return <StatusCard status="error" message={error || errorClasses || undefined} backButtonHref="/admin/dashboard" backButtonText="Kembali ke Dashboard Admin" />;
  }

  return (
    <Card className="w-full mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Kelola Transaksi Siswa</CardTitle>
        <div className="flex space-x-2">
          <IconButton
            icon={Trash2}
            tooltip="Hapus Semua Transaksi"
            onClick={() => setIsDeleteAllDialogOpen(true)}
            variant="destructive"
          >
            {!isMobile && "Hapus Semua Transaksi"}
          </IconButton>
          <IconButton
            icon={ArrowLeft}
            tooltip="Kembali"
            onClick={() => router.push("/admin/dashboard")}
            variant="outline"
          >
            {!isMobile && "Kembali"}
          </IconButton>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <h3 className="text-xl font-semibold">Tambah Transaksi Baru</h3>
        <AddTransactionForm
          allStudents={allStudents}
          classes={classes}
          loadingStudents={loading}
          loadingClasses={loadingClasses}
          onTransactionAdded={refetch}
        />

        <h3 className="text-xl font-semibold mt-8">Riwayat Semua Transaksi</h3>
        <TransactionFilters
          classes={classes}
          selectedClass={selectedClassForList}
          setSelectedClass={setSelectedClassForList}
          transactionFilterType={transactionFilterType}
          setTransactionFilterType={setTransactionFilterType}
          loadingClasses={loadingClasses}
        />
        <Button onClick={handleGenerateReport} className="w-full mb-6" disabled={loading}>
          {loading ? "Memuat..." : "Generate Riwayat"}
        </Button>

        {!shouldFetchTransactions && transactions.length === 0 && totalTransactionsCount === 0 ? (
          <p className="text-center text-muted-foreground">Pilih filter dan klik "Generate Riwayat" untuk menampilkan data transaksi.</p>
        ) : loading ? ( // Show skeleton while generating
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada riwayat transaksi yang ditemukan dengan filter ini.</p>
        ) : (
          <>
            <TransactionListTable
              transactions={transactions}
              onDeleteClick={handleDeleteClick}
            />
            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                className="mt-4"
              />
            )}
          </>
        )}
      </CardContent>

      <DeleteTransactionDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        transactionToDelete={transactionToDelete}
        onConfirm={confirmDeleteTransaction}
      />

      <DeleteAllTransactionsDialog
        isOpen={isDeleteAllDialogOpen}
        onOpenChange={setIsDeleteAllDialogOpen}
        onConfirm={confirmDeleteAllTransactions}
      />
    </Card>
  );
}