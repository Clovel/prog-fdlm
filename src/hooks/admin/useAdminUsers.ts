'use client';

/* Module imports -------------------------------------- */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/* Type imports ---------------------------------------- */
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import type { AdminUserDto } from 'db/queries/admin/listUsers';
import type { CreateUserInput, UpdateRoleInput } from 'validation/user';

/* Constants ------------------------------------------- */
const USERS_KEY = ['admin', 'users'] as const;

/* Fetchers -------------------------------------------- */
const readMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => ({})) as { message?: string };
  return body.message ?? fallback;
};

const fetchUsers = async (): Promise<AdminUserDto[]> => {
  const res = await fetch('/api/admin/users', { cache: 'no-store' });
  if(!res.ok) {
    throw new Error(`Failed to load users: ${res.status}`);
  }
  const body = await res.json() as { users: AdminUserDto[] };
  return body.users;
};

const postUser = async (input: CreateUserInput): Promise<void> => {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Création échouée (${res.status})`));
  }
};

const patchRole = async (vars: { id: string; input: UpdateRoleInput }): Promise<void> => {
  const res = await fetch(`/api/admin/users/${vars.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vars.input),
  });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Mise à jour échouée (${res.status})`));
  }
};

const deleteUserRequest = async (id: string): Promise<void> => {
  const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
  if(!res.ok) {
    throw new Error(await readMessage(res, `Suppression échouée (${res.status})`));
  }
};

/* Hooks ----------------------------------------------- */
export const useUsersQuery = (): UseQueryResult<AdminUserDto[], Error> => {
  return useQuery({ queryKey: USERS_KEY, queryFn: fetchUsers });
};

export const useCreateUser = (): UseMutationResult<void, Error, CreateUserInput> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postUser,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};

export const useUpdateUserRole = (): UseMutationResult<void, Error, { id: string; input: UpdateRoleInput }> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: patchRole,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};

export const useDeleteUser = (): UseMutationResult<void, Error, string> => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteUserRequest,
    onSuccess: (): void => { void qc.invalidateQueries({ queryKey: USERS_KEY }); },
  });
};
