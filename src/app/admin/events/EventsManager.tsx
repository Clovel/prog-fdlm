'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Badge } from 'components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from 'components/ui/table';
import ConfirmDialog from 'components/admin/ConfirmDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';
import { useEventsQuery, useDeleteEvent } from 'hooks/admin/useAdminEvents';
import { toParisInput } from 'lib/festivalTime';

/* Type imports ---------------------------------------- */
import type { AdminEventSummary } from 'db/queries/admin/listEditionEventsAdmin';

/* EventsManager component prop types ------------------ */
interface EventsManagerProps {
  canManage: boolean;
}

/* EventsManager component ----------------------------- */
const EventsManager: React.FC<EventsManagerProps> = ({ canManage }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEdition = searchParams.get('edition');

  const editionsQuery = useEditionsQuery();
  const [editionId, setEditionId] = useState<string | null>(urlEdition);
  const [filter, setFilter] = useState<string>('');
  const [deleting, setDeleting] = useState<AdminEventSummary | undefined>(undefined);

  useEffect(
    () => {
      if(editionId === null && editionsQuery.data !== undefined && editionsQuery.data.length > 0) {
        const latest = editionsQuery.data[0];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditionId(latest.id);
        router.replace(`/admin/events?edition=${latest.id}`);
      }
    },
    [editionId, editionsQuery.data, router],
  );

  const eventsQuery = useEventsQuery(editionId);
  const deleteMutation = useDeleteEvent();

  const onEditionChange = (value: string): void => {
    setEditionId(value);
    router.replace(`/admin/events?edition=${value}`);
  };

  const confirmDelete = (): void => {
    if(deleting === undefined) {
      return;
    }
    const target = deleting;
    deleteMutation.mutate(target.id, {
      onSuccess: (): void => { toast.success('Événement supprimé.'); setDeleting(undefined); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const events: AdminEventSummary[] = eventsQuery.data ?? [];
  const filtered = filter.length > 0
    ? events.filter((e) => (e.name ?? '').toLowerCase().includes(filter.toLowerCase()))
    : events;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">
          {
            eventsQuery.data !== undefined && (
              <>
                <span className="text-muted-foreground">
                  ({eventsQuery.data.length})
                </span>
                {' '}
              </>
            )
          }
          Événements
        </h1>
        {
          canManage && editionId !== null &&
            <Button asChild>
              <Link href={`/admin/events/new?edition=${editionId}`}>Nouvel événement</Link>
            </Button>
        }
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={editionId ?? undefined} onValueChange={onEditionChange}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Édition" /></SelectTrigger>
          <SelectContent>
            {(editionsQuery.data ?? []).map((ed) => (
              <SelectItem key={ed.id} value={ed.id}>{`${ed.year}${ed.isPublished ? '' : ' (brouillon)'}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={filter}
          onChange={(e): void => setFilter(e.target.value)}
          placeholder="Filtrer par nom…"
          className="w-64"
        />
      </div>

      {
        eventsQuery.isLoading
          ? <p className="text-muted-foreground">Chargement…</p>
          : eventsQuery.isError
            ? <p className="text-destructive">Impossible de charger les événements.</p>
            : filtered.length < 1 ?
            <p className="text-muted-foreground">Aucun événement trouvé.</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Début</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>L/E/A</TableHead>
                    <TableHead>Favoris</TableHead>
                    {canManage && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {
                    filtered.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="font-medium">{ev.name ?? '(sans nom)'}</TableCell>
                        <TableCell>{toParisInput(new Date(ev.startTime)).replace('T', ' ')}</TableCell>
                        <TableCell>{ev.category ?? '—'}</TableCell>
                        <TableCell>{ev.status !== null ? <Badge variant="secondary">{ev.status}</Badge> : '—'}</TableCell>
                        <TableCell>{`${ev.linkCount}/${ev.embedCount}/${ev.alertCount}`}</TableCell>
                        <TableCell className="tabular-nums">{ev.favoriteCount}</TableCell>
                        {
                          canManage &&
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={`/admin/events/${ev.id}`}>Modifier</Link>
                                </Button>
                                <Button variant="destructive" size="sm" onClick={(): void => setDeleting(ev)}>
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
            )
      }

      {
        canManage &&
          <ConfirmDialog
            open={deleting !== undefined}
            onOpenChange={(o): void => { if(!o) { setDeleting(undefined); } }}
            title={`Supprimer l'événement « ${deleting?.name ?? ''} » ?`}
            description={<span>Cette action est définitive et supprime aussi ses liens, embeds et alertes.</span>}
            confirmLabel="Supprimer"
            pending={deleteMutation.isPending}
            onConfirm={confirmDelete}
          />
      }
    </div>
  );
};

/* Export EventsManager component ---------------------- */
export default EventsManager;
