import { useQuery } from '@tanstack/react-query';
import { eduApi } from '@/services/api';
import type { AppSettings } from '@/services/api';

const SETTINGS_STALE_TIME = 1000 * 60 * 30; // 30 minutes

export function useAppSettings() {
  const query = useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: () => eduApi.getSettings(),
    staleTime: SETTINGS_STALE_TIME,
    retry: 2,
  });

  const settings = query.data ?? {};

  return {
    settings,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,

    razorpayKey: (settings.razorpayKeyId ?? settings.razorpayKey ?? '') as string,
    aiApiKey: (settings.aiApiKey ?? '') as string,
    premiumPrice: (settings.premiumPrice ?? null) as number | null,
    premiumCurrency: (settings.premiumCurrency ?? 'INR') as string,
    paymentGateway: (settings.paymentGateway ?? 'razorpay') as string,
    appName: (settings.appName ?? 'EduLearn') as string,
  };
}
