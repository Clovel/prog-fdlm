'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import SortableList from '../SortableList';

/* Type imports ---------------------------------------- */
import type { Control, UseFormRegister } from 'react-hook-form';
import type { EventFormValues } from 'validation/event';

/* LinksSection component prop types ------------------- */
interface LinksSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* LinksSection component ------------------------------ */
const LinksSection: React.FC<LinksSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'links' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Liens</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ url: '', label: '' })}>
          Ajouter un lien
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`links.${index}.label`}>Libellé</Label>
              <Input id={`links.${index}.label`} {...register(`links.${index}.label`)} />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`links.${index}.url`}>URL</Label>
              <Input id={`links.${index}.url`} type="url" {...register(`links.${index}.url`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={(): void => remove(index)}>
              Retirer
            </Button>
          </div>
        )}
      />
    </section>
  );
};

/* Export LinksSection component ----------------------- */
export default LinksSection;
