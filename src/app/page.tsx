/* Framework imports ----------------------------------- */
import React from 'react';
import { redirect } from 'next/navigation';
import { desc } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import { editions } from 'db/schema';

/* RootPage component ---------------------------------- */
const RootPage = async (): Promise<React.ReactElement> => {
  const rows = await db
    .select({ year: editions.year })
    .from(editions)
    .orderBy(desc(editions.year))
    .limit(1);

  const latest = rows[0];
  if(latest === undefined) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-8 text-center">
        <h1 className="text-2xl font-semibold pb-4">
          Aucune édition disponible
        </h1>
        <p className="text-muted-foreground">
          {'Aucune édition de la Fête de la musique n\'est encore enregistrée.'}
        </p>
      </div>
    );
  }

  redirect(`/${latest.year}`);
};

/* Export RootPage component --------------------------- */
export default RootPage;
