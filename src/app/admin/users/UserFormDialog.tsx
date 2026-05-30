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
import { createUserSchema } from 'validation/user';
import { useCreateUser } from 'hooks/admin/useAdminUsers';

/* Type imports ---------------------------------------- */
import type { CreateUserInput } from 'validation/user';

/* UserFormDialog component prop types ----------------- */
interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* UserFormDialog component ---------------------------- */
const DEFAULTS: CreateUserInput = {
  email: '',
  firstName: '',
  lastName: '',
  password: '',
  role: 'viewer',
  sendResetEmail: false,
};

const UserFormDialog: React.FC<UserFormDialogProps> = ({ open, onOpenChange }) => {
  const createMutation = useCreateUser();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as never,
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

  const onSubmit = (values: CreateUserInput): void => {
    createMutation.mutate(values, {
      onSuccess: (): void => { toast.success('Utilisateur créé.'); onOpenChange(false); },
      onError: (error): void => { toast.error(error.message); },
    });
  };

  const pending: boolean = createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvel utilisateur</DialogTitle>
          <DialogDescription>Crée un compte avec mot de passe initial.</DialogDescription>
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
              <Label htmlFor="firstName">Prénom</Label>
              <Input id="firstName" {...form.register('firstName')} />
            </div>
            <div className="flex flex-1 flex-col gap-1">
              <Label htmlFor="lastName">Nom</Label>
              <Input id="lastName" {...form.register('lastName')} />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="password">Mot de passe initial</Label>
            <Input id="password" type="text" {...form.register('password')} />
            {
              form.formState.errors.password !== undefined &&
                <p className="text-sm text-destructive">12 caractères minimum.</p>
            }
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
          <div className="flex items-center gap-3">
            <Controller
              control={form.control}
              name="sendResetEmail"
              render={({ field }): React.ReactElement => (
                <Switch id="sendResetEmail" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="sendResetEmail">Envoyer un e-mail de réinitialisation</Label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={(): void => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" disabled={pending}>{pending ? 'Création…' : 'Créer'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/* Export UserFormDialog component --------------------- */
export default UserFormDialog;
