'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';

/* Constants ------------------------------------------- */
const EDITIONS_KEY = ['admin', 'editions'] as const;

/* Fetchers -------------------------------------------- */
const fetchEditions = async (): Promise<AdminEditionDto[]> => {
  const response = await fetch('/api/admin/editions', { cache: 'no-store' });
  if(!response.ok) {
    throw new Error(`Failed to load editions: ${response.status}`);
  }
  const body = await response.json() as { editions: AdminEditionDto[] };
  return body.editions;
};

const postEdition = async (input: CreateEditionInput): Promise<void> => {
  const response = await fetch('/api/admin/editions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!response.ok) {
    const body = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Création échouée (${response.status})`);
  }
};

const patchEdition = async (vars: { id: string; input: UpdateEditionInput }): Promise<void> => {
  const response = await fetch(`/api/admin/editions/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!response.ok) {
    throw new Error(`Mise à jour échouée (${response.status})`);
  }
};

const deleteEditionRequest = async (id: string): Promise<void> => {
  const response = await fetch(`/api/admin/editions/${id}`, { method: 'DELETE' });
  if(!response.ok) {
    throw new Error(`Suppression échouée (${response.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEditionsQuery = (): UseQueryResult<AdminEditionDto[], Error> => {
  return useQuery({ queryKey: EDITIONS_KEY, queryFn: fetchEditions });
};

export const useCreateEdition = (): UseMutationResult<void, Error, CreateEditionInput> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEdition,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};

export const useUpdateEdition = (): UseMutationResult<void, Error, { id: string; input: UpdateEditionInput }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchEdition,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};

export const useDeleteEdition = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEditionRequest,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: EDITIONS_KEY });
    },
  });
};
