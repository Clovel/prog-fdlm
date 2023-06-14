/* Framework imports ----------------------------------- */
import React, {
  useMemo,
  useState,
} from 'react';

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MuiLink from '@mui/material/Link';
import IconButton from '@mui/material/IconButton';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';

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

  const listItemButtonProps = useMemo<React.ComponentProps<typeof ListItemButton>>(
    () => {
      if(
        event.links !== undefined &&
        event.links.length > 0
      ) {
        return {
          LinkComponent: MuiLink,
          href: event.links[0],
          underline: 'never',
          target: '_blank',
          rel: 'noopener noreferrer',
        };
      } else {
        return {
          // disabled: true,
          // style: {
          //   opacity: 1, /* Don't change the style of disabled events just because they don't have links */
          // },
        };
      }
    },
    [
      event.links,
    ],
  );

  const collapsiblePresent: boolean = useMemo<boolean>(
    () => {
      return event.description !== undefined;
    },
    [
      event.description,
    ]
  );

  const onExpandClicked: React.MouseEventHandler<HTMLButtonElement> = (event) => {
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
      >
        <ListItemButton {...listItemButtonProps}>
          <ListItemText
            primary={
              <Typography
                variant="subtitle1"
              >
                <span className="font-bold">
                  {event.name}
                </span>
              </Typography>
            }
            secondary={
              <React.Fragment>
                <Typography
                  sx={{ display: 'inline' }}
                  component="span"
                  variant="body2"
                  color="text.primary"
                >
                  <span className="font-semibold">
                    {event.location.name}
                  </span>
                  {
                    event.location.addressStr !== undefined &&
                      <>
                        {', '}
                        {event.location.addressStr}
                      </>
                  }
                </Typography>
                {
                  event.genres !== undefined &&
                event.genres.length > 0 &&
                  <Typography>
                    Genres :
                    {' '}
                    {event.genres.join(', ')}
                  </Typography>
                }
                {
                  event.artists !== undefined &&
                event.artists.length > 0 &&
                  <Typography>
                    Artistes :
                    {' '}
                    {event.artists.join(', ')}
                  </Typography>
                }
              </React.Fragment>
            }
          />
          <Typography
            sx={{ display: 'inline' }}
            component="span"
            variant="body2"
            color="text.primary"
          >
            {
              event.endTime !== undefined ?
                'De ' :
                'À '
            }
            {
              event.startTime.toLocaleTimeString(
                'fr-FR',
                {
                  hour: '2-digit',
                  minute: '2-digit',
                }
              )
            }
            {
              event.endTime !== undefined &&
                <>
                  {' à '}
                  {
                    event.endTime.toLocaleTimeString(
                      'fr-FR',
                      {
                        hour: 'numeric',
                        minute: '2-digit',
                      }
                    )
                  }
                </>
            }
          </Typography>
        </ListItemButton>
      </ListItem>
      {
        collapsiblePresent === true &&
          <Collapse
            in={open}
            timeout="auto"
            unmountOnExit
          >
            <ListItem divider={divider}>
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
            </ListItem>
          </Collapse>
      }
    </>
  );
};

/* Export EventListItem component ---------------------- */
export default EventListItem;