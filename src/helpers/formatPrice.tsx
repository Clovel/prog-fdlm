/* Framework imports ----------------------------------- */

/* Module imports -------------------------------------- */

/* Component imports ----------------------------------- */

/* Style imports --------------------------------------- */

/* Type imports ---------------------------------------- */

/* Helper functions ------------------------------------ */
const formatPriceInt = (price: number): string => {
  const euros = Math.floor(price);
  const centimes = Math.round((price - euros) * 100);

  let formattedPrice = euros.toString();

  if(centimes !== 0) {
    if(centimes < 10) {
      formattedPrice += `,0${centimes}`;
    } else {
      formattedPrice += `,${centimes}`;
    }
  }

  formattedPrice += ' €';

  return formattedPrice;
};

export const formatPrice = (price?: number | string | React.ReactNode): string | React.ReactNode => {
  if(price === undefined) {
    return 'Gratuit';
  }

  if(typeof price === 'number') {
    return formatPriceInt(price);
  }

  return price;
};
