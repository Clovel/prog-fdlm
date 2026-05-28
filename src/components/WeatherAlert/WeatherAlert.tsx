/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Alert, AlertDescription } from 'components/ui/alert';

/* WeatherAlert component prop types ------------------- */
interface WeatherAlertProps {}

/* WeatherAlert component ------------------------------ */
const WeatherAlert: React.FC<WeatherAlertProps> = () => {
  return (
    <div className="flex flex-col place-items-center min-w-full py-4 lg:py-0">
      <Alert
        variant="destructive"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          <p>
            A cause des orages annoncés pour ce soir, ne nombreux événements en plein air sont annulés ou reprogrammés dans des lieux abrités.
          </p>
          <br />
          <p>
            Par exemple, les évènements suivants ont été reprogrammés :
          </p>
          <ul className="list-disc list-inside">
            <li>
              Amplitudes, Cmd+O & L'Orangeade : Darwin de 18 et 21h45, IBOAT de 21h et 4h
            </li>
            <li>
              ③⑥①⑤𝘽𝙀𝘽𝙊𝙋 : Les BROC'S Saint Michel, de 16h à 2h
            </li>
            <li>
              WHYNOT, l'Astrodøme et Musique d'Apéritif : Deus Ex Machina, de 19h à 00h
            </li>
          </ul>
          <br />
          <p>
            Pour Darwin, pensez a vous inscrire sur la liste d'attente :
            {' '}
            <a
              href="https://dice.fm/event/yaedr-hh-fte-de-la-musique-et-du-skate-21st-jun-darwin-bordeaux-tickets"
              target="_blank"
              rel="noreferrer noopener"
              className="text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline"
            >
              Billetterie DICE
            </a>
          </p>
        </AlertDescription>
      </Alert>
      <Alert
        variant="warning"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          Les annulations et déplacement des évènements sont en cours de mise à jour.
        </AlertDescription>
      </Alert>
      <Alert
        variant="success"
        className="lg:my-2 lg:p-2 w-full"
      >
        <AlertDescription>
          Merci beaucoup aux lieux qui accueillent les artistes et les évènements qui ont été annulés à cause de la pluie !
          Sans eux la fête serait annulée !
        </AlertDescription>
      </Alert>
    </div>
  );
};

/* Export WeatherAlert component ----------------------- */
export default WeatherAlert;
