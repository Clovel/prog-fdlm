/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */
import axios from 'axios';

/* Type imports ---------------------------------------- */

/* Axios Instance -------------------------------------- */
export const axiosInstance = axios.create();
delete axiosInstance.defaults.headers.common['User-Agent'];
delete axiosInstance.defaults.headers.common['Accept-Encoding'];
