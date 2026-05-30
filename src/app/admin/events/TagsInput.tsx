'use client';

/* Framework imports ----------------------------------- */
import React, { useState } from 'react';
import { X } from 'lucide-react';

/* Component imports ----------------------------------- */
import { Badge } from 'components/ui/badge';
import { Input } from 'components/ui/input';

/* TagsInput component prop types ---------------------- */
interface TagsInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

/* TagsInput component --------------------------------- */
const TagsInput: React.FC<TagsInputProps> = (
  {
    value,
    onChange,
    placeholder = 'Ajouter… (Entrée)',
    id,
  },
) => {
  const [draft, setDraft] = useState<string>('');

  const addTag = (): void => {
    const trimmed = draft.trim();
    if(trimmed.length === 0 || value.includes(trimmed)) {
      setDraft('');
      return;
    }
    onChange([...value, trimmed]);
    setDraft('');
  };

  const removeAt = (index: number): void => {
    onChange(value.filter((_, i) => i !== index));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if(e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if(e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      removeAt(value.length - 1);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {
        value.length > 0 &&
          <div className="flex flex-wrap gap-1">
            {
              value.map((tag, index) => (
                <Badge key={`${tag}-${index}`} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    aria-label={`Retirer ${tag}`}
                    onClick={(): void => removeAt(index)}
                    className="ml-1"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            }
          </div>
      }
      <Input
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(e): void => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={(): void => addTag()}
      />
    </div>
  );
};

/* Export TagsInput component -------------------------- */
export default TagsInput;
