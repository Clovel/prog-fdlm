'use client';

/* Framework imports ----------------------------------- */
import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* ResetPasswordForm component ------------------------- */
const ResetPasswordForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token: string | null = searchParams.get('token');

  const [password, setPassword] = useState<string>('');
  const [confirm, setConfirm] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    if(token === null || token.length === 0) {
      setError('Lien invalide ou expiré.');
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
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    if(resetError !== null && resetError !== undefined) {
      setError('Lien invalide ou expiré. Veuillez recommencer.');
      setSubmitting(false);
      return;
    }
    router.push('/login?reset=1');
  };

  if(token === null || token.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Lien invalide</h1>
        <p className="text-sm text-muted-foreground">Ce lien de réinitialisation est invalide ou a expiré.</p>
        <Link
          href="/forgot-password"
          className="text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
        >
          Demander un nouveau lien
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e): void => { void handleSubmit(e); }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Nouveau mot de passe</h1>
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
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Enregistrement…' : 'Réinitialiser'}
      </Button>
    </form>
  );
};

/* ResetPasswordPage component prop types -------------- */
interface ResetPasswordPageProps {}

/* ResetPasswordPage component ------------------------- */
const ResetPasswordPage: React.FC<ResetPasswordPageProps> = () => {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
};

/* Export ResetPasswordPage component ------------------ */
export default ResetPasswordPage;
