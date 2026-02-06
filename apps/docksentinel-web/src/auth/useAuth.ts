import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authMe } from "../api/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["auth", "me"],
    queryFn: authMe,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });

  const authenticated = !!meQuery.data?.authenticated;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
  }

  return {
    meQuery,
    authenticated,
    refresh,
  };
}
