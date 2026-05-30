'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';

/* Component imports ----------------------------------- */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';
import { Textarea } from 'components/ui/textarea';
import { Switch } from 'components/ui/switch';

/* Module imports (project) ---------------------------- */
import { createEditionSchema, updateEditionSchema } from 'validation/edition';
import { useCreateEdition, useUpdateEdition } from 'hooks/admin/useEditions';

/* Type imports ---------------------------------------- */
import type { AdminEditionDto } from 'db/queries/admin/listAllEditions';
import type { CreateEditionInput, UpdateEditionInput } from 'validation/edition';

/* EditionFormDialog component prop types -------------- */
interface EditionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present = edit mode; absent = create mode. */
  edition?: AdminEditionDto;
}

interface EditionFormValues {
  year: number;
  description: string;
  dayOfFestival: string;
  isPublished: boolean;
}

/* EditionFormDialog component ------------------------- */
const EditionFormDialog: React.FC<EditionFormDialogProps> = (
  {
    open,
    onOpenChange,
    edition,
  },
) => {
  const isEdit: boolean = edition !== undefined;
  const createMutation = useCreateEdition();
  const updateMutation = useUpdateEdition();

  const form = useForm<EditionFormValues>({
    resolver: zodResolver(isEdit ? updateEditionSchema : createEditionSchema) as never,
    defaultValues: {
      year: edition?.year ?? new Date().getFullYear(),
      description: edition?.description ?? '',
      dayOfFestival: edition?.dayOfFestival ?? '',
      isPublished: edition?.isPublished ?? true,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          year: edition?.year ?? new Date().getFullYear(),
          description: edition?.description ?? '',
          dayOfFestival: edition?.dayOfFestival ?? '',
          isPublished: edition?.isPublished ?? true,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, edition],
  );

  const onSubmit = (values: EditionFormValues): void => {
    if(isEdit && edition !== undefined) {
      const input: UpdateEditionInput = {
        description: values.description.length > 0 ? values.description : undefined,
        dayOfFestival: values.dayOfFestival,
        isPublished: values.isPublished,
      };
      updateMutation.mutate(
        { id: edition.id, input },
        {
          onSuccess: (): void => {
            toast.success('Édition mise à jour.');
            onOpenChange(false);
          },
          onError: (error): void => {
            toast.error(error.message);
          },
        },
      );
      return;
    }
    const createInput: CreateEditionInput = {
      year: values.year,
      description: values.description.length > 0 ? values.description : undefined,
      dayOfFestival: values.dayOfFestival,
      isPublished: values.isPublished,
    };
    createMutation.mutate(createInput, {
      onSuccess: (): void => {
        toast.success('Édition créée.');
        onOpenChange(false);
      },
      onError: (error): void => {
        toast.error(error.message);
      },
    });
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;
  const isPublishedValue: boolean = useWatch({ control: form.control, name: 'isPublished' });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'édition' : 'Nouvelle édition'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'L\'année ne peut pas être modifiée.' : 'Choisissez l\'année et la date du festival.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="year">Année</Label>
            <Input
              id="year"
              type="number"
              disabled={isEdit}
              {...form.register('year', { valueAsNumber: true })}
            />
            {
              form.formState.errors.year !== undefined &&
                <p className="text-sm text-destructive">Année invalide (2000–2100).</p>
            }
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="dayOfFestival">Date du festival</Label>
            <Input id="dayOfFestival" type="date" {...form.register('dayOfFestival')} />
            {
              form.formState.errors.dayOfFestival !== undefined &&
                <p className="text-sm text-destructive">Date requise.</p>
            }
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Description (optionnelle)</Label>
            <Textarea id="description" rows={3} {...form.register('description')} />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id="isPublished"
              checked={isPublishedValue}
              onCheckedChange={(v): void => form.setValue('isPublished', v)}
            />
            <Label htmlFor="isPublished">Publiée (visible sur le site public)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export EditionFormDialog component ------------------ */
export default EditionFormDialog;
