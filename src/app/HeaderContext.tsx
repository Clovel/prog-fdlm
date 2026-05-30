'use client';

/* Framework imports ----------------------------------- */
import React, { createContext, useContext, useMemo, useState } from 'react';

/* Type declarations ----------------------------------- */
export interface HeaderState {
  year: number | null;
  eventsCount: number | null;
}

interface HeaderContextValue {
  state: HeaderState;
  setState: (next: HeaderState) => void;
}

/* External variables ---------------------------------- */
const HeaderContext = createContext<HeaderContextValue | undefined>(undefined);

/* HeaderProvider component prop types ----------------- */
interface HeaderProviderProps {
  children: React.ReactNode;
}

/* HeaderProvider component ---------------------------- */
export const HeaderProvider: React.FC<HeaderProviderProps> = (
  { children },
) => {
  const [state, setState] = useState<HeaderState>({ year: null, eventsCount: null });
  const value: HeaderContextValue = useMemo(() => ({ state, setState }), [state]);
  return <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>;
};

/* useHeader hook -------------------------------------- */
export const useHeader = (): HeaderContextValue => {
  const ctx: HeaderContextValue | undefined = useContext(HeaderContext);
  if(ctx === undefined) {
    throw new Error('useHeader must be used inside <HeaderProvider>');
  }
  return ctx;
};
