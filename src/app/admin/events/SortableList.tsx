'use client';

/* Framework imports ----------------------------------- */
import React from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableRow from './SortableRow';

/* Type imports ---------------------------------------- */
import type { DragEndEvent } from '@dnd-kit/core';

/* SortableList component prop types ------------------- */
interface SortableListProps {
  /** Stable row ids (react-hook-form field ids). */
  ids: string[];
  onReorder: (from: number, to: number) => void;
  renderRow: (index: number) => React.ReactNode;
}

/* SortableList component ------------------------------ */
const SortableList: React.FC<SortableListProps> = ({ ids, onReorder, renderRow }) => {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    if(over === null || over === undefined || active.id === over.id) {
      return;
    }
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if(from === -1 || to === -1) {
      return;
    }
    onReorder(from, to);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-2">
          {ids.map((id, index) => (
            <SortableRow key={id} id={id}>
              {renderRow(index)}
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

/* Export SortableList component ----------------------- */
export default SortableList;
