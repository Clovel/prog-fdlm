'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import SortableList from '../SortableList';

/* Type imports ---------------------------------------- */
import type { Control, UseFormRegister } from 'react-hook-form';
import type { EventFormValues } from 'validation/event';

/* EmbedsSection component prop types ------------------ */
interface EmbedsSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* EmbedsSection component ----------------------------- */
const EmbedsSection: React.FC<EmbedsSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'embedLinks' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Intégrations (embeds)</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ platform: 'instagram', url: '' })}>
          Ajouter un embed
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex flex-col gap-1">
              <Label>Plateforme</Label>
              <Controller
                control={control}
                name={`embedLinks.${index}.platform`}
                render={({ field }): React.ReactElement => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <Label htmlFor={`embedLinks.${index}.url`}>URL</Label>
              <Input id={`embedLinks.${index}.url`} type="url" {...register(`embedLinks.${index}.url`)} />
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

/* Export EmbedsSection component ---------------------- */
export default EmbedsSection;
