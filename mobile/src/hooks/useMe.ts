import { useQuery } from '@tanstack/react-query';
import { meApi } from '../api/endpoints';

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: meApi.getMe });
}

export function useMyMemberships() {
  return useQuery({ queryKey: ['me', 'memberships'], queryFn: meApi.getMemberships });
}

export function useMyBookings() {
  return useQuery({ queryKey: ['me', 'bookings'], queryFn: meApi.getBookings });
}

export function useMyPoints() {
  return useQuery({ queryKey: ['me', 'points'], queryFn: meApi.getPoints });
}
