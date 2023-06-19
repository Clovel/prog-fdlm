/* Framework imports ----------------------------------- */
import React from 'react';

/* Module imports -------------------------------------- */
import { css } from '@emotion/css';

/* Component imports ----------------------------------- */
import Collapse from '@mui/material/Collapse';
import ListItem from '@mui/material/ListItem';
import MuiLink from '@mui/material/Link';
import Typography from '@mui/material/Typography';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* Styling --------------------------------------------- */
const descriptionSpan = css`
  & ul {
    list-style: inside;
  };
  & p {
    padding-bottom: 0.5rem;
  };
`;

/* EventListItemDetails component prop types ----------- */
interface EventListItemDetailsProps {
  open: boolean;
  event: Event;
  divider: boolean;
}

/* EventListItemDetails component ---------------------- */
const EventListItemDetails: React.FC<EventListItemDetailsProps> = (
  {
    open,
    event,
    divider = false,
  }
) => {
  return (
    <Collapse
      in={open}
      timeout="auto"
      unmountOnExit
    >
      <ListItem divider={divider}>
        <div className={`flex flex-col ${descriptionSpan}`}>
          {
            event.description !== undefined &&
              <article>
                <Typography
                  variant="h6"
                  color="text.secondary"
                >
                  Description de l'événement :
                </Typography>
                <br />
                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  {event.description}
                </Typography>
              </article>
          }
          {
            event.links !== undefined &&
            event.links.length > 0 &&
              <p>

                <Typography
                  variant="h6"
                  color="text.secondary"
                >
                  Liens :
                </Typography>
                <ul>
                  {
                    event.links.map(
                      (link, index) => (
                        <li key={`${link}-${index}`}>
                          <MuiLink
                            href={link}
                            underline="none"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {link}
                          </MuiLink>
                        </li>
                      ),
                    )
                  }
                </ul>
              </p>
          }
        </div>
      </ListItem>
    </Collapse>
  );
};

/* Export EventListItemDetails component --------------- */
export default EventListItemDetails;
