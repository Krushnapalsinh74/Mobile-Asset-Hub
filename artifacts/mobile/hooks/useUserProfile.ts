import { useQuery } from '@tanstack/react-query';
import { localApi } from '@/services/api';
import type { UserProfile } from '@/services/api';

export function useUserProfile() {
  const query = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: () => localApi.getProfile(),
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
