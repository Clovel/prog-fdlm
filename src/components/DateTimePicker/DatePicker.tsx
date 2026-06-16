'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import CalendarPopover from './CalendarPopover';

/* Module imports (project) ---------------------------- */
import { parseDateString, formatDateString } from './dateStrings';

/* DatePicker component prop types --------------------- */
interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
}

/* DatePicker component -------------------------------- */
const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, id, placeholder }) => {
  const date = parseDateString(value);

  const handleSelect = (next: Date | undefined): void => {
    onChange(next === undefined ? '' : formatDateString(next));
  };

  return (
    <CalendarPopover date={date} onSelect={handleSelect} id={id} placeholder={placeholder} />
  );
};

/* Export DatePicker component ------------------------- */
export default DatePicker;
