/* Concrete light-theme token values (Satori cannot resolve oklch CSS vars). */
/* Mirrors src/app/globals.css :root — the Tailwind v4 neutral scale. */
export const CARD_COLORS = {
  background: '#ffffff',        // --background  oklch(1 0 0)
  foreground: '#0a0a0a',        // --foreground  oklch(0.145 0 0)
  primary: '#171717',           // --primary     oklch(0.205 0 0)
  primaryForeground: '#fafafa', // --primary-foreground oklch(0.985 0 0)
  mutedForeground: '#737373',   // --muted-foreground   oklch(0.556 0 0)
  border: '#e5e5e5',            // --border      oklch(0.922 0 0)
} as const;
