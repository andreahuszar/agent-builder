'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ResizablePanelProps {
  children: React.ReactNode[];
  defaultSizes?: number[];
  minSizes?: number[];
  maxSizes?: number[];
  onSizeChange?: (sizes: number[]) => void;
  storageKey?: string;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function ResizablePanel({
  children,
  defaultSizes = [50, 50],
  minSizes = [20, 20],
  maxSizes = [80, 80],
  onSizeChange,
  storageKey,
  direction = 'horizontal',
  className = '',
}: ResizablePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(defaultSizes);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [wasDragged, setWasDragged] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartPos = useRef<number>(0);
  const dragStartSizes = useRef<number[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setIsClient(true);
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`panel-sizes-${storageKey}`);
      if (stored) {
        try {
          const parsedSizes = JSON.parse(stored);
          setSizes(parsedSizes);
        } catch {}
      }
    }
  }, [storageKey]);

  // Save sizes to localStorage when they change
  useEffect(() => {
    if (isClient && storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`panel-sizes-${storageKey}`, JSON.stringify(sizes));
    }
    onSizeChange?.(sizes);
  }, [sizes, storageKey, onSizeChange, isClient]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setWasDragged(true);
    dragStartPos.current = direction === 'horizontal' ? e.clientX : e.clientY;
    dragStartSizes.current = [...sizes];
    document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';
  }, [direction, sizes]);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 1000);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
    setWasDragged(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerSize = direction === 'horizontal' ? containerRect.width : containerRect.height;
      const currentPos = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - dragStartPos.current;
      const deltaPercent = (delta / containerSize) * 100;

      let newSize1 = dragStartSizes.current[0] + deltaPercent;
      let newSize2 = dragStartSizes.current[1] - deltaPercent;

      // Apply min/max constraints
      newSize1 = Math.max(minSizes[0], Math.min(maxSizes[0], newSize1));
      newSize2 = Math.max(minSizes[1], Math.min(maxSizes[1], newSize2));

      // Ensure sizes sum to 100
      const total = newSize1 + newSize2;
      if (Math.abs(total - 100) > 0.1) {
        const scale = 100 / total;
        newSize1 *= scale;
        newSize2 *= scale;
      }

      setSizes([newSize1, newSize2]);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, direction, minSizes, maxSizes]);

  const panels = React.Children.toArray(children);
  if (panels.length !== 2) {
    throw new Error('ResizablePanel requires exactly 2 children');
  }

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} ${className}`}
      style={{ height: '100%', width: '100%' }}
    >
      {/* First Panel */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${sizes[0]}%`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {panels[0]}
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          ${isHorizontal ? 'w-0.5 cursor-col-resize' : 'h-0.5 cursor-row-resize'}
          transition-colors relative
          ${isDragging || wasDragged || isHovered 
            ? 'bg-purple-400 hover:bg-purple-500' 
            : 'bg-gray-300 hover:bg-gray-400'
          }
        `}
        style={{
          flexShrink: 0,
          zIndex: 10,
        }}
      >
        {/* Hover Area for Better Grabbing */}
        <div
          className={`
            absolute ${isHorizontal ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'}
            ${isHorizontal ? 'w-3' : 'h-3'}
          `}
        />
      </div>

      {/* Second Panel */}
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${sizes[1]}%`,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {panels[1]}
      </div>
    </div>
  );
}

// Multi-panel version for 3-up view
interface MultiPanelProps {
  children: React.ReactNode[];
  defaultSizes?: number[];
  minSizes?: number[];
  storageKey?: string;
  className?: string;
}

export function MultiResizablePanel({
  children,
  defaultSizes,
  minSizes,
  storageKey,
  className = '',
}: MultiPanelProps) {
  const panels = React.Children.toArray(children);
  const numPanels = panels.length;
  
  const getDefaultSizes = () => {
    if (defaultSizes) return defaultSizes;
    return Array(numPanels).fill(100 / numPanels);
  };

  const getMinSizes = () => {
    if (minSizes) return minSizes;
    return Array(numPanels).fill(10);
  };

  const [sizes, setSizes] = useState<number[]>(getDefaultSizes());
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [draggedIndices, setDraggedIndices] = useState<Set<number>>(new Set());
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef<number>(0);
  const dragStartSizes = useRef<number[]>([]);
  const [isClient, setIsClient] = useState(false);

  // Load from localStorage after mount
  useEffect(() => {
    setIsClient(true);
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(`multi-panel-sizes-${storageKey}`);
      if (stored) {
        try {
          const parsedSizes = JSON.parse(stored);
          setSizes(parsedSizes);
        } catch {}
      }
    }
  }, [storageKey]);

  // Save to localStorage
  useEffect(() => {
    if (isClient && storageKey && typeof window !== 'undefined') {
      localStorage.setItem(`multi-panel-sizes-${storageKey}`, JSON.stringify(sizes));
    }
  }, [sizes, storageKey, isClient]);

  const handleMouseDown = useCallback((index: number, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggingIndex(index);
    setDraggedIndices(prev => new Set(prev).add(index));
    dragStartPos.current = e.clientX;
    dragStartSizes.current = [...sizes];
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [sizes]);

  const handleMouseEnter = useCallback((index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredIndex(index);
    }, 1000);
  }, []);

  const handleMouseLeave = useCallback((index: number) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setHoveredIndex(null);
    setDraggedIndices(prev => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  }, []);

  useEffect(() => {
    if (draggingIndex === null) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerWidth = containerRef.current.getBoundingClientRect().width;
      const delta = e.clientX - dragStartPos.current;
      const deltaPercent = (delta / containerWidth) * 100;

      const newSizes = [...dragStartSizes.current];
      const minSizesArray = getMinSizes();

      // Adjust the two panels around the divider
      let leftDelta = deltaPercent;
      let rightDelta = -deltaPercent;

      // Apply constraints
      if (newSizes[draggingIndex] + leftDelta < minSizesArray[draggingIndex]) {
        leftDelta = minSizesArray[draggingIndex] - newSizes[draggingIndex];
        rightDelta = -leftDelta;
      }
      if (newSizes[draggingIndex + 1] + rightDelta < minSizesArray[draggingIndex + 1]) {
        rightDelta = minSizesArray[draggingIndex + 1] - newSizes[draggingIndex + 1];
        leftDelta = -rightDelta;
      }

      newSizes[draggingIndex] += leftDelta;
      newSizes[draggingIndex + 1] += rightDelta;

      setSizes(newSizes);
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex]);

  return (
    <div ref={containerRef} className={`flex flex-row h-full w-full ${className}`}>
      {panels.map((panel, index) => (
        <React.Fragment key={index}>
          <div
            className="h-full flex flex-col"
            style={{
              width: `${sizes[index]}%`,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {panel}
          </div>
          {index < panels.length - 1 && (
            <div
              onMouseDown={(e) => handleMouseDown(index, e)}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={() => handleMouseLeave(index)}
              className={`
                w-1 cursor-col-resize transition-colors relative
                ${draggingIndex === index || draggedIndices.has(index) || hoveredIndex === index
                  ? 'bg-purple-400 hover:bg-purple-500'
                  : 'bg-gray-300 hover:bg-gray-400'
                }
              `}
              style={{ flexShrink: 0, zIndex: 10 }}
            >
              {/* Hover Area for Better Grabbing */}
              <div className="absolute inset-y-0 -left-1 -right-1 w-3" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}