import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useExpenseStore, Activity } from '@/stores/expenseStore';
import { useEffect } from 'react';

export function useExpenses() {
  const queryClient = useQueryClient();
  const setTotal = useExpenseStore((s) => s.setTotal);
  const setActivities = useExpenseStore((s) => s.setActivities);

  const expensesQuery = useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const res = await apiClient.get<{ total: number; expenses: Activity[] }>('/expenses');
      return res.data;
    },
  });

  const expensesData = expensesQuery.data;

  useEffect(() => {
    if (expensesData) {
      setTotal(expensesData.total || 0);
      setActivities(expensesData.expenses || []);
    }
  }, [expensesData, setTotal, setActivities]);

  const addExpenseMutation = useMutation({
    mutationFn: async (expense: any) => {
      const res = await apiClient.post('/expenses', expense);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });

  return {
    expenses: expensesData?.expenses || [],
    totalExpenses: expensesData?.total || 0,
    isLoading: expensesQuery.isLoading,
    isError: expensesQuery.isError,
    error: expensesQuery.error,
    refetch: expensesQuery.refetch,

    addExpense: addExpenseMutation.mutateAsync,
    isAddingExpense: addExpenseMutation.isPending,
    addExpenseError: addExpenseMutation.error,
  };
}
