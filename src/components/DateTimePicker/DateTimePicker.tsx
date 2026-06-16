'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Input } from 'components/ui/input';
import CalendarPopover from './CalendarPopover';

/* Module imports (project) ---------------------------- */
import { parseDateString, formatDateString, splitDateTime } from './dateStrings';

/* DateTimePicker component prop types ----------------- */
interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  datePlaceholder?: string;
}

/* DateTimePicker component ---------------------------- */
const DateTimePicker: React.FC<DateTimePickerProps> = ({ value, onChange, id, datePlaceholder }) => {
  const { datePart, timePart } = splitDateTime(value);
  /* When no date is chosen yet, hold the typed time locally so the field stays
     editable without emitting an invalid partial string. */
  const [pendingTime, setPendingTime] = React.useState<string>('');
  const date = parseDateString(datePart);
  const timeValue = datePart === '' ? pendingTime : timePart;

  const handleDateSelect = (next: Date | undefined): void => {
    if(next === undefined) {
      onChange('');
      return;
    }
    const nextDate = formatDateString(next);
    const effectiveTime = timeValue === '' ? '00:00' : timeValue;
    onChange(`${nextDate}T${effectiveTime}`);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const nextTime = e.target.value;
    if(datePart === '') {
      setPendingTime(nextTime);
      return;
    }
    if(nextTime === '') {
      onChange(`${datePart}T00:00`);
      return;
    }
    onChange(`${datePart}T${nextTime}`);
  };

  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <CalendarPopover date={date} onSelect={handleDateSelect} id={id} placeholder={datePlaceholder} />
      </div>
      <Input
        type="time"
        aria-label="Heure"
        className="w-32"
        value={timeValue}
        onChange={handleTimeChange}
      />
    </div>
  );
};

/* Export DateTimePicker component --------------------- */
export default DateTimePicker;
