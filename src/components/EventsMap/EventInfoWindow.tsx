/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import {
  Typography,
  Link as MuiLink,
} from '@mui/material';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { MarkerInfo } from './EventsMap';

/* EventInfoWindow component prop types ---------------- */
interface EventInfoWindowProps {
  markerInfo: MarkerInfo;
}

/* EventInfoWindow component --------------------------- */
const EventInfoWindow: React.FC<EventInfoWindowProps> = (
  {
    markerInfo,
  },
) => {
  return (
    <div>
      <Typography variant="h5">
        {markerInfo.event.name}
      </Typography>
      <Typography variant="h6">
        Adresse :
      </Typography>
      <Typography>
        {markerInfo.event.location.name}
      </Typography>
      <Typography>
        {markerInfo.event.location.addressStr}
      </Typography>
      {
        markerInfo.event.links &&
        markerInfo.event.links.length > 0 &&
          <>
            <Typography variant="h6">
              Liens :
            </Typography>
            <ul>
              {
                markerInfo.event.links.map(
                  (link, index) => (
                    <li
                      key={`${link.url}-${index}`}
                    >
                      <MuiLink
                        href={link.url}
                        underline="none"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block ellipsis"
                      >
                        <Typography>
                          {link.label}
                        </Typography>
                      </MuiLink>
                    </li>
                  ),
                )
              }
            </ul>
          </>
      }
      {
        markerInfo.event.description !== undefined &&
          <>
            <Typography variant="h6">
              Description :
            </Typography>
            <div>
              {markerInfo.event.description}
            </div>
          </>
      }
    </div>
  );
};

/* Export EventInfoWindow component -------------------- */
export default EventInfoWindow;
