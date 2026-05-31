'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/* Component imports ----------------------------------- */
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Button } from 'components/ui/button';
import EmbedsTable from './EmbedsTable';
import EmbedFormDialog from './EmbedFormDialog';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';

/* EmbedsManager component ----------------------------- */
const EmbedsManager: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlEdition = searchParams.get('edition');

  const editionsQuery = useEditionsQuery();
  const [editionId, setEditionId] = useState<string | null>(urlEdition);
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  useEffect(
    () => {
      if(editionId === null && editionsQuery.data !== undefined && editionsQuery.data.length > 0) {
        const latest = editionsQuery.data[0];
        if(latest !== undefined) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEditionId(latest.id);
          router.replace(`/admin/embeds?edition=${latest.id}`);
        }
      }
    },
    [editionId, editionsQuery.data, router],
  );

  const onEditionChange = (value: string): void => {
    setEditionId(value);
    router.replace(`/admin/embeds?edition=${value}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Réseaux</h1>
        {
          editionId !== null &&
            <Button onClick={(): void => setCreateOpen(true)}>Nouvel embed</Button>
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
      </div>

      {
        editionId !== null
          ? <EmbedsTable editionId={editionId} />
          : <p className="text-muted-foreground">Sélectionnez une édition.</p>
      }

      {
        editionId !== null &&
          <EmbedFormDialog open={createOpen} onOpenChange={setCreateOpen} editionId={editionId} />
      }
    </div>
  );
};

/* Export EmbedsManager component ---------------------- */
export default EmbedsManager;
