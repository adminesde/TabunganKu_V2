"use client";

import { useState, useEffect, useCallback } from "react";
import { useSupabase } from "@/components/session-context-provider";
import { showErrorToast } from "@/lib/toast";
import { supabase } from "@/lib/supabaseClient";
import { format, startOfDay, endOfDay } from "date-fns";

interface StudentWithBalance {
  student_id: string;
  student_name: string;
  nisn: string;
  class: string;
  overall_current_balance: number;
  period_deposits: number;
  period_withdrawals: number;
}

interface TransactionForPeriod {
  amount: number;
  type: "deposit" | "withdrawal";
  student_id: string;
}

interface UseTeacherStudentsDataProps {
  searchTerm: string;
  selectedDate: Date | undefined;
}

interface UseTeacherStudentsDataReturn {
  students: StudentWithBalance[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalPeriodDeposits: number;
  totalPeriodWithdrawals: number;
  totalOverallBalance: number;
}

export function useTeacherStudentsData({
  searchTerm,
  selectedDate,
}: UseTeacherStudentsDataProps): UseTeacherStudentsDataReturn {
  const { session } = useSupabase();
  const [students, setStudents] = useState<StudentWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const [totalPeriodDeposits, setTotalPeriodDeposits] = useState(0);
  const [totalPeriodWithdrawals, setTotalPeriodWithdrawals] = useState(0);
  const [totalOverallBalance, setTotalOverallBalance] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const fetchStudentsAndBalances = async () => {
      setLoading(true);
      setError(null);

      if (!session?.user?.id) {
        setError("Anda harus login untuk melihat data siswa.");
        setLoading(false);
        return;
      }

      // 1. Fetch students with basic info for the current teacher, applying search term
      let studentsQuery = supabase
        .from("students")
        .select("id, name, nisn, class")
        .eq("teacher_id", session.user.id);

      if (searchTerm) {
        const lowerCaseSearchTerm = `%${searchTerm.toLowerCase()}%`;
        studentsQuery = studentsQuery.or(
          `name.ilike.${lowerCaseSearchTerm},nisn.ilike.${lowerCaseSearchTerm}`
        );
      }

      studentsQuery = studentsQuery
        .order("class", { ascending: true })
        .order("name", { ascending: true });

      const { data: rawStudentsData, error: rawStudentsError } =
        await studentsQuery;

      if (rawStudentsError) {
        setError(rawStudentsError.message);
        showErrorToast(
          "Gagal memuat data siswa dasar: " + rawStudentsError.message
        );
        setLoading(false);
        return;
      }

      const studentsMap = new Map<string, StudentWithBalance>();
      (rawStudentsData || []).forEach((s) => {
        studentsMap.set(s.id, {
          student_id: s.id,
          student_name: s.name,
          nisn: s.nisn,
          class: s.class,
          overall_current_balance: 0,
          period_deposits: 0,
          period_withdrawals: 0,
        });
      });

      // 2. Fetch overall balances from the view for these students
      const studentIds = Array.from(studentsMap.keys());
      if (studentIds.length > 0) {
        const { data: balancesData, error: balancesError } = await supabase
          .from("student_balances_view")
          .select("student_id, current_balance")
          .in("student_id", studentIds);

        if (balancesError) {
          console.error("Error fetching student balances:", balancesError.message);
          showErrorToast("Gagal memuat saldo siswa.");
        } else {
          (balancesData || []).forEach((b) => {
            const student = studentsMap.get(b.student_id);
            if (student) {
              student.overall_current_balance = b.current_balance;
            }
          });
        }
      }

      // 3. If a date is selected, fetch transactions for that date and update period totals
      if (selectedDate) {
        let transactionsQuery = supabase
          .from("transactions")
          .select("student_id, amount, type")
          .gte(
            "created_at",
            format(startOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
          )
          .lte(
            "created_at",
            format(endOfDay(selectedDate), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
          )
          .eq("teacher_id", session.user.id);

        if (studentIds.length > 0) {
          transactionsQuery = transactionsQuery.in("student_id", studentIds);
        } else {
          // If no students match the search term, no transactions will be found
          setStudents([]);
          setLoading(false);
          return;
        }

        const { data: transactionsData, error: transactionsError } =
          await transactionsQuery;

        if (transactionsError) {
          console.error(
            "Error fetching transactions for selected date:",
            transactionsError.message
          );
          showErrorToast("Gagal memuat transaksi untuk tanggal yang dipilih.");
        } else {
          (transactionsData || []).forEach((transaction: TransactionForPeriod) => {
            const student = studentsMap.get(transaction.student_id);
            if (student) {
              if (transaction.type === "deposit") {
                student.period_deposits += transaction.amount;
              } else {
                student.period_withdrawals += transaction.amount;
              }
            }
          });
        }
      }

      let studentsToDisplay = Array.from(studentsMap.values());

      if (selectedDate) {
        // Filter out students with no activity on the selected date
        studentsToDisplay = studentsToDisplay.filter(
          (student) => student.period_deposits > 0 || student.period_withdrawals > 0
        );
      }

      const finalStudentsData = studentsToDisplay.sort((a, b) => {
        if (a.class !== b.class) return a.class.localeCompare(b.class);
        return a.student_name.localeCompare(b.student_name);
      });

      setStudents(finalStudentsData);

      // Calculate totals for the current filtered view
      let totalDep = 0;
      let totalWith = 0;
      let totalOverall = 0;

      finalStudentsData.forEach((student) => {
        totalDep += student.period_deposits;
        totalWith += student.period_withdrawals;
        totalOverall += Math.max(0, student.overall_current_balance);
      });

      setTotalPeriodDeposits(totalDep);
      setTotalPeriodWithdrawals(totalWith);
      setTotalOverallBalance(totalOverall);

      setLoading(false);
    };

    fetchStudentsAndBalances();
  }, [session, selectedDate, searchTerm, refetchTrigger]);

  return {
    students,
    loading,
    error,
    refetch,
    totalPeriodDeposits,
    totalPeriodWithdrawals,
    totalOverallBalance,
  };
}