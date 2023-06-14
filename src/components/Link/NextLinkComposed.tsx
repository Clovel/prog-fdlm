/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { styled } from '@mui/material/styles';

/* Component imports ----------------------------------- */
import NextLink from 'next/link';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { LinkProps as NextLinkProps } from 'next/link';

/* Internal components --------------------------------- */
// Add support for the sx prop for consistency with the other branches.
const Anchor = styled('a')({});

/* NextLinkComposed component prop types -------------------- */
export interface NextLinkComposedProps
extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'>,
  Omit<NextLinkProps, 'href' | 'as' | 'passHref' | 'onMouseEnter' | 'onClick' | 'onTouchStart'> {
to: NextLinkProps['href'];
linkAs?: NextLinkProps['as'];
}

/* NextLinkComposed component ------------------------------- */
const NextLinkComposed = React.forwardRef<HTMLAnchorElement, NextLinkComposedProps>(
  function NextLinkComposed(props, ref) {
    const {
      to,
      linkAs,
      replace,
      scroll,
      shallow,
      prefetch,
      legacyBehavior = true,
      locale,
      ...other
    } = props;

    return (
      <NextLink
        href={to}
        prefetch={prefetch}
        as={linkAs}
        replace={replace}
        scroll={scroll}
        shallow={shallow}
        passHref
        locale={locale}
        legacyBehavior={legacyBehavior}
      >
        <Anchor
          ref={ref}
          {...other}
        />
      </NextLink>
    );
  },
);

/* Export  component ------------------------ */
export default NextLinkComposed;
