import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export type PaymentMethod = 'CASH' | 'TRANSFER' | 'CHECK' | 'OTHER';

export interface Payment {
  id: string;
  membershipId: string;
  amount: string;
  method: PaymentMethod;
  recordedAt: string;
  reference: string | null;
  membership: {
    user: { firstName: string; lastName: string };
    plan: { name: string };
  };
}

export function usePayments() {
  return useQuery({
    queryKey: ['payments'],
    queryFn: () => apiRequest<Payment[]>('/v1/payments'),
  });
}

export interface CreatePaymentInput {
  membershipId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

export function useCreatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => apiRequest('/v1/payments', { method: 'POST', body: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
  });
}
