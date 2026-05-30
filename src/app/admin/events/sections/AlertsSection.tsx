'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useFieldArray, Controller } from 'react-hook-form';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Textarea } from 'components/ui/textarea';
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

/* AlertsSection component prop types ------------------ */
interface AlertsSectionProps {
  control: Control<EventFormValues>;
  register: UseFormRegister<EventFormValues>;
}

/* AlertsSection component ----------------------------- */
const AlertsSection: React.FC<AlertsSectionProps> = ({ control, register }) => {
  const { fields, append, remove, move } = useFieldArray({ control, name: 'alerts' });

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Alertes</h3>
        <Button type="button" variant="outline" size="sm" onClick={(): void => append({ variant: 'warning', title: '', content: '' })}>
          Ajouter une alerte
        </Button>
      </div>
      <SortableList
        ids={fields.map((f) => f.id)}
        onReorder={move}
        renderRow={(index): React.ReactNode => (
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="flex flex-col gap-1">
                <Label>Type</Label>
                <Controller
                  control={control}
                  name={`alerts.${index}.variant`}
                  render={({ field }): React.ReactElement => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Info</SelectItem>
                        <SelectItem value="warning">Avertissement</SelectItem>
                        <SelectItem value="destructive">Erreur</SelectItem>
                        <SelectItem value="success">Succès</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <Label htmlFor={`alerts.${index}.title`}>Titre (optionnel)</Label>
                <Input id={`alerts.${index}.title`} {...register(`alerts.${index}.title`)} />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`alerts.${index}.content`}>Contenu</Label>
              <Textarea id={`alerts.${index}.content`} rows={2} {...register(`alerts.${index}.content`)} />
            </div>
            <Button type="button" variant="ghost" size="sm" className="self-end" onClick={(): void => remove(index)}>
              Retirer
            </Button>
          </div>
        )}
      />
    </section>
  );
};

/* Export AlertsSection component ---------------------- */
export default AlertsSection;
