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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

/* Module imports (project) ---------------------------- */
import { createInvitationSchema } from 'validation/invitation';
import { useCreateInvitation } from 'hooks/admin/useAdminInvitations';

/* Type imports ---------------------------------------- */
import type { CreateInvitationInput } from 'validation/invitation';

/* InviteUserDialog component prop types --------------- */
interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* InviteUserDialog component -------------------------- */
const DEFAULTS: CreateInvitationInput = {
  email: '',
  role: 'viewer',
  firstName: undefined,
  lastName: undefined,
};

const InviteUserDialog: React.FC<InviteUserDialogProps> = ({ open, onOpenChange }) => {
  const createMutation = useCreateInvitation();

  const form = useForm<CreateInvitationInput>({
    resolver: zodResolver(createInvitationSchema) as never,
    defaultValues: DEFAULTS,
  });

  useEffect(
    () => {
      if(open) {
        form.reset(DEFAULTS);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open],
  );

  const onSubmit = (values: CreateInvitationInput): void => {
    const input: CreateInvitationInput = {
      email: values.email,
      role: values.role,
      firstName: values.firstName !== undefined && values.firstName.length > 0 ? values.firstName : undefined,
      lastName: values.lastName !== undefined && values.lastName.length > 0 ? values.lastName : undefined,
    };
    createMutation.mutate(input, {
      onSuccess: (): void => { toast.success('Invitation envoyée.'); onOpenChange(false); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const pending: boolean = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
          <DialogDescription>Un e-mail avec un lien valable 24 heures sera envoyé.</DialogDescription>
        </DialogHeader>
        <form onSubmit={(e): void => { void form.handleSubmit(onSubmit)(e); }} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" {...form.register('email')} />
            {
              form.formState.errors.email !== undefined &&
                <p className="text-sm text-destructive">E-mail invalide.</p>
            }
          </div>
          <div className="flex gap-3">
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="firstName">Prénom (optionnel)</Label>
              <Input id="firstName" {...form.register('firstName')} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="lastName">Nom (optionnel)</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Rôle</Label>
            <Controller
              control={form.control}
              name="role"
              render={({ field }): React.ReactElement => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="editor">Éditeur</SelectItem>
                    <SelectItem value="viewer">Lecteur</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Envoi…' : 'Inviter'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export InviteUserDialog component ------------------- */
export default InviteUserDialog;
