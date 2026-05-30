/* Module imports -------------------------------------- */
import { Resend } from 'resend';

/* Helpers --------------------------------------------- */
/**
 * Sends the password-reset email via Resend. Reads RESEND_API_KEY and
 * EMAIL_FROM at call time so a missing var fails loudly rather than at import.
 * Awaited inline by BetterAuth's sendResetPassword (no background handler — see
 * the auth config); on our low traffic an inline await is reliable on serverless.
 */
export const sendResetPasswordEmail = async(to: string, url: string): Promise<void> => {
  const apiKey: string | undefined = process.env.RESEND_API_KEY;
  const from: string | undefined = process.env.EMAIL_FROM;

  if(apiKey === undefined || apiKey.length === 0) {
    throw new Error('RESEND_API_KEY is not set.');
  }
  if(from === undefined || from.length === 0) {
    throw new Error('EMAIL_FROM is not set.');
  }

  const resend: Resend = new Resend(apiKey);
  const safeUrl: string = url.replace(/"/g, '%22');

  const { error } = await resend.emails.send({
    from,
    to,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <p>Bonjour,</p>
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour le site de la Fête de la Musique.</p>
      <p><a href="${safeUrl}">Cliquez ici pour choisir un nouveau mot de passe</a>.</p>
      <p>Ce lien expire dans une heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    `,
  });

  if(error !== null) {
    throw new Error(`Resend failed to send reset email: ${error.message}`);
  }
};
