import React, { useState, useRef, useCallback } from 'react';
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
import { GripVertical } from 'lucide-react';

interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  width: number;
  height: number;
  onResize: (id: string, width: number, height: number) => void;
}

const DraggableItem = ({ id, children, className, width, height, onResize }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const rect = resizeRef.current?.getBoundingClientRect();
    if (rect) {
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: rect.width,
        height: rect.height,
      };
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startPosRef.current.x;
      const deltaY = e.clientY - startPosRef.current.y;
      
      const newWidth = Math.max(200, startPosRef.current.width + deltaX);
      const newHeight = Math.max(150, startPosRef.current.height + deltaY);
      
      onResize(id, newWidth, newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id, onResize, isResizing]);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? 'none' : transition,
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative border border-border rounded-lg overflow-hidden",
        isDragging && "opacity-50 z-50",
        className
      )}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 right-2 p-1 cursor-move hover:bg-muted rounded z-10 bg-background/80 backdrop-blur-sm"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Resize handle */}
      <div
        ref={resizeRef}
        onMouseDown={handleMouseDown}
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize hover:bg-primary/20 bg-muted/50"
        title="Drag to resize"
      >
        <div className="absolute bottom-1 right-1 w-2 h-2 border-r-2 border-b-2 border-muted-foreground/50" />
      </div>

      {/* Content */}
      <div className="h-full overflow-auto">
        {children}
      </div>
    </div>
  );
};

interface DraggableGridItem {
  id: string;
  content: React.ReactNode;
  className?: string;
  width?: number;
  height?: number;
}

interface DraggableGridProps {
  items: DraggableGridItem[];
  onReorder?: (items: DraggableGridItem[]) => void;
  className?: string;
}

export const DraggableGrid = ({ items, onReorder, className }: DraggableGridProps) => {
  const [activeItems, setActiveItems] = useState(() => 
    items.map(item => ({
      ...item,
      width: item.width || 400,
      height: item.height || 300,
    }))
  );
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
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

  const handleResize = useCallback((id: string, width: number, height: number) => {
    setActiveItems(prev => prev.map(item => 
      item.id === id ? { ...item, width, height } : item
    ));
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={activeItems.map(item => item.id)} strategy={rectSortingStrategy}>
        <div className={cn("flex flex-wrap gap-4 p-4", className)}>
          {activeItems.map((item) => (
            <DraggableItem 
              key={item.id} 
              id={item.id} 
              className={item.className}
              width={item.width}
              height={item.height}
              onResize={handleResize}
            >
              {item.content}
            </DraggableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};