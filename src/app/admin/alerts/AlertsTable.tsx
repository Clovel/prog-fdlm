'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Switch } from 'components/ui/switch';
import ConfirmDialog from 'components/admin/ConfirmDialog';
import SortableList from 'app/admin/events/SortableList';
import AlertFormDialog from './AlertFormDialog';

/* Module imports (project) ---------------------------- */
import { useAlertsQuery, useUpdateAlert, useDeleteAlert, useReorderAlerts } from 'hooks/admin/useAdminAlerts';

/* Type imports ---------------------------------------- */
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';

/* AlertsTable component prop types -------------------- */
interface AlertsTableProps {
  editionId: string;
  canManage: boolean;
}

/* Helpers --------------------------------------------- */
const variantLabel = (v: AdminAlertDto['variant']): string => {
  if(v === 'destructive') { return 'Erreur'; }
  if(v === 'warning') { return 'Avertissement'; }
  if(v === 'success') { return 'Succès'; }
  return 'Info';
};

const arrayMove = <T,>(items: T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if(moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
};

/* AlertsTable component ------------------------------- */
const AlertsTable: React.FC<AlertsTableProps> = ({ editionId, canManage }) => {
  const alertsQuery = useAlertsQuery(editionId);
  const updateMutation = useUpdateAlert();
  const deleteMutation = useDeleteAlert();
  const reorderMutation = useReorderAlerts();

  const [editing, setEditing] = useState<AdminAlertDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminAlertDto | undefined>(undefined);

  const togglePublish = (alert: AdminAlertDto, next: boolean): void => {
    updateMutation.mutate(
      {
        id: alert.id,
        input: {
          variant: alert.variant,
          title: alert.title ?? undefined,
          content: alert.content,
          isPublished: next,
        },
      },
      {
        onSuccess: (): void => { toast.success(next ? 'Alerte publiée.' : 'Alerte dépubliée.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const onReorder = (from: number, to: number): void => {
    const reordered = arrayMove(alerts, from, to);
    reorderMutation.mutate(
      { editionId, orderedIds: reordered.map((a) => a.id) },
      { onError: (error): void => { toast.error(error.message); } },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Alerte supprimée.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  if(alertsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(alertsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les alertes.</p>;
  }

  const alerts: AdminAlertDto[] = alertsQuery.data ?? [];
  if(alerts.length === 0) {
    return <p className="text-muted-foreground">Aucune alerte pour cette édition.</p>;
  }

  const renderRowContent = (alert: AdminAlertDto): React.ReactNode => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="secondary">{variantLabel(alert.variant)}</Badge>
      <div className="flex-1 min-w-0">
        {
          alert.title !== null &&
            <span className="font-medium">{alert.title} </span>
        }
        <span className="text-sm text-muted-foreground">
          {alert.content.length > 80 ? `${alert.content.slice(0, 80)}…` : alert.content}
        </span>
      </div>
      {
        canManage
          ? (
            <div className="flex items-center gap-2">
              <Switch
                checked={alert.isPublished}
                onCheckedChange={(v): void => togglePublish(alert, v)}
                aria-label="Publier"
              />
              <Button variant="outline" size="sm" onClick={(): void => { setEditing(alert); setEditOpen(true); }}>
                Modifier
              </Button>
              <Button variant="destructive" size="sm" onClick={(): void => setDeleting(alert)}>
                Supprimer
              </Button>
            </div>
          )
          : <Badge variant={alert.isPublished ? 'default' : 'secondary'}>{alert.isPublished ? 'Publiée' : 'Brouillon'}</Badge>
      }
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {
        canManage
          ? (
            <SortableList
              ids={alerts.map((a) => a.id)}
              onReorder={onReorder}
              renderRow={(index): React.ReactNode => {
                const a = alerts[index];
                if(a === undefined) { return null; }
                return renderRowContent(a);
              }}
            />
          )
          : (
            <div className="flex flex-col gap-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-border p-3">
                  {renderRowContent(alert)}
                </div>
              ))}
            </div>
          )
      }

      {
        canManage &&
          <AlertFormDialog
            open={editOpen}
            onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
            editionId={editionId}
            alert={editing}
          />
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title="Supprimer cette alerte ?"
            description={<span>Cette action est définitive.</span>}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export AlertsTable component ------------------------ */
export default AlertsTable;
