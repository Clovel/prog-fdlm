'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { AdminEventSummary } from 'db/queries/admin/listEditionEventsAdmin';
import type { AdminEventDetail } from 'db/queries/admin/getEventForEdit';
import type { CreateEventInput, UpdateEventInput } from 'validation/event';

/* Fetchers -------------------------------------------- */
const fetchEvents = async (editionId: string): Promise<AdminEventSummary[]> => {
  const res = await fetch(`/api/admin/events?editionId=${editionId}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load events: ${res.status}`);
  }
  const body = await res.json() as { events: AdminEventSummary[] };
  return body.events;
};

const fetchEvent = async (id: string): Promise<AdminEventDetail> => {
  const res = await fetch(`/api/admin/events/${id}`, { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load event: ${res.status}`);
  }
  const body = await res.json() as { event: AdminEventDetail };
  return body.event;
};

const postEvent = async (input: CreateEventInput): Promise<string> => {
  const res = await fetch('/api/admin/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string };
    throw new Error(body.message ?? `Création échouée (${res.status})`);
  }
  const body = await res.json() as { id: string };
  return body.id;
};

const patchEvent = async (vars: { id: string; input: UpdateEventInput }): Promise<void> => {
  const res = await fetch(`/api/admin/events/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(`Mise à jour échouée (${res.status})`);
  }
};

const deleteEventRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/events/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(`Suppression échouée (${res.status})`);
  }
};

/* Hooks ----------------------------------------------- */
export const useEventsQuery = (editionId: string | null): UseQueryResult<AdminEventSummary[], Error> => {
  return useQuery({
    queryKey: ['admin', 'events', editionId],
    queryFn: (): Promise<AdminEventSummary[]> => {
      if(editionId === null) {
        throw new Error('no edition');
      }
      return fetchEvents(editionId);
    },
    enabled: editionId !== null,
  });
};

export const useEventQuery = (id: string | null): UseQueryResult<AdminEventDetail, Error> => {
  return useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: (): Promise<AdminEventDetail> => {
      if(id === null) {
        throw new Error('no event id');
      }
      return fetchEvent(id);
    },
    enabled: id !== null,
  });
};

export const useCreateEvent = (): UseMutationResult<string, Error, CreateEventInput> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postEvent,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
};

export const useUpdateEvent = (): UseMutationResult<void, Error, { id: string; input: UpdateEventInput }> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchEvent,
    onSuccess: (_data, vars): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'event', vars.id] });
    },
  });
};

export const useDeleteEvent = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEventRequest,
    onSuccess: (): void => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
  });
};
