'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useInvitationsQuery, useResendInvitation, useRevokeInvitation } from 'hooks/admin/useAdminInvitations';

/* Type imports ---------------------------------------- */
import type { AdminInvitationDto } from 'db/queries/admin/listInvitations';

/* Helpers --------------------------------------------- */
const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('fr-FR');

const roleLabel = (role: AdminInvitationDto['role']): string => {
  if(role === 'admin') { return 'Administrateur'; }
  if(role === 'editor') { return 'Éditeur'; }
  return 'Lecteur';
};

const statusBadge = (inv: AdminInvitationDto): React.ReactNode => {
  if(inv.status === 'revoked') {
    return <Badge variant="secondary">Révoquée</Badge>;
  }
  if(inv.isExpired) {
    return <Badge variant="secondary">Expirée</Badge>;
  }
  return <Badge variant="default">En attente</Badge>;
};

/* InvitationsTable component -------------------------- */
const InvitationsTable: React.FC = () => {
  const invitationsQuery = useInvitationsQuery();
  const resend = useResendInvitation();
  const revoke = useRevokeInvitation();

  const [revoking, setRevoking] = useState<AdminInvitationDto | undefined>(undefined);

  const onResend = (inv: AdminInvitationDto): void => {
    resend.mutate(inv.id, {
      onSuccess: (): void => { toast.success('Invitation renvoyée.'); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const confirmRevoke = (): void => {
    if(revoking === undefined) {
      return;
    }
    const target = revoking;
    revoke.mutate(target.id, {
      onSuccess: (): void => { toast.success('Invitation révoquée.'); setRevoking(undefined); },
      onError: (error): void => { toast.error(error.message); setRevoking(undefined); },
    });
  };

  if(invitationsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(invitationsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les invitations.</p>;
  }

  const invitations: AdminInvitationDto[] = invitationsQuery.data ?? [];
  if(invitations.length === 0) {
    return <p className="text-muted-foreground">Aucune invitation en attente.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-muted-foreground">
              <th className="py-2 pr-3 font-medium">E-mail</th>
              <th className="py-2 pr-3 font-medium">Rôle</th>
              <th className="py-2 pr-3 font-medium">Statut</th>
              <th className="py-2 pr-3 font-medium">Expire le</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {invitations.map((inv) => {
              const actionable: boolean = inv.status === 'pending';
              return (
                <tr key={inv.id} className="border-b border-border">
                  <td className="py-2 pr-3">{inv.email}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{roleLabel(inv.role)}</td>
                  <td className="py-2 pr-3">{statusBadge(inv)}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{formatDate(inv.expiresAt)}</td>
                  <td className="py-2 text-right">
                    {
                      actionable &&
                        <span className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" disabled={resend.isPending} onClick={(): void => onResend(inv)}>
                            Renvoyer
                          </Button>
                          <Button variant="destructive" size="sm" onClick={(): void => setRevoking(inv)}>
                            Révoquer
                          </Button>
                        </span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={revoking !== undefined}
        onOpenChange={(o): void => { if(!o) { setRevoking(undefined); } }}
        title="Révoquer cette invitation ?"
        description={<span>Le lien d'invitation cessera de fonctionner.</span>}
        confirmLabel="Révoquer"
        pending={revoke.isPending}
        onConfirm={confirmRevoke}
      />
    </div>
  );
};

/* Export InvitationsTable component ------------------- */
export default InvitationsTable;
