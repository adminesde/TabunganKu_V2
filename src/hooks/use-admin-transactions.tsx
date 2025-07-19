"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/session-context-provider";
import { showErrorToast } from "@/lib/toast"; // Import from new utility
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

interface StudentOption {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  current_balance: number;
  teacher_id: string | null;
}

interface UseAdminTransactionsProps {
  selectedClass?: string;
  transactionFilterType: "all" | "deposit" | "withdrawal";
  shouldFetch: boolean;
  currentPage: number; // New prop for pagination
  itemsPerPage: number; // New prop for pagination
}

interface UseAdminTransactionsReturn {
  allStudents: StudentOption[];
  filteredStudents: StudentOption[];
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalTransactionsCount: number; // New return value for pagination
}

export function useAdminTransactions({
  selectedClass,
  transactionFilterType,
  shouldFetch,
  currentPage,
  itemsPerPage,
}: UseAdminTransactionsProps): UseAdminTransactionsReturn {
  const { session } = useSupabase(); // Still need session for auth context
  const [allStudents, setAllStudents] = useState<StudentOption[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentOption[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);
  const [totalTransactionsCount, setTotalTransactionsCount] = useState(0); // New state for total count

  const refetch = useCallback(() => {
    setRefetchTrigger(prev => prev + 1);
  }, []);

  // Effect to fetch all students (always needed for the form)
  useEffect(() => {
    const fetchAllStudents = async () => {
      setLoading(true); // Set loading for overall data
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login untuk melihat data.");
        setLoading(false);
        return;
      }

      const { data: studentsData, error: studentsError } = await supabase
        .from("student_balances_view")
        .select("student_id, student_name, nisn, class, current_balance, teacher_id")
        .order("student_name", { ascending: true });

      if (studentsError) {
        setError(studentsError.message);
        showErrorToast("Gagal memuat daftar siswa: " + studentsError.message);
      } else {
        setAllStudents(studentsData || []);
      }
      setLoading(false); // Set loading false after students are fetched
    };

    fetchAllStudents();
  }, [session, refetchTrigger]); // Removed supabase from dependencies

  // Effect to fetch transactions (conditionally based on shouldFetch)
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!shouldFetch) {
        setTransactions([]);
        setTotalTransactionsCount(0);
        return;
      }

      setLoading(true); // Set loading for transactions
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login untuk melihat transaksi.");
        setLoading(false);
        return;
      }

      let transactionsQuery = supabase
        .from("transactions")
        .select(`
          id,
          created_at,
          amount,
          type,
          description,
          students (
            name,
            class,
            nisn
          )
        `, { count: 'exact' }) // Request exact count for pagination
        .order("created_at", { ascending: false });

      if (transactionFilterType !== "all") {
        transactionsQuery = transactionsQuery.eq("type", transactionFilterType);
      }

      // Apply class filter if selected
      if (selectedClass && selectedClass !== "all") {
        transactionsQuery = transactionsQuery.eq("students.class", selectedClass);
      }

      // Apply pagination range
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage - 1;
      transactionsQuery = transactionsQuery.range(startIndex, endIndex);

      const { data: transactionsData, error: transactionsError, count } = await transactionsQuery;

      if (transactionsError) {
        setError(transactionsError.message);
        showErrorToast("Gagal memuat transaksi: " + transactionsError.message);
      } else {
        setTransactions(transactionsData as unknown as Transaction[] || []);
        setTotalTransactionsCount(count || 0); // Set total count
      }
      setLoading(false); // Set loading false after transactions are fetched
    };

    fetchTransactions();
  }, [session, transactionFilterType, selectedClass, refetchTrigger, shouldFetch, currentPage, itemsPerPage]); // Removed supabase from dependencies

  // Effect to filter students for the form based on selectedClass
  useEffect(() => {
    if (selectedClass && selectedClass !== "all") {
      setFilteredStudents(allStudents.filter(student => student.class === selectedClass));
    } else {
      setFilteredStudents(allStudents);
    }
  }, [selectedClass, allStudents]);

  return { allStudents, filteredStudents, transactions, loading, error, refetch, totalTransactionsCount };
}