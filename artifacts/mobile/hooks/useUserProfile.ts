import { useQuery } from '@tanstack/react-query';
import { localApi } from '@/services/api';
import type { UserProfile } from '@/services/api';

export function useUserProfile(email?: string | null) {
  const query = useQuery<UserProfile>({
    queryKey: ['user-profile', email ?? ''],
    queryFn: () => {
      if (!email) return Promise.reject(new Error('no email'));
      return localApi.getProfile(email);
    },
    enabled: !!email,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  return {
    profile: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
