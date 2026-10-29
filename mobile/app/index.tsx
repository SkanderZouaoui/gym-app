import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/store/session';
import { rootRouteForRole } from '../src/navigation/roleRoutes';

export default function Index() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const activeRole = useSessionStore((s) => s.activeRole);
  const mustChangePassword = useSessionStore((s) => s.user?.mustChangePassword);

  if (!isAuthenticated || !activeRole) {
    return <Redirect href="/(auth)/login" />;
  }
  if (mustChangePassword) return <Redirect href="/force-password" />;
  return <Redirect href={rootRouteForRole(activeRole) as any} />;
}
