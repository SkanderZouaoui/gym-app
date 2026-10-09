import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';

export interface Payment {
  id: string;
  membershipId: string;
  branchId: string;
  amount: string;
  method: PaymentMethod;
  recordedAt: string;
  reference: string | null;
  membership: {
    user: { firstName: string; lastName: string };
    plan: { name: string };
  };
}

export function usePayments(branchId: string | undefined) {
  return useQuery({
    queryKey: ['payments', branchId],
    queryFn: () => apiRequest<Payment[]>(`/v1/payments?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export interface CreatePaymentInput {
  membershipId: string;
  branchId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => apiRequest('/v1/payments', { method: 'POST', body: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments', variables.branchId] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
