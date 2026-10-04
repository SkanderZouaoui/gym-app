import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: string;
  stock: number;
}

export interface ProductReservation {
  id: string;
  quantity: number;
  status: 'PENDING' | 'READY' | 'COLLECTED' | 'CANCELLED';
  product: Product;
}

export function useProducts(branchId: string | undefined) {
  return useQuery({
    queryKey: ['shop', 'products', branchId],
    queryFn: () => apiRequest<Product[]>(`/v1/shop/products?branchId=${branchId}`),
    enabled: !!branchId,
  });
}

export function useMyReservations() {
  return useQuery({
    queryKey: ['me', 'reservations'],
    queryFn: () => apiRequest<ProductReservation[]>('/v1/me/reservations'),
  });
}

export function useReserveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiRequest('/v1/shop/reservations', { method: 'POST', body: { productId, quantity: 1 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'reservations'] });
    },
  });
}

export function useCancelReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest(`/v1/shop/reservations/${id}/cancel`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop', 'products'] });
      queryClient.invalidateQueries({ queryKey: ['me', 'reservations'] });
    },
  });
}
