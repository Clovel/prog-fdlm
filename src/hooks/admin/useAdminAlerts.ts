'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';
import type { CreateGeneralAlertInput, UpdateGeneralAlertInput } from 'validation/generalAlert';

/* Fetchers -------------------------------------------- */
const fetchAlerts = async (editionId: string): Promise<AdminAlertDto[]> => {
  const res = await fetch(`/api/admin/alerts?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load alerts: ${res.status}`);
  }
  const body = await res.json() as { alerts: AdminAlertDto[] };
  return body.alerts;
};

const postAlert = async (input: CreateGeneralAlertInput): Promise<void> => {
  const res = await fetch('/api/admin/alerts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(`Création échouée (${res.status})`);
  }
};

const patchAlert = async (vars: { id: string; input: UpdateGeneralAlertInput }): Promise<void> => {
  const res = await fetch(`/api/admin/alerts/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteAlertRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/alerts/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

const reorderAlertsRequest = async (vars: { editionId: string; orderedIds: string[] }): Promise<void> => {
  const res = await fetch('/api/admin/alerts/reorder', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars),
  });
  if(!res.ok) {
    throw new Error(`Réordonnancement échoué (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useAlertsQuery = (editionId: string | null): UseQueryResult<AdminAlertDto[], Error> => {
  return useQuery({
    queryKey: ['admin', 'alerts', editionId],
    queryFn: (): Promise<AdminAlertDto[]> => {
      if(editionId === null) {
        throw new Error('no edition');
      }
      return fetchAlerts(editionId);
    },
    enabled: editionId !== null,
  });
};

export const useCreateAlert = (): UseMutationResult<void, Error, CreateGeneralAlertInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postAlert,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useUpdateAlert = (): UseMutationResult<void, Error, { id: string; input: UpdateGeneralAlertInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchAlert,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useDeleteAlert = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteAlertRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};

export const useReorderAlerts = (): UseMutationResult<void, Error, { editionId: string; orderedIds: string[] }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reorderAlertsRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: ['admin', 'alerts'] }); },
  });
};
