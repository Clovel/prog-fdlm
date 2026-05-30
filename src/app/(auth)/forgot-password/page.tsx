'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import Link from 'next/link';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* ForgotPasswordPage component prop types ------------- */
interface ForgotPasswordPageProps {}

/* ForgotPasswordPage component ------------------------ */
const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = () => {
  const [email, setEmail] = useState<string>('');
  const [sent, setSent] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    const origin: string = window.location.origin;
    await authClient.requestPasswordReset({
      email,
      redirectTo: `${origin}/reset-password`,
    });
    setSent(true);
    setSubmitting(false);
  };

  if(sent) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-semibold">Vérifiez vos emails</h1>
        <p className="text-sm text-muted-foreground">
          Si un compte existe pour cette adresse, un email de réinitialisation a été envoyé.
        </p>
        <Link
          href="/login"
          className="text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
        >
          Retour à la connexion
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e): void => { void handleSubmit(e); }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Mot de passe oublié</h1>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e): void => setEmail(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Envoi…' : 'Envoyer le lien'}
      </Button>
      <Link
        href="/login"
        className="text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        Retour à la connexion
      </Link>
    </form>
  );
};

/* Export ForgotPasswordPage component ----------------- */
export default ForgotPasswordPage;
