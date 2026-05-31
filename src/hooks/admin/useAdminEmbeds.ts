'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';
import type { CreateEditionEmbedInput, UpdateEditionEmbedInput } from 'validation/editionEmbed';

/* Fetchers -------------------------------------------- */
const fetchEmbeds = async (editionId: string): Promise<AdminEditionEmbedDto[]> => {
  const res = await fetch(`/api/admin/embeds?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load embeds: ${res.status}`);
  }
  const body = await res.json() as { embeds: AdminEditionEmbedDto[] };
  return body.embeds;
};

const postEmbed = async (input: CreateEditionEmbedInput): Promise<void> => {
  const res = await fetch('/api/admin/embeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(`Création échouée (${res.status})`);
  }
};

const patchEmbed = async (vars: { id: string; input: UpdateEditionEmbedInput }): Promise<void> => {
  const res = await fetch(`/api/admin/embeds/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteEmbedRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/embeds/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

const reorderEmbedsRequest = async (vars: { editionId: string; orderedIds: string[] }): Promise<void> => {
  const res = await fetch('/api/admin/embeds/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if(!res.ok) {
    throw new Error(`Réordonnancement échoué (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEmbedsQuery = (editionId: string | null): UseQueryResult<AdminEditionEmbedDto[], Error> => {
  return useQuery({
    queryKey: ['admin', 'embeds', editionId],
    queryFn: (): Promise<AdminEditionEmbedDto[]> => {
      if(editionId === null) {
        throw new Error('no edition');
      }
      return fetchEmbeds(editionId);
    },
    enabled: editionId !== null,
  });
};

export const useCreateEmbed = (): UseMutationResult<void, Error, CreateEditionEmbedInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postEmbed,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useUpdateEmbed = (): UseMutationResult<void, Error, { id: string; input: UpdateEditionEmbedInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchEmbed,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useDeleteEmbed = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteEmbedRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};

export const useReorderEmbeds = (): UseMutationResult<void, Error, { editionId: string; orderedIds: string[] }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderEmbedsRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'embeds'] }); },
  });
};
