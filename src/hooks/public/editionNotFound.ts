/* EditionNotFoundError -------------------------------- */
// Thrown by the public read hooks on a 404/400. The edition page translates it
// into Next's `notFound()` during render — calling `notFound()` from inside the
// async query function would never reach Next's not-found boundary.
export class EditionNotFoundError extends Error {}
