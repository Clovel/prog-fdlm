'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useUsersQuery, useUpdateUserRole, useDeleteUser } from 'hooks/admin/useAdminUsers';

/* Type imports ---------------------------------------- */
import type { AdminUserDto } from 'db/queries/admin/listUsers';
import type { Role } from 'auth/roles';

/* Helpers --------------------------------------------- */
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR');

/* UsersTable component -------------------------------- */
const UsersTable: React.FC = () => {
  const usersQuery = useUsersQuery();
  const updateRole = useUpdateUserRole();
  const deleteUser = useDeleteUser();

  const [deleting, setDeleting] = useState<AdminUserDto | undefined>(undefined);

  const onRoleChange = (userRow: AdminUserDto, role: Role): void => {
    if(role === userRow.role) {
      return;
    }
    updateRole.mutate(
      { id: userRow.id, input: { role } },
      {
        onSuccess: (): void => { toast.success('Rôle mis à jour.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteUser.mutate(target.id, {
      onSuccess: (): void => { toast.success('Utilisateur supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); setDeleting(undefined); },
    });
  };

  if(usersQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(usersQuery.isError) {
    return <p className="text-destructive">Impossible de charger les utilisateurs.</p>;
  }

  const users: AdminUserDto[] = usersQuery.data ?? [];
  if(users.length === 0) {
    return <p className="text-muted-foreground">Aucun utilisateur.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Nom</th>
              <th className="py-2 pr-3 font-medium">E-mail</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">Créé le</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border">
                <td className="py-2 pr-3">{`${u.firstName} ${u.lastName}`}</td>
                <td className="py-2 pr-3 text-muted-foreground">{u.email}</td>
                <td className="py-2 pr-3">
                  <Select value={u.role} onValueChange={(v): void => onRoleChange(u, v as Role)}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrateur</SelectItem>
                      <SelectItem value="editor">Éditeur</SelectItem>
                      <SelectItem value="viewer">Lecteur</SelectItem>
                    </SelectContent>
                  </Select>
                </td>
                <td className="py-2 pr-3 text-muted-foreground">{formatDate(u.createdAt)}</td>
                <td className="py-2 text-right">
                  <Button variant="destructive" size="sm" onClick={(): void => setDeleting(u)}>Supprimer</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
        title="Supprimer cet utilisateur ?"
        description={<span>Cette action est définitive et supprime ses sessions.</span>}
        confirmLabel="Supprimer"
        pending={deleteUser.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

/* Export UsersTable component ------------------------- */
export default UsersTable;
