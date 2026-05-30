'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import EditionsTable from './EditionsTable';
import EditionFormDialog from './EditionFormDialog';

/* EditionsManager component prop types ---------------- */
interface EditionsManagerProps {
  canManage: boolean;
}

/* EditionsManager component --------------------------- */
const EditionsManager: React.FC<EditionsManagerProps> = ({ canManage }) => {
  const [createOpen, setCreateOpen] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Éditions</h1>
        {
          canManage &&
            <Button onClick={(): void => setCreateOpen(true)}>Nouvelle édition</Button>
        }
      </div>
      <EditionsTable canManage={canManage} />
      {
        canManage &&
          <EditionFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      }
    </div>
  );
};

/* Export EditionsManager component -------------------- */
export default EditionsManager;
