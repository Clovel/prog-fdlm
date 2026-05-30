'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from 'components/ui/avatar';

/* UserAvatar component prop types --------------------- */
interface UserAvatarProps {
  src: string;
  initials: string;
  alt?: string;
}

/* UserAvatar component -------------------------------- */
/**
 * Presentational avatar. The parent resolves `src` (user.image ?? gravatarUrl)
 * and `initials`. shadcn's Avatar shows the fallback initials automatically
 * when the image errors (e.g. the Gravatar d=404 miss).
 */
const UserAvatar: React.FC<UserAvatarProps> = (
  {
    src,
    initials,
    alt = '',
  },
) => {
  return (
    <Avatar>
      <AvatarImage src={src} alt={alt} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
};

/* Export UserAvatar component ------------------------- */
export default UserAvatar;
