import { useQuery } from '@tanstack/react-query';
import { branchesApi } from '../api/endpoints';

export function useBranches() {
  return useQuery({ queryKey: ['branches'], queryFn: branchesApi.findAll });
}
