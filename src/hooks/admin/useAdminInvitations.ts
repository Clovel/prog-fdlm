'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminInvitationDto } from 'db/queries/admin/listInvitations';
import type { CreateInvitationInput } from 'validation/invitation';

/* Constants ------------------------------------------- */
const INVITATIONS_KEY = ['admin', 'invitations'] as const;

/* Fetchers -------------------------------------------- */
const readMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => ({})) as { message?: string };
  return body.message ?? fallback;
};

const fetchInvitations = async (): Promise<AdminInvitationDto[]> => {
  const res = await fetch('/api/admin/invitations', { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load invitations: ${res.status}`);
  }
  const body = await res.json() as { invitations: AdminInvitationDto[] };
  return body.invitations;
};

const postInvitation = async (input: CreateInvitationInput): Promise<void> => {
  const res = await fetch('/api/admin/invitations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Invitation échouée (${res.status})`));
  }
};

const resendInvitationRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/invitations/${id}/resend`, { method: 'POST' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Renvoi échoué (${res.status})`));
  }
};

const revokeInvitationRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/invitations/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Révocation échouée (${res.status})`));
  }
};

/* Hooks ----------------------------------------------- */
export const useInvitationsQuery = (): UseQueryResult<AdminInvitationDto[], Error> => {
  return useQuery({ queryKey: INVITATIONS_KEY, queryFn: fetchInvitations });
};

export const useCreateInvitation = (): UseMutationResult<void, Error, CreateInvitationInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postInvitation,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};

export const useResendInvitation = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resendInvitationRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};

export const useRevokeInvitation = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: revokeInvitationRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: INVITATIONS_KEY }); },
  });
};
