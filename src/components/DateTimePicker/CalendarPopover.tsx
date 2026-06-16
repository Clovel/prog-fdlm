'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Button } from 'components/ui/button';
import { Calendar } from 'components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';

/* Module imports (project) ---------------------------- */
import { cn } from 'lib/utils';

/* CalendarPopover component prop types ---------------- */
interface CalendarPopoverProps {
  date: Date | undefined;
  onSelect: (date: Date | undefined) => void;
  id?: string;
  placeholder?: string;
}

/* CalendarPopover component --------------------------- */
const CalendarPopover: React.FC<CalendarPopoverProps> = ({ date, onSelect, id, placeholder }) => {
  const [open, setOpen] = React.useState<boolean>(false);

  const handleSelect = (next: Date | undefined): void => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            date === undefined && 'text-muted-foreground',
          )}
        >
          <CalendarIcon className="mr-2 size-4" />
          {date === undefined ? (placeholder ?? 'Choisir une date') : format(date, 'd MMMM yyyy', { locale: fr })}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={fr}
          captionLayout="label"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
};

/* Export CalendarPopover component -------------------- */
export default CalendarPopover;
