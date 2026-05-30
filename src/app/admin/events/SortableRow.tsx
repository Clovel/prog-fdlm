'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

/* SortableRow component prop types -------------------- */
interface SortableRowProps {
  id: string;
  children: React.ReactNode;
}

/* SortableRow component ------------------------------- */
const SortableRow: React.FC<SortableRowProps> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-md border border-border p-3">
      <button
        type="button"
        className="mt-1 cursor-grab text-muted-foreground"
        aria-label="Réordonner"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
};

/* Export SortableRow component ------------------------ */
export default SortableRow;
