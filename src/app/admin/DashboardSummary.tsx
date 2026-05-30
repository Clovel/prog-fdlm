'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';

/* Module imports (project) ---------------------------- */
import { useEditionsQuery } from 'hooks/admin/useEditions';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';

/* DashboardSummary component prop types --------------- */
interface DashboardSummaryProps {}

/* DashboardSummary component -------------------------- */
const DashboardSummary: React.FC<DashboardSummaryProps> = () => {
  const editionsQuery = useEditionsQuery();

  if(editionsQuery.isLoading) {
    return <p className="text-muted-foreground">Chargement…</p>;
  }
  if(editionsQuery.isError) {
    return <p className="text-destructive">Impossible de charger le résumé.</p>;
  }

  const editions: AdminEditionDto[] = editionsQuery.data ?? [];
  const published: AdminEditionDto[] = editions.filter((e) => e.isPublished);
  let current: AdminEditionDto | undefined = undefined;
  for(const e of published) {
    if(current === undefined || e.year > current.year) {
      current = e;
    }
  }
  const totalEvents: number = editions.reduce((sum, e) => sum + e.eventCount, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Éditions</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{`${editions.length} (${published.length} publiées)`}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Édition courante</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{current?.year ?? '—'}</CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">Événements (toutes éditions)</CardTitle></CardHeader>
        <CardContent className="text-2xl font-semibold">{totalEvents}</CardContent>
      </Card>
    </div>
  );
};

/* Export DashboardSummary component ------------------- */
export default DashboardSummary;
