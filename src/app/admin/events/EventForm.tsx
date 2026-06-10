'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import TagsInput from './TagsInput';
import LinksSection from './sections/LinksSection';
import EmbedsSection from './sections/EmbedsSection';
import AlertsSection from './sections/AlertsSection';

/* Module imports (project) ---------------------------- */
import { eventFormSchema } from 'validation/event';
import { eventCategories } from 'types/eventCategories';
import { parisInputToUtc } from 'lib/festivalTime';
import { useCreateEvent, useUpdateEvent } from 'hooks/admin/useAdminEvents';

/* Type imports ---------------------------------------- */
import type { EventFormValues } from 'validation/event';

/* EventForm component prop types ---------------------- */
interface EventFormProps {
  editionId: string;
  editionYear: number;
  /** Present = edit mode. */
  eventId?: string;
  initialValues: EventFormValues;
}

/* Helpers --------------------------------------------- */
const toApiTimes = (values: EventFormValues): { startTime: string; endTime: string | null } => ({
  startTime: parisInputToUtc(values.startTime).toISOString(),
  endTime: (values.endTime === undefined || values.endTime === '')
    ? null
    : parisInputToUtc(values.endTime).toISOString(),
});

/* EventForm component --------------------------------- */
const EventForm: React.FC<EventFormProps> = (
  {
    editionId,
    editionYear,
    eventId,
    initialValues,
  },
) => {
  const router = useRouter();
  const isEdit: boolean = eventId !== undefined;
  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema) as never,
    defaultValues: initialValues,
  });

  const onSubmit = (values: EventFormValues): void => {
    const times = toApiTimes(values);
    const shared = {
      name: values.name,
      description: values.description,
      category: values.category,
      status: values.status,
      genres: values.genres,
      artists: values.artists,
      priceText: values.priceText,
      locationName: values.locationName,
      locationAddress: values.locationAddress,
      links: values.links,
      embedLinks: values.embedLinks,
      alerts: values.alerts,
      ...times,
    };
    if(isEdit && eventId !== undefined) {
      updateMutation.mutate(
        { id: eventId, input: shared },
        {
          onSuccess: (): void => { toast.success('Événement mis à jour.'); router.push(`/admin/events?edition=${editionId}`); },
          onError: (error): void => { toast.error(error.message); },
        },
      );
      return;
    }
    createMutation.mutate(
      { ...shared, editionId },
      {
        onSuccess: (): void => { toast.success('Événement créé.'); router.push(`/admin/events?edition=${editionId}`); },
        onError: (error): void => { toast.error(error.message); },
      },
    );
  };

  const pending: boolean = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="w-full flex flex-col gap-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEdit ? 'Modifier l\'événement' : 'Nouvel événement'}</h1>
        <span className="text-sm text-muted-foreground">{`Édition ${editionYear}`}</span>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" {...form.register('name')} />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="locationName">Lieu</Label>
        <Input id="locationName" {...form.register('locationName')} />
        {
          form.formState.errors.locationName !== undefined &&
            <p className="text-sm text-destructive">Lieu requis.</p>
        }
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="locationAddress">Adresse (pour la carte)</Label>
        <Input id="locationAddress" {...form.register('locationAddress')} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="startTime">Début</Label>
          <Input id="startTime" type="datetime-local" {...form.register('startTime')} />
          {
            form.formState.errors.startTime !== undefined &&
              <p className="text-sm text-destructive">Début requis.</p>
          }
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label htmlFor="endTime">Fin (optionnelle)</Label>
          <Input id="endTime" type="datetime-local" {...form.register('endTime')} />
          {
            form.formState.errors.endTime !== undefined &&
              <p className="text-sm text-destructive">{form.formState.errors.endTime.message}</p>
          }
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="flex-1 flex flex-col gap-1">
          <Label>Catégorie</Label>
          <Controller
            control={form.control}
            name="category"
            render={({ field }): React.ReactElement => (
              <Select
                value={field.value ?? '__none__'}
                onValueChange={(v): void => field.onChange(v === '__none__' ? undefined : v)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {eventCategories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="flex-1 flex flex-col gap-1">
          <Label>Statut</Label>
          <Controller
            control={form.control}
            name="status"
            render={({ field }): React.ReactElement => (
              <Select
                value={field.value ?? '__none__'}
                onValueChange={(v): void => field.onChange(v === '__none__' ? undefined : v)}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  <SelectItem value="canceled">Annulé</SelectItem>
                  <SelectItem value="postponed">Reporté</SelectItem>
                  <SelectItem value="rescheduled">Reprogrammé</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="priceText">Tarif</Label>
        <Input id="priceText" {...form.register('priceText')} placeholder="Gratuit, 9€…" />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Genres</Label>
        <Controller
          control={form.control}
          name="genres"
          render={({ field }): React.ReactElement => (
            <TagsInput value={field.value} onChange={field.onChange} placeholder="Rock, Techno… (Entrée)" />
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label>Artistes</Label>
        <Controller
          control={form.control}
          name="artists"
          render={({ field }): React.ReactElement => (
            <TagsInput value={field.value} onChange={field.onChange} placeholder="Nom d'artiste… (Entrée)" />
          )}
        />
      </div>

      <div className="flex flex-col gap-1">
        <Label htmlFor="description">Description (Markdown)</Label>
        <Textarea id="description" rows={6} {...form.register('description')} />
      </div>

      <LinksSection control={form.control} register={form.register} />
      <EmbedsSection control={form.control} register={form.register} />
      <AlertsSection control={form.control} register={form.register} />

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={(): void => router.push(`/admin/events?edition=${editionId}`)}>
          Annuler
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Enregistrement…' : (isEdit ? 'Enregistrer' : 'Créer')}
        </Button>
      </div>
    </form>
  );
};

/* Export EventForm component -------------------------- */
export default EventForm;
