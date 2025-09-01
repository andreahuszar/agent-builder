'use client';

import { useState, useRef, useEffect } from 'react';
import type { Quad, FieldCategory } from '@/lib/pdf-field-extractor';

interface FieldHighlightProps {
  quad: Quad;
  fieldName: string;
  value: string;
  category: FieldCategory;
  scale: number;
  rotation: number;
  onHover: (hovering: boolean, x: number, y: number) => void;
}

// Category colors
const CATEGORY_COLORS: Record<FieldCategory, { bg: string; border: string }> = {
  header: { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' }, // Blue
  vendor: { bg: 'rgba(147, 51, 234, 0.2)', border: 'rgb(147, 51, 234)' }, // Purple
  financial: { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' }, // Green
  line_item: { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgb(251, 146, 60)' }, // Orange
};

export function FieldHighlight({
  quad,
  fieldName,
  value,
  category,
  scale,
  rotation,
  onHover,
}: FieldHighlightProps) {
  const [isHovered, setIsHovered] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  // Calculate bounding box from quad points
  // Quad format: [ulx, uly, urx, ury, llx, lly, lrx, lry]
  const minX = Math.min(quad[0], quad[2], quad[4], quad[6]);
  const maxX = Math.max(quad[0], quad[2], quad[4], quad[6]);
  const minY = Math.min(quad[1], quad[3], quad[5], quad[7]);
  const maxY = Math.max(quad[1], quad[3], quad[5], quad[7]);

  const width = maxX - minX;
  const height = maxY - minY;

  const colors = CATEGORY_COLORS[category];

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsHovered(true);
    const rect = e.currentTarget.getBoundingClientRect();
    onHover(true, rect.left + rect.width / 2, rect.top);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover(false, 0, 0);
  };

  // Apply transformations - coordinates are already scaled by the API
  // We just need to apply the current zoom and rotation from the viewer
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${minX * scale}px`,
    top: `${minY * scale}px`,
    width: `${width * scale}px`,
    height: `${height * scale}px`,
    backgroundColor: isHovered ? colors.bg.replace('0.2', '0.4') : colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 200ms ease',
    transformOrigin: 'center',
    transform: `rotate(${rotation}deg)`,
    pointerEvents: 'auto',
  };

  return (
    <div
      ref={elementRef}
      style={style}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={`${fieldName}: ${value}`}
      className="field-highlight"
    />
  );
}