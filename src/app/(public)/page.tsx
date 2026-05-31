/* Framework imports ----------------------------------- */
import React from 'react';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';

/* Module imports (project) ---------------------------- */
import { db } from 'db';
import { editions } from 'db/schema';

/* Component imports ----------------------------------- */
import { Disc3 } from 'lucide-react';

/* RootPage component ---------------------------------- */
const RootPage = async (): Promise<React.ReactElement> => {
  const rows = await db
    .select({ year: editions.year })
    .from(editions)
    .where(eq(editions.isPublished, true))
    .orderBy(desc(editions.year))
    .limit(1);

  const latest = rows[0];
  if(latest === undefined) {
    return (
      <div className="flex flex-col items-center justify-center w-full p-8 text-center gap-4">
        <Disc3
          className="size-20 text-muted-foreground"
          aria-hidden="true"
        />
        <h1 className="text-2xl font-semibold">
          Aucune édition disponible
        </h1>
        <p className="text-muted-foreground max-w-md">
          {'Aucune édition de la Fête de la musique n\'est encore enregistrée.'}
        </p>
      </div>
    );
  }

  redirect(`/${latest.year}`);
};

/* Export RootPage component --------------------------- */
export default RootPage;
