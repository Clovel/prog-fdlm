'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';
import { useTopFavorites } from 'hooks/admin/useTopFavorites';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';

/* TopFavoritesCard component prop types --------------- */
interface TopFavoritesCardProps {}

/* TopFavoritesCard component -------------------------- */
const TopFavoritesCard: React.FC<TopFavoritesCardProps> = () => {
  const editionsQuery = useEditionsQuery();

  const editions: AdminEditionDto[] = editionsQuery.data ?? [];
  let current: AdminEditionDto | undefined = undefined;
  for(const ed of editions) {
    if(ed.isPublished && (current === undefined || ed.year > current.year)) {
      current = ed;
    }
  }
  const year: number | null = current?.year ?? null;

  const topQuery = useTopFavorites(year, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {year !== null ? `Top favoris — ${year}` : 'Top favoris'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {
          year === null
            ? <p className="text-muted-foreground">Aucune édition publiée.</p>
            : topQuery.isLoading
              ? <p className="text-muted-foreground">Chargement…</p>
              : topQuery.isError
                ? <p className="text-destructive">Impossible de charger le top favoris.</p>
                : (topQuery.data ?? []).length === 0
                  ? <p className="text-muted-foreground">Aucun favori pour le moment.</p>
                  : (
                    <ol className="flex flex-col gap-2">
                      {
                        (topQuery.data ?? []).map((event, index) => (
                          <li key={event.id} className="flex items-center justify-between gap-3">
                            <span className="truncate">
                              {`${index + 1}. ${event.name ?? '(sans nom)'}`}
                            </span>
                            <span className="tabular-nums font-semibold shrink-0">{event.favoriteCount}</span>
                          </li>
                        ))
                      }
                    </ol>
                  )
        }
      </CardContent>
    </Card>
  );
};

/* Export TopFavoritesCard component ------------------- */
export default TopFavoritesCard;
