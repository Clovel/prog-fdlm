'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';

/* Module imports -------------------------------------- */
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider as DefaultCacheProvider } from '@emotion/react';

/* Type imports ---------------------------------------- */
import type {
  EmotionCache,
  Options as OptionsOfCreateCache,
} from '@emotion/cache';

/* NextAppDirEmotionCacheProvider component prop types - */
export type NextAppDirEmotionCacheProviderProps = {
  /** This is the options passed to createCache() from 'import createCache from "@emotion/cache"' */
  options: Omit<OptionsOfCreateCache, 'insertionPoint'>;
  /** By default <CacheProvider /> from 'import { CacheProvider } from "@emotion/react"' */
  CacheProvider?: (props: {
    value: EmotionCache;
    children: React.ReactNode;
  }) => React.JSX.Element | null;
  children: React.ReactNode;
};

/* NextAppDirEmotionCacheProvider component ------------ */
const NextAppDirEmotionCacheProvider: React.FC<NextAppDirEmotionCacheProviderProps> = (props) => {
  const { options, CacheProvider = DefaultCacheProvider, children } = props;

  const [ { cache, flush } ] = useState(
    () => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
      const cache = createCache(options);
      cache.compat = true;

      // eslint-disable-next-line @typescript-eslint/unbound-method
      const prevInsert = cache.insert;

      let inserted: string[] = [];

      cache.insert = (...args): string | void => {
        const serialized = args[1];
        if(cache.inserted[serialized.name] === undefined) {
          inserted.push(serialized.name);
        }
        return prevInsert(...args);
      };

      // eslint-disable-next-line @typescript-eslint/no-shadow
      const flush = (): string[] => {
        const prevInserted = inserted;
        inserted = [];
        return prevInserted;
      };

      return {
        cache,
        flush,
      };
    }
  );

  useServerInsertedHTML(
    () => {
      const names = flush();
      if(names.length === 0) {
        return null;
      }
      let styles = '';
      // eslint-disable-next-line no-restricted-syntax
      for(const name of names) {
        styles += cache.inserted[name];
      }
      return (
        <style
          key={cache.key}
          data-emotion={`${cache.key} ${names.join(' ')}`}
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={
            {
              __html: styles,
            }
          }
        />
      );
    }
  );

  return (
    <CacheProvider value={cache}>
      {children}
    </CacheProvider>
  );
};

/* Export NextAppDirEmotionCacheProvider component ----- */
export default NextAppDirEmotionCacheProvider;
