/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import clsx from 'clsx';
import { useRouter } from 'next/router';
import { styled } from '@mui/material/styles';

/* Component imports ----------------------------------- */
import MuiLink from '@mui/material/Link';
import NextLinkComposed from './NextLinkComposed';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { LinkProps as NextLinkProps } from 'next/link';
import type { LinkProps as MuiLinkProps } from '@mui/material/Link';
import type { NextLinkComposedProps } from './NextLinkComposed';
import type { Url } from 'next/dist/shared/lib/router/router';

/* Internal components --------------------------------- */
// Add support for the sx prop for consistency with the other branches.
const Anchor = styled('a')({});

/* Link component prop types --------------------------- */
export type LinkProps = {
  activeClassName?: string;
  as?: NextLinkProps['as'];
  href: NextLinkProps['href'];
  linkAs?: NextLinkProps['as']; // Useful when the as prop is shallow by styled().
  noLinkStyle?: boolean;
} &
  Omit<NextLinkComposedProps, 'to' | 'linkAs' | 'href'> &
  Omit<MuiLinkProps, 'href'>;

/* Link component -------------------------------------- */
const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(function Link(props, ref) {
  const {
    activeClassName = 'active',
    as,
    className: classNameProps,
    href,
    legacyBehavior,
    linkAs: linkAsProp,
    locale,
    noLinkStyle,
    prefetch,
    replace,
    role, // Link don't have roles.
    scroll,
    shallow,
    ...other
  } = props;

  const router = useRouter();
  const pathname = typeof href === 'string' ? href : href.pathname;
  const className = clsx(classNameProps, {
    [activeClassName]: router.pathname === pathname && activeClassName,
  });

  const isExternal =
    typeof href === 'string' &&
    (
      href.indexOf('http') === 0 ||
      href.indexOf('mailto:') === 0
    );

  if(isExternal) {
    if(noLinkStyle === true) {
      return (
        <Anchor
          className={className}
          href={href}
          ref={ref}
          {...other}
        />
      );
    }

    return (
      <MuiLink
        className={className}
        href={href}
        ref={ref}
        {...other}
      />
    );
  }

  const linkAs: Url | undefined = linkAsProp !== undefined ?
    linkAsProp :
    as;
  const nextjsLinkProps: NextLinkComposedProps = {
    to: href,
    linkAs,
    replace,
    scroll,
    shallow,
    prefetch,
    legacyBehavior,
    locale,
  };

  if(noLinkStyle === true) {
    return (
      <NextLinkComposed
        className={className}
        ref={ref}
        {...nextjsLinkProps}
        {...other}
      />
    );
  }

  return (
    <MuiLink
      component={NextLinkComposed}
      className={className}
      ref={ref}
      {...nextjsLinkProps}
      {...other}
    />
  );
});

/* Export Link component ------------------------------- */
export default Link;
