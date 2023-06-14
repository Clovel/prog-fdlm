/* Component imports ----------------------------------- */
import NextLink from 'next/link';
import { Link as MuiLink } from '@mui/material';

/* Type imports ---------------------------------------- */
import type { LinkProps } from '@mui/material';
import type { LinkProps as NextLinkProps } from 'next/link';

/* CustomNextLink component prop types ----------------- */
type CustomNextLinkProps = Omit<NextLinkProps, 'href'> & {
  _href: NextLinkProps['href'];
};

/* CustomNextLink component ---------------------------- */
const CustomNextLink: React.FC<CustomNextLinkProps> = ({ _href, ...props }) => {
  return (
    <NextLink
      href={_href}
      {...props}
    />
  );
};

/* NextMuiLink component prop types -------------------- */
// combine MUI LinkProps with NextLinkProps
type CombinedLinkProps = LinkProps<typeof NextLink>;

// remove both href properties
// and define a new href property using NextLinkProps
type NextMuiLinkProps = Omit<CombinedLinkProps, 'href'> & {
  href: NextLinkProps['href'];
};

/* NextMuiLink component ------------------------------- */
const NextMuiLink: React.FC<NextMuiLinkProps>  = ({ href, ...props }) => {
  // use _href props of CustomNextLink to set the href
  return (
    <MuiLink
      {...props}
      component={CustomNextLink}
      _href={href}
    />
  );
};

/* Export NextMuiLink component ------------------------ */
export default NextMuiLink;
