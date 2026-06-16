import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/axios';

export function useScanCheck() {
  const router = useRouter();

  const scanMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const formData = new FormData();
      const filename = imageUri.split('/').pop() || 'receipt.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      formData.append('image', {
        uri: imageUri,
        name: filename,
        type,
      } as any);

      const res = await apiClient.post('/ai/scan', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      router.push({
        pathname: '/modals/add-expense' as any,
        params: {
          amount: data.amount,
          category: data.category,
          note: data.note,
          items: JSON.stringify(data.items || []),
        },
      });
    },
  });

  return {
    scanReceipt: scanMutation.mutateAsync,
    isScanning: scanMutation.isPending,
    scanError: scanMutation.error,
  };
}
