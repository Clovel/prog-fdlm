'use client';

/* Framework imports ----------------------------------- */
import React, { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Label } from 'components/ui/label';

/* Module imports (project) ---------------------------- */
import { authClient } from 'auth/client';

/* Helpers --------------------------------------------- */
/** Only allow same-site path redirects to avoid open-redirect via ?callbackUrl. */
const safeCallbackUrl = (raw: string | null): string => {
  if(raw === null || !raw.startsWith('/') || raw.startsWith('//')) {
    return '/admin';
  }
  return raw;
};

/* LoginForm component --------------------------------- */
const LoginForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl: string = safeCallbackUrl(searchParams.get('callbackUrl'));

  const { data: sessionData } = authClient.useSession();

  useEffect(
    () => {
      if(sessionData !== null && sessionData !== undefined) {
        router.replace(callbackUrl);
      }
    },
    [sessionData, callbackUrl, router],
  );

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await authClient.signIn.email({ email, password });
    if(signInError !== null && signInError !== undefined) {
      setError('Identifiants invalides.');
      setSubmitting(false);
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <form
      onSubmit={(e): void => { void handleSubmit(e); }}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6"
    >
      <h1 className="text-xl font-semibold">Connexion</h1>
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e): void => setPassword(e.target.value)}
        />
      </div>
      {
        error !== null &&
          <p className="text-sm text-destructive">{error}</p>
      }
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Connexion…' : 'Se connecter'}
      </Button>
      <Link
        href="/forgot-password"
        className="text-sm text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
      >
        Mot de passe oublié ?
      </Link>
    </form>
  );
};

/* LoginPage component prop types ---------------------- */
interface LoginPageProps {}

/* LoginPage component --------------------------------- */
const LoginPage: React.FC<LoginPageProps> = () => {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
};

/* Export LoginPage component -------------------------- */
export default LoginPage;
