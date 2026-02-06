import { useQuery, useQueryClient } from "@tanstack/react-query";
import { me, type AuthMeResponse } from "../api/auth";

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery<AuthMeResponse>({
    queryKey: ["auth", "me"],
    queryFn: me,
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
