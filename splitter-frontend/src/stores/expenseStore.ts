import { create } from 'zustand';

export interface Activity {
  id: string;
  amount: number;
  category: string;
  note?: string | null;
  date: string;
  groupId?: string | null;
  groupName?: string | null;
}

interface ExpenseState {
  totalExpenses: number;
  recentActivities: Activity[];
  setTotal: (total: number) => void;
  setActivities: (activities: Activity[]) => void;
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  totalExpenses: 0,
  recentActivities: [],
  setTotal: (totalExpenses) => set({ totalExpenses }),
  setActivities: (recentActivities) => set({ recentActivities }),
}));
