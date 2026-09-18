import { useQuery } from '@tanstack/react-query';
import api from '../lib/axios.js';

export default function useAppFeatures() {
  return useQuery({
    queryKey: ['app-features'],
    queryFn: () => api.get('/health').then((r) => r.data.features),
    staleTime: 60_000,
  });
}
