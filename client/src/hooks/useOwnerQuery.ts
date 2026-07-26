/**
 * useOwnerQuery — wraps a tRPC query to only fire once the user is authenticated.
 * Prevents UNAUTHORIZED errors on the published site where the session cookie
 * needs a moment to be validated before data queries fire.
 */
import { useAuth } from "@/_core/hooks/useAuth";

/**
 * Returns `{ enabled: boolean }` — pass this as the `enabled` option to any
 * tRPC useQuery call so it only fires after auth is confirmed.
 *
 * Usage:
 *   const { enabled } = useAuthEnabled();
 *   const { data } = trpc.trips.upcoming.useQuery(undefined, { ...enabled });
 */
export function useAuthEnabled() {
  const { isAuthenticated, loading } = useAuth();
  return { enabled: isAuthenticated && !loading };
}
