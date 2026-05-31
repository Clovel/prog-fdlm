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
import EmbedFormDialog from './EmbedFormDialog';

/* Module imports (project) ---------------------------- */
import { useEmbedsQuery, useUpdateEmbed, useDeleteEmbed, useReorderEmbeds } from 'hooks/admin/useAdminEmbeds';

/* Type imports ---------------------------------------- */
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';

/* EmbedsTable component prop types -------------------- */
interface EmbedsTableProps {
  editionId: string;
}

/* Helpers --------------------------------------------- */
const platformLabel = (p: AdminEditionEmbedDto['platform']): string => (p === 'facebook' ? 'Facebook' : 'Instagram');

const arrayMove = <T,>(items: T[], from: number, to: number): T[] => {
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  if(moved !== undefined) {
    next.splice(to, 0, moved);
  }
  return next;
};

/* EmbedsTable component ------------------------------- */
const EmbedsTable: React.FC<EmbedsTableProps> = ({ editionId }) => {
  const embedsQuery = useEmbedsQuery(editionId);
  const updateMutation = useUpdateEmbed();
  const deleteMutation = useDeleteEmbed();
  const reorderMutation = useReorderEmbeds();

  const [editing, setEditing] = useState<AdminEditionEmbedDto | undefined>(undefined);
  const [editOpen, setEditOpen] = useState<boolean>(false);
  const [deleting, setDeleting] = useState<AdminEditionEmbedDto | undefined>(undefined);

  const togglePublish = (embed: AdminEditionEmbedDto, next: boolean): void => {
    updateMutation.mutate(
      { id: embed.id, input: { platform: embed.platform, url: embed.url, isPublished: next } },
      {
        onSuccess: (): void => { toast.success(next ? 'Embed publié.' : 'Embed dépublié.'); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const onReorder = (from: number, to: number): void => {
    const reordered = arrayMove(embeds, from, to);
    reorderMutation.mutate(
      { editionId, orderedIds: reordered.map((e) => e.id) },
      { onError: (error): void => { toast.error(error.message); } },
    );
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Embed supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); setDeleting(undefined); },
    });
  };

  if(embedsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(embedsQuery.isError) {
    return <p className="text-destructive">Impossible de charger les embeds.</p>;
  }

  const embeds: AdminEditionEmbedDto[] = embedsQuery.data ?? [];
  if(embeds.length === 0) {
    return <p className="text-muted-foreground">Aucun embed pour cette édition.</p>;
  }

  const renderRowContent = (embed: AdminEditionEmbedDto): React.ReactNode => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="secondary">{platformLabel(embed.platform)}</Badge>
      <a
        href={embed.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 min-w-0 truncate text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        {embed.url}
      </a>
      <div className="flex items-center gap-2">
        <Switch
          checked={embed.isPublished}
          onCheckedChange={(v): void => togglePublish(embed, v)}
          aria-label="Publier"
        />
        <Button variant="outline" size="sm" onClick={(): void => { setEditing(embed); setEditOpen(true); }}>
          Modifier
        </Button>
        <Button variant="destructive" size="sm" onClick={(): void => setDeleting(embed)}>
          Supprimer
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <SortableList
        ids={embeds.map((e) => e.id)}
        onReorder={onReorder}
        renderRow={(index): React.ReactNode => {
          const e = embeds[index];
          if(e === undefined) { return null; }
          return renderRowContent(e);
        }}
      />

      <EmbedFormDialog
        open={editOpen}
        onOpenChange={(o): void => { setEditOpen(o); if(!o) { setEditing(undefined); } }}
        editionId={editionId}
        embed={editing}
      />

      <ConfirmDialog
        open={deleting !== undefined}
        onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
        title="Supprimer cet embed ?"
        description={<span>Cette action est définitive.</span>}
        confirmLabel="Supprimer"
        pending={deleteMutation.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

/* Export EmbedsTable component ------------------------ */
export default EmbedsTable;
