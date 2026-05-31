'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* Type imports ---------------------------------------- */
import type { Role } from 'auth/roles';

/* AcceptInviteForm component prop types --------------- */
interface AcceptInviteFormProps {
  token: string;
  email: string;
  role: Role;
  initialFirstName: string;
  initialLastName: string;
}

/* Helpers --------------------------------------------- */
const roleLabel = (role: Role): string => {
  if(role === 'admin') { return 'Administrateur'; }
  if(role === 'editor') { return 'Éditeur'; }
  return 'Lecteur';
};

/* AcceptInviteForm component -------------------------- */
const AcceptInviteForm: React.FC<AcceptInviteFormProps> = (
  { token, email, role, initialFirstName, initialLastName },
) => {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>(initialFirstName);
  const [lastName, setLastName] = useState<string>(initialLastName);
  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if(firstName.trim().length === 0 || lastName.trim().length === 0) {
      setError('Veuillez renseigner votre prénom et votre nom.');
      return;
    }
    if(password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères.');
      return;
    }
    if(password !== confirm) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setSubmitting(true);
    const res = await fetch('/api/invitations/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, firstName: firstName.trim(), lastName: lastName.trim(), password }),
    });
    if(!res.ok) {
      const body = await res.json().catch(() => ({})) as { message?: string };
      setError(body.message ?? 'Impossible de créer le compte. Le lien a peut-être expiré.');
      setSubmitting(false);
      return;
    }
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if(signInError !== null && signInError !== undefined) {
      router.push('/login?created=1');
      return;
    }
    router.push('/admin');
  };

  return (
    <form
      onSubmit={(e): void => { void handleSubmit(e); }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Rejoindre la Fête de la Musique</h1>
      <p className="text-sm text-muted-foreground">
        Ce site recense les concerts et événements de la Fête de la Musique à Bordeaux. Vous avez été invité·e
        à participer à sa gestion en tant que <strong>{roleLabel(role)}</strong>. Créez votre compte pour commencer.
      </p>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" value={email} readOnly disabled />
      </div>
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" required value={firstName} onChange={(e): void => setFirstName(e.target.value)} />
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" required value={lastName} onChange={(e): void => setLastName(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e): void => setPassword(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Confirmer le mot de passe</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e): void => setConfirm(e.target.value)}
        />
      </div>

      {
        error !== null &&
          <p className="text-sm text-destructive">{error}</p>
      }

      <Button type="submit" disabled={submitting}>{submitting ? 'Création…' : 'Créer mon compte'}</Button>
    </form>
  );
};

/* Export AcceptInviteForm component ------------------- */
export default AcceptInviteForm;
