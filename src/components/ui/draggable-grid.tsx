import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableItem = ({ id, children, className }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "relative cursor-move",
        isDragging && "opacity-50 z-50",
        className
      )}
    >
      {children}
    </div>
  );
};

interface DraggableGridProps {
  items: Array<{
    id: string;
    content: React.ReactNode;
    className?: string;
  }>;
  onReorder?: (items: Array<{ id: string; content: React.ReactNode; className?: string }>) => void;
  className?: string;
}

export const DraggableGrid = ({ items, onReorder, className }: DraggableGridProps) => {
  const [activeItems, setActiveItems] = useState(items);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = activeItems.findIndex((item) => item.id === active.id);
      const newIndex = activeItems.findIndex((item) => item.id === over?.id);
      
      const newItems = arrayMove(activeItems, oldIndex, newIndex);
      setActiveItems(newItems);
      onReorder?.(newItems);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={activeItems.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className={cn("grid grid-cols-1 xl:grid-cols-3 gap-6", className)}>
          {activeItems.map((item) => (
            <DraggableItem key={item.id} id={item.id} className={item.className}>
              {item.content}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};