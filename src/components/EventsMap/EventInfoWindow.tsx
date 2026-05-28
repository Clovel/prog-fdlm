/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import DescriptionRender from 'components/DescriptionRender/DescriptionRender';

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
      <h5 className="text-xl font-semibold">
        {markerInfo.event.name}
      </h5>
      <h6 className="text-base font-semibold mt-2">
        Adresse :
      </h6>
      <p>
        {markerInfo.event.location.name}
      </p>
      <p>
        {markerInfo.event.location.addressStr}
      </p>
      {
        markerInfo.event.links !== undefined &&
        markerInfo.event.links.length > 0 &&
          <>
            <h6 className="text-base font-semibold mt-2">
              Liens :
            </h6>
            <ul>
              {
                markerInfo.event.links.map(
                  (link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
                      >
                        {link.label}
                      </a>
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
            <h6 className="text-base font-semibold mt-2">
              Description :
            </h6>
            <div>
              <DescriptionRender markdown={markerInfo.event.description} />
            </div>
          </>
      }
    </div>
  );
};

/* Export EventInfoWindow component -------------------- */
export default EventInfoWindow;
