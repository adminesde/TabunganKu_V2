"use client";

import { useState, useEffect } from "react";
import { useSupabase } from "@/components/session-context-provider";
import { showErrorToast } from "@/lib/toast"; // Import from new utility
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  type: "deposit" | "withdrawal";
  description?: string;
}

interface Student {
  id: string;
  name: string;
  nisn: string;
  class: string;
  parent_id: string | null;
  teacher_id: string | null;
}

interface UseStudentTransactionsProps {
  studentId: string;
  userRole: "teacher" | "parent" | "admin";
  transactionType?: "all" | "deposit" | "withdrawal";
}

interface UseStudentTransactionsReturn {
  student: Student | null;
  transactions: Transaction[];
  balance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStudentTransactions({
  studentId,
  userRole,
  transactionType = "all",
}: UseStudentTransactionsProps): UseStudentTransactionsReturn {
  const { session } = useSupabase(); // Still need session for auth context
  const [student, setStudent] = useState<Student | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [totalDeposits, setTotalDeposits] = useState<number>(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = () => setRefetchTrigger(prev => prev + 1);

  useEffect(() => {
    const fetchStudentAndTransactions = async () => {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login untuk melihat detail siswa.");
        setLoading(false);
        return;
      }

      let studentQuery = supabase
        .from("students")
        .select("id, name, nisn, class, parent_id, teacher_id")
        .eq("id", studentId);

      if (userRole === "teacher") {
        studentQuery = studentQuery.eq("teacher_id", session.user.id);
      } else if (userRole === "parent") {
        studentQuery = studentQuery.eq("parent_id", session.user.id);
      }

      const { data: studentData, error: studentError } = await studentQuery.single();

      if (studentError || !studentData) {
        setError("Siswa tidak ditemukan atau Anda tidak memiliki akses.");
        showErrorToast("Siswa tidak ditemukan atau akses ditolak.");
        setLoading(false);
        return;
      }
      setStudent(studentData);

      let transactionsQuery = supabase
        .from("transactions")
        .select("id, created_at, amount, type, description")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (userRole === "teacher") {
        transactionsQuery = transactionsQuery.eq("teacher_id", session.user.id);
      }

      if (transactionType !== "all") {
        transactionsQuery = transactionsQuery.eq("type", transactionType);
      }

      const { data: transactionsData, error: transactionsError } = await transactionsQuery;

      if (transactionsError) {
        setError(transactionsError.message);
        showErrorToast("Gagal memuat transaksi: " + transactionsError.message);
      } else {
        setTransactions(transactionsData || []);
        
        const { data: allTransactionsData, error: allTransactionsError } = await supabase
          .from("transactions")
          .select("amount, type")
          .eq("student_id", studentId);

        if (allTransactionsError) {
          console.error("Error fetching all transactions for balance:", allTransactionsError.message);
          setBalance(0);
          setTotalDeposits(0);
          setTotalWithdrawals(0);
        } else {
          let currentBalance = 0;
          let deposits = 0;
          let withdrawals = 0;

          (allTransactionsData || []).forEach(transaction => {
            if (transaction.type === "deposit") {
              currentBalance += transaction.amount;
              deposits += transaction.amount;
            } else {
              currentBalance -= transaction.amount;
              withdrawals += transaction.amount;
            }
          });
          setBalance(currentBalance);
          setTotalDeposits(deposits);
          setTotalWithdrawals(withdrawals);
        }
      }
      setLoading(false);
    };

    fetchStudentAndTransactions();
  }, [studentId, session, userRole, transactionType, refetchTrigger]); // Removed supabase from dependencies

  return { student, transactions, balance, totalDeposits, totalWithdrawals, loading, error, refetch };
}