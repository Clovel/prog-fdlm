'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Switch } from 'components/ui/switch';
import ConfirmDialog from 'components/admin/ConfirmDialog';
import EditionFormDialog from './EditionFormDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery, useUpdateEdition, useDeleteEdition } from 'hooks/admin/useEditions';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';

/* EditionsTable component prop types ------------------ */
interface EditionsTableProps {
  canManage: boolean;
}

/* EditionsTable component ----------------------------- */
const EditionsTable: React.FC<EditionsTableProps> = ({ canManage }) => {
  const editionsQuery = useEditionsQuery();
  const updateMutation = useUpdateEdition();
  const deleteMutation = useDeleteEdition();

  const [editing, setEditing] = useState<AdminEditionDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminEditionDto | undefined>(undefined);

  const togglePublish = (edition: AdminEditionDto, next: boolean): void => {
    updateMutation.mutate(
      {
        id: edition.id,
        input: {
          description: edition.description ?? undefined,
          dayOfFestival: edition.dayOfFestival,
          isPublished: next,
        },
      },
      {
        onSuccess: (): void => { toast.success(next ? 'Édition publiée.' : 'Édition dépubliée.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => {
        toast.success(`Édition ${target.year} supprimée.`);
        setDeleting(undefined);
      },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  if(editionsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(editionsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les éditions.</p>;
  }

  const editions: AdminEditionDto[] = editionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Année</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Publiée</TableHead>
            <TableHead>Événements</TableHead>
            <TableHead>Alertes</TableHead>
            {canManage && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {
            editions.map((edition) => (
              <TableRow key={edition.id}>
                <TableCell className="font-medium">{edition.year}</TableCell>
                <TableCell>{edition.dayOfFestival}</TableCell>
                <TableCell>
                  {
                    canManage
                      ? (
                        <Switch
                          checked={edition.isPublished}
                          onCheckedChange={(v): void => togglePublish(edition, v)}
                          aria-label="Publier"
                        />
                      )
                      : <Badge variant={edition.isPublished ? 'default' : 'secondary'}>{edition.isPublished ? 'Oui' : 'Non'}</Badge>
                  }
                </TableCell>
                <TableCell>{edition.eventCount}</TableCell>
                <TableCell>{edition.alertCount}</TableCell>
                {
                  canManage &&
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(): void => { setEditing(edition); setEditOpen(true); }}
                        >
                          Modifier
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(): void => setDeleting(edition)}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                }
              </TableRow>
            ))
          }
        </TableBody>
      </Table>

      {
        canManage &&
          <EditionFormDialog
            open={editOpen}
            onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
            edition={editing}
          />
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title={`Supprimer l'édition ${deleting?.year ?? ''} ?`}
            description={
              <span>
                {`Cette action supprimera définitivement l'édition ainsi que ${deleting?.eventCount ?? 0} événement(s) et ${deleting?.alertCount ?? 0} alerte(s).`}
              </span>
            }
            confirmPhrase={String(deleting?.year ?? '')}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export EditionsTable component ---------------------- */
export default EditionsTable;
