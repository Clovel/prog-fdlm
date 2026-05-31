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

/* Module imports (project) ---------------------------- */
import { updateEditionEmbedSchema } from 'validation/editionEmbed';
import { useCreateEmbed, useUpdateEmbed } from 'hooks/admin/useAdminEmbeds';

/* Type imports ---------------------------------------- */
import type { AdminEditionEmbedDto } from 'db/queries/admin/listEditionEmbeds';

/* EmbedFormDialog component prop types ---------------- */
interface EmbedFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editionId: string;
  /** Present = edit mode. */
  embed?: AdminEditionEmbedDto;
}

interface EmbedFormValues {
  platform: 'instagram' | 'facebook';
  url: string;
  isPublished: boolean;
}

/* EmbedFormDialog component --------------------------- */
const EmbedFormDialog: React.FC<EmbedFormDialogProps> = (
  {
    open,
    onOpenChange,
    editionId,
    embed,
  },
) => {
  const isEdit: boolean = embed !== undefined;
  const createMutation = useCreateEmbed();
  const updateMutation = useUpdateEmbed();

  const form = useForm<EmbedFormValues>({
    resolver: zodResolver(updateEditionEmbedSchema) as never,
    defaultValues: {
      platform: embed?.platform ?? 'instagram',
      url: embed?.url ?? '',
      isPublished: embed?.isPublished ?? true,
    },
  });

  useEffect(
    () => {
      if(open) {
        form.reset({
          platform: embed?.platform ?? 'instagram',
          url: embed?.url ?? '',
          isPublished: embed?.isPublished ?? true,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, embed],
  );

  const onSubmit = (values: EmbedFormValues): void => {
    if(isEdit && embed !== undefined) {
      updateMutation.mutate(
        { id: embed.id, input: values },
        {
          onSuccess: (): void => { toast.success('Embed mis à jour.'); onOpenChange(false); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...values, editionId },
      {
        onSuccess: (): void => { toast.success('Embed créé.'); onOpenChange(false); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'embed' : 'Nouvel embed'}</DialogTitle>
          <DialogDescription>{'Collez l\'URL d\'une publication Instagram ou Facebook.'}</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label>Plateforme</Label>
            <Controller
              control={form.control}
              name="platform"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="url">URL</Label>
            <Input id="url" {...form.register('url')} />
            {
              form.formState.errors.url !== undefined &&
                <p className="text-sm text-destructive">URL invalide.</p>
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
            <Label htmlFor="isPublished">Publié (visible sur le site public)</Label>
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

/* Export EmbedFormDialog component -------------------- */
export default EmbedFormDialog;
