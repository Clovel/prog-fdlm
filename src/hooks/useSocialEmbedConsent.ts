/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* Hooks ----------------------------------------------- */
/**
 * Returns whether the user has consented to loading third-party social media
 * scripts (Instagram, Facebook).
 *
 * This project has no CMP yet. The hook currently always returns `true` unless
 * `NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS` is set to `'true'`, which provides an
 * env-var kill-switch for testing. When a CMP is added, swap this for the real
 * adapter.
 */
export function useSocialEmbedConsent(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_SOCIAL_EMBEDS !== 'true';
}
