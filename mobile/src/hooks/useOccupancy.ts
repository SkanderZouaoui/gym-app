import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface BranchOccupancy {
  branchId: string;
  branchName: string;
  capacity: number | null;
  currentCount: number;
  percent: number | null;
  hourly: number[];
  updatedAt: string;
}

export function useBranchOccupancy(branchId: string | undefined) {
  return useQuery({
    queryKey: ['branches', branchId, 'occupancy'],
    queryFn: () => apiRequest<BranchOccupancy>(`/v1/branches/${branchId}/occupancy`),
    enabled: !!branchId,
    refetchInterval: 60_000,
  });
}
