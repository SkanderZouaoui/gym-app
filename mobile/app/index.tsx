import { Redirect } from 'expo-router';
import { useSessionStore } from '../src/store/session';
import { rootRouteForRole } from '../src/navigation/roleRoutes';

export default function Index() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const activeRole = useSessionStore((s) => s.activeRole);

  if (!isAuthenticated || !activeRole) {
    return <Redirect href="/(auth)/login" />;
  }
  return <Redirect href={rootRouteForRole(activeRole) as any} />;
}
