import {
  EXERCISE_LIST,
  computeStats,
  recommendExercise,
  weeklyActivity,
  type DogProfile,
  type DogStats,
  type Exercise,
  type TrainingRecord,
} from "@alphadog/core";
import { useQuery } from "@tanstack/react-query";
import { listDogs } from "../../data/dogs";
import { listSessions } from "../../data/sessions";

/**
 * Tudo que as telas precisam saber sobre o cão atual.
 *
 * Um hook só, e não um por tela: dashboard, histórico e perfil leem os mesmos
 * dados, e três hooks separados fariam três requests para as mesmas linhas. O
 * React Query desduplica por chave.
 *
 * MVP: um cão por tutor. Quando houver troca de cão, o id vem do estado em vez
 * do primeiro da lista — e só este arquivo muda.
 */
export function useDogData() {
  const dogs = useQuery({ queryKey: ["dogs"], queryFn: listDogs });
  const dog: DogProfile | undefined = dogs.data?.[0];

  const sessions = useQuery({
    queryKey: ["sessions", dog?.id],
    queryFn: () => listSessions(dog!.id),
    enabled: !!dog,
  });

  const records: TrainingRecord[] = sessions.data ?? [];
  const stats: DogStats = computeStats(records);

  const recommendedId = recommendExercise(
    stats,
    EXERCISE_LIST.map((e) => e.id),
  );
  const recommended: Exercise | undefined = EXERCISE_LIST.find((e) => e.id === recommendedId);

  return {
    dog,
    sessions: records,
    stats,
    weekly: weeklyActivity(records),
    recommended,
    // Só é loading enquanto não há nada para mostrar. Refetch com dados em cache
    // não deve piscar a tela inteira.
    isLoading: dogs.isLoading || (!!dog && sessions.isLoading && records.length === 0),
    error: dogs.error ?? sessions.error,
    refetch: () => {
      void dogs.refetch();
      void sessions.refetch();
    },
    isRefetching: dogs.isRefetching || sessions.isRefetching,
  };
}
