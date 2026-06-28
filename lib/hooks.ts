import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateFriendlyInput, CreateTournamentInput, Match } from "@/lib/domain";
import { registerGoal as domainRegisterGoal } from "@/lib/domain";
import type { UpdateGroupInput } from "./data-client";
import { dataClient } from "./data-client-switch";

export function useCurrentPlayerId() {
  return useQuery({
    queryKey: ["current-player-id"],
    queryFn: () => dataClient.getCurrentPlayerId(),
  });
}

export function useGroups() {
  return useQuery({
    queryKey: ["groups"],
    queryFn: () => dataClient.getGroups(),
  });
}

export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ["group", groupId],
    queryFn: () => dataClient.getCurrentGroup(groupId),
  });
}

export function usePlayers(groupId?: string) {
  return useQuery({
    queryKey: groupId ? ["players", groupId] : ["players"],
    queryFn: () => dataClient.getPlayers(groupId),
  });
}

export function useMatches(groupId: string) {
  return useQuery({
    queryKey: ["matches", groupId],
    queryFn: () => dataClient.getMatches(groupId),
  });
}

export function useLiveMatch(groupId: string) {
  return useQuery({
    queryKey: ["live-match", groupId],
    queryFn: () => dataClient.getLiveMatch(groupId).then((match) => match ?? null),
  });
}

export function useMatch(matchId: string) {
  return useQuery({
    queryKey: ["match", matchId],
    queryFn: () => dataClient.getMatch(matchId).then((match) => match ?? null),
  });
}

export function useRanking(groupId: string) {
  return useQuery({
    queryKey: ["ranking", groupId],
    queryFn: () => dataClient.getRanking(groupId),
  });
}

export function usePairStats(groupId: string) {
  return useQuery({
    queryKey: ["pair-stats", groupId],
    queryFn: () => dataClient.getPairStats(groupId),
  });
}

export function useTournaments(groupId: string) {
  return useQuery({
    queryKey: ["tournaments", groupId],
    queryFn: () => dataClient.getTournaments(groupId),
  });
}

export function useTournament(tournamentId: string) {
  return useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => dataClient.getTournament(tournamentId).then((tournament) => tournament ?? null),
  });
}

export function useCreateFriendly() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFriendlyInput) => dataClient.createFriendly(input),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["live-match", match.groupId],
      });
    },
  });
}

export function useRegisterGoal(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playerId, ownGoal = false }: { playerId: string; ownGoal?: boolean }) =>
      dataClient.registerGoal(matchId, playerId, ownGoal),
    onMutate: async (variables: { playerId: string; ownGoal?: boolean }) => {
      await queryClient.cancelQueries({ queryKey: ["match", matchId] });
      const previousMatch = queryClient.getQueryData<Match>(["match", matchId]);

      if (previousMatch) {
        try {
          // Optimistic update: apply the goal client-side immediately so UI reflects
          // the score change with near-zero latency (<1s requirement for TDD fix).
          const optimistic = domainRegisterGoal(
            previousMatch,
            variables.playerId,
            new Date(),
            variables.ownGoal,
          );
          queryClient.setQueryData(["match", matchId], optimistic);
        } catch {
          // Do not apply optimistic if domain rules reject it (e.g. time expired)
        }
      }

      return { previousMatch };
    },
    onError: (_err: unknown, _variables: unknown, context?: { previousMatch?: Match }) => {
      if (context?.previousMatch) {
        queryClient.setQueryData(["match", matchId], context.previousMatch);
      }
    },
    onSuccess: (match: Match) => {
      queryClient.setQueryData(["match", matchId], match);
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ranking", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["pair-stats", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["live-match", match.groupId],
      });
      if (match.tournamentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tournament", match.tournamentId],
        });
      }
    },
  });
}

export function useUndoGoal(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goalId: string) => dataClient.undoGoal(matchId, goalId),
    onSuccess: (match) => {
      queryClient.setQueryData(["match", matchId], match);
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ranking", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["pair-stats", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["live-match", match.groupId],
      });
      if (match.tournamentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tournament", match.tournamentId],
        });
      }
    },
  });
}

export function useFinishMatch(matchId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => dataClient.finishMatch(matchId),
    onSuccess: (match) => {
      queryClient.setQueryData(["match", matchId], match);
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["ranking", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["pair-stats", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["live-match", match.groupId],
      });
      if (match.tournamentId) {
        void queryClient.invalidateQueries({
          queryKey: ["tournament", match.tournamentId],
        });
      }
    },
  });
}

export function useCreateTournament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTournamentInput) => dataClient.createTournament(input),
    onSuccess: (tournament) => {
      void queryClient.invalidateQueries({
        queryKey: ["tournaments", tournament.groupId],
      });
    },
  });
}

export function useStartTournamentMatch(tournamentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (matchupId: string) => dataClient.startTournamentMatch(tournamentId, matchupId),
    onSuccess: (match) => {
      void queryClient.invalidateQueries({
        queryKey: ["tournament", tournamentId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["matches", match.groupId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["live-match", match.groupId],
      });
    },
  });
}

export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateGroupInput) => dataClient.updateGroup(groupId, patch),
    onSuccess: (group) => {
      queryClient.setQueryData(["group", groupId], group);
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });
}
