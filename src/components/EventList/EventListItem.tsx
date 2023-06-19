/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */
import { formatPrice } from 'helpers/formatPrice';

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import EventTime from './EventTime';
import EventListItemDetails from './EventListItemDetails';

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */
import type { Event } from 'types/Event';

/* EventListItem component prop types ------------------ */
interface EventListItemProps {
  event: Event;
  divider?: boolean;
}

/* EventListItem component ----------------------------- */
const EventListItem: React.FC<EventListItemProps> = (
  {
    event,
    divider = false,
  },
) => {
  const [ open, setOpen ] = useState<boolean>(false);

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return event.description !== undefined;
    },
    [
      event.description,
    ]
  );

  const onExpandClicked: React.MouseEventHandler<HTMLElement> = (event) => {
    event.stopPropagation();

    setOpen(!open);
  };

  return (
    <>
      <ListItem
        alignItems="flex-start"
        secondaryAction={
          collapsiblePresent === true ?
            <IconButton
              edge="end"
              aria-label="toggle"
              onClick={collapsiblePresent ? onExpandClicked : undefined}
              disabled={!collapsiblePresent}
            >
              {
                open ?
                  <ExpandLess /> :
                  <ExpandMore />
              }
            </IconButton> :
            undefined
        }
        disablePadding
        divider={divider && !open}
      >
        <ListItemButton
          onClick={
            collapsiblePresent ?
              onExpandClicked :
              undefined
          }
        >
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
              >
                <span className="font-bold">
                  {event.name ?? event.location.name}
                </span>
              </Typography>
            }
            secondary={
              <React.Fragment>
                <div className="inline">
                  <Typography
                    className="!font-semibold"
                    variant="body2"
                    color="text.primary"
                    component="span"
                  >
                    {
                      event.name !== undefined &&
                          event.location.name
                    }
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    component="span"
                  >
                    {
                      event.name !== undefined &&
                        event.location.addressStr !== undefined &&
                          ', '
                    }
                    {
                      event.location.addressStr !== undefined &&
                        event.location.addressStr
                    }
                  </Typography>
                </div>
                {
                  event.genres !== undefined &&
                  event.genres.length > 0 &&
                    <Typography>
                      - Genres :
                      {' '}
                      {event.genres.join(', ')}
                    </Typography>
                }
                {
                  event.artists !== undefined &&
                  event.artists.length > 0 &&
                    <Typography>
                      - Artistes :
                      {' '}
                      {event.artists.join(', ')}
                    </Typography>
                }
                {
                  event.price !== undefined &&
                    <Typography>
                      - Prix :
                      {' '}
                      {formatPrice(event.price)}
                    </Typography>
                }
              </React.Fragment>
            }
            secondaryTypographyProps={
              {
                component: 'div',
              }
            }
          />
          <EventTime
            startTime={event.startTime}
            endTime={event.endTime}
          />
        </ListItemButton>
      </ListItem>
      {
        collapsiblePresent === true &&
          <EventListItemDetails
            open={open}
            event={event}
            divider={divider}
          />
      }
    </>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;
