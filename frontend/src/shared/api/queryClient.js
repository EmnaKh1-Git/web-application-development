import { QueryClient } from '@tanstack/react-query';

/**
 * Cache des données de l'API (TanStack Query).
 * - les données restent « fraîches » 30 s : revenir sur une page ne relance pas la requête ;
 * - une erreur réseau ou serveur (5xx) est retentée une fois, jamais une erreur 4xx.
 *
 * @example
 * const { data, isPending } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list });
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          failureCount < 1 && (error?.status === 0 || error?.status >= 500),
      },
    },
  });
}
