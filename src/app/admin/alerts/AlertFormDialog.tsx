'use client';

/* Framework imports ----------------------------------- */
import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
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
import { Switch } from 'components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import MarkdownInput from 'components/MarkdownInput/MarkdownInput';

/* Module imports (project) ---------------------------- */
import { updateGeneralAlertSchema } from 'validation/generalAlert';
import { useCreateAlert, useUpdateAlert } from 'hooks/admin/useAdminAlerts';

/* Type imports ---------------------------------------- */
import type { AdminAlertDto } from 'db/queries/admin/listEditionAlerts';

/* AlertFormDialog component prop types ---------------- */
interface AlertFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  /** Present = edit mode. */
  alert?: AdminAlertDto;
}

interface AlertFormValues {
  variant: 'default' | 'destructive' | 'warning' | 'success';
  title: string;
  content: string;
  isPublished: boolean;
}

/* AlertFormDialog component --------------------------- */
const AlertFormDialog: React.FC<AlertFormDialogProps> = (
  {
    open,
    onOpenChange,
    editionId,
    alert,
  },
) => {
  const isEdit: boolean = alert !== undefined;
  const createMutation = useCreateAlert();
  const updateMutation = useUpdateAlert();

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(updateGeneralAlertSchema) as never,
    defaultValues: {
      variant: alert?.variant ?? 'warning',
      title: alert?.title ?? '',
      content: alert?.content ?? '',
      isPublished: alert?.isPublished ?? false,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          variant: alert?.variant ?? 'warning',
          title: alert?.title ?? '',
          content: alert?.content ?? '',
          isPublished: alert?.isPublished ?? false,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, alert],
  );

  const onSubmit = (values: AlertFormValues): void => {
    const input = {
      variant: values.variant,
      title: values.title.length > 0 ? values.title : undefined,
      content: values.content,
      isPublished: values.isPublished,
    };
    if(isEdit && alert !== undefined) {
      updateMutation.mutate(
        { id: alert.id, input },
        {
          onSuccess: (): void => { toast.success('Alerte mise à jour.'); onOpenChange(false); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...input, editionId },
      {
        onSuccess: (): void => { toast.success('Alerte créée.'); onOpenChange(false); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'alerte' : 'Nouvelle alerte'}</DialogTitle>
          <DialogDescription>Le contenu accepte le Markdown (liens, gras…).</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Type</Label>
            <Controller
              control={form.control}
              name="variant"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="title">Titre (optionnel)</Label>
            <Input id="title" {...form.register('title')} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="content">Contenu (Markdown)</Label>
            <Controller
              control={form.control}
              name="content"
              render={({ field }): React.ReactElement => (
                <MarkdownInput
                  id="content"
                  value={field.value}
                  onChange={field.onChange}
                  maxLength={2000}
                  minHeight={160}
                  invalid={form.formState.errors.content !== undefined}
                />
              )}
            />
            {
              form.formState.errors.content !== undefined &&
                <p className="text-sm text-destructive">Contenu requis.</p>
            }
          </div>
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="isPublished"
              render={({ field }): React.ReactElement => (
                <Switch id="isPublished" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="isPublished">Publiée (visible sur le site public)</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export AlertFormDialog component -------------------- */
export default AlertFormDialog;
