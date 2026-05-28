'use client';

/* Framework imports ----------------------------------- */
import React, {
  useEffect,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { useTheme } from 'next-themes';

/* Component imports ----------------------------------- */
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from 'components/ui/button';

/* Constants ------------------------------------------- */
const CYCLE: Record<string, string> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const LABELS: Record<string, string> = {
  light: 'Thème : clair',
  dark: 'Thème : sombre',
  system: 'Thème : système',
};

/* ThemeToggle component ------------------------------- */
const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [ mounted, setMounted ] = useState<boolean>(false);

  useEffect(
    () => {
      queueMicrotask((): void => setMounted(true));
    },
    [],
  );

  const current = theme ?? 'system';

  const onCycle = (): void => {
    setTheme(CYCLE[current] ?? 'system');
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onCycle}
      aria-label={mounted ? LABELS[current] : 'Bascule du thème'}
      title={mounted ? LABELS[current] : undefined}
    >
      {
        mounted && current === 'light' &&
          <Sun className="h-5 w-5" />
      }
      {
        mounted && current === 'dark' &&
          <Moon className="h-5 w-5" />
      }
      {
        mounted && current === 'system' &&
          <Monitor className="h-5 w-5" />
      }
      {
        !mounted &&
          <Monitor className="h-5 w-5 opacity-50" />
      }
    </Button>
  );
};

/* Export ThemeToggle component ------------------------ */
export default ThemeToggle;
