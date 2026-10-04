import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/store/session';

export default function Index() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  return <Redirect href={isAuthenticated ? '/(member)' : '/(auth)/login'} />;
}
