import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';

export function useGroups() {
  const queryClient = useQueryClient();

  const groupsQuery = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const res = await apiClient.get<any[]>('/groups');
      return res.data;
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const res = await apiClient.post('/groups', groupData);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });

  return {
    groups: groupsQuery.data || [],
    isLoading: groupsQuery.isLoading,
    isError: groupsQuery.isError,
    error: groupsQuery.error,
    refetch: groupsQuery.refetch,

    createGroup: createGroupMutation.mutateAsync,
    isCreatingGroup: createGroupMutation.isPending,
    createGroupError: createGroupMutation.error,
  };
}
