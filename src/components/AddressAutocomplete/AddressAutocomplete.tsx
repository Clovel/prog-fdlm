'use client';

/* Framework imports ----------------------------------- */
import React from 'react';

/* Component imports ----------------------------------- */
import { Input } from 'components/ui/input';

/* Module imports (project) ---------------------------- */
import { useAddressSuggestions } from 'hooks/admin/useAddressSuggestions';

/* AddressAutocomplete component prop types ------------ */
export interface AddressAutocompleteValue {
  address: string;
  lat: number | null;
  lng: number | null;
}

interface AddressAutocompleteProps {
  value: AddressAutocompleteValue;
  onChange: (next: AddressAutocompleteValue) => void;
  id?: string;
  placeholder?: string;
}

/* Constants ------------------------------------------- */
const DEBOUNCE_MS = 300;

/* AddressAutocomplete component ----------------------- */
const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ value, onChange, id, placeholder }) => {
  const [open, setOpen] = React.useState<boolean>(false);
  const [debounced, setDebounced] = React.useState<string>(value.address);
  const [highlight, setHighlight] = React.useState<number>(-1);

  /* Debounce the typed text before querying BAN. */
  React.useEffect((): (() => void) => {
    const t = setTimeout((): void => { setDebounced(value.address); }, DEBOUNCE_MS);
    return (): void => { clearTimeout(t); };
  }, [value.address]);

  const query = useAddressSuggestions(open ? debounced : '');
  const suggestions = query.data ?? [];

  const select = (s: AddressAutocompleteValue): void => {
    onChange(s);
    setOpen(false);
    setHighlight(-1);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange({ address: e.target.value, lat: null, lng: null });
    setOpen(true);
    setHighlight(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if(!open || suggestions.length === 0) {
      return;
    }
    if(e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h): number => (h + 1) % suggestions.length);
    } else if(e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h): number => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if(e.key === 'Enter' && highlight >= 0) {
      e.preventDefault();
      const s = suggestions[highlight];
      select({ address: s.label, lat: s.lat, lng: s.lng });
    } else if(e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown: boolean = open && suggestions.length > 0;

  return (
    <div className="relative">
      <Input
        id={id}
        value={value.address}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={(): void => { if(value.lat === null) { setOpen(true); } }}
        onBlur={(): void => { window.setTimeout((): void => { setOpen(false); }, 120); }}
      />
      {
        showDropdown &&
          <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
            {
              suggestions.map((s, i) => (
                <li key={`${s.label}-${i.toString()}`}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground ${i === highlight ? 'bg-accent text-accent-foreground' : ''}`}
                    onMouseDown={(e): void => { e.preventDefault(); select({ address: s.label, lat: s.lat, lng: s.lng }); }}
                  >
                    {s.label}
                  </button>
                </li>
              ))
            }
          </ul>
      }
    </div>
  );
};

/* Export AddressAutocomplete component ---------------- */
export default AddressAutocomplete;
