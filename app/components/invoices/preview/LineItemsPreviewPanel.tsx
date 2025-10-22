'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, X, AlertCircle, ChevronDown, CheckCircle, Edit2, Plus, Trash2, Copy, GitBranch, MoreVertical, Link2, Package, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable, DragOverlay, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

interface InvoiceLineItem {
  id?: string;
  line_no: number;
  description: string;
  qty: number;
  uom: string;
  unit_price: number;
  net_amount: number;
  line_total: number;
  po_line_id?: string;
  display_position?: number; // Position for drag-and-drop (independent of line_no)
}

interface POLineItem {
  id: string;
  line_no: number;
  description: string;
  item_description?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
}

interface MatchResult {
  invoice_line_id: string;
  matched_po_line_id?: string;
  po_line_no?: number;
  qty_variance?: number;
  price_variance?: number;
  within_tolerance: boolean;
  explanation_code?: string;
}

interface LineItemsPreviewPanelProps {
  invoiceLines: InvoiceLineItem[];
  poLines?: POLineItem[];
  matchResults?: MatchResult[];
  currency: string;
  onMaximize?: () => void;
  isMaximized?: boolean;
  invoiceId?: string;
  // External control for collapsed state (used in needs info mode)
  externallyControlled?: boolean;
  externalCollapsed?: boolean;
  onToggleCollapsed?: () => void;
  onLinesUpdate?: (lines: InvoiceLineItem[]) => void;
  showComparison?: boolean;
  startExpanded?: boolean;
  useDetailedVarianceColumns?: boolean; // Use separate Qty Var and Price Var columns instead of Delta
}

// Draggable and Droppable Row Component for drag-and-drop functionality
interface DraggableDroppableRowProps {
  id: string;
  children: (listeners: any, isDragging: boolean, isOver: boolean) => React.ReactNode;
  className?: string;
  isHovered?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function DraggableDroppableRow({
  id,
  children,
  className,
  isHovered = false,
  onMouseEnter,
  onMouseLeave
}: DraggableDroppableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setDragNodeRef,
    isDragging,
  } = useDraggable({
    id,
  });

  const {
    setNodeRef: setDropNodeRef,
    isOver,
  } = useDroppable({
    id,
  });

  // Combine both refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragNodeRef(node);
    setDropNodeRef(node);
  };

  // Replace base className background based on priority: isOver > isHovered > default
  const baseClassName = className?.replace(/bg-\w+/, '').trim() || '';
  const backgroundClass = isOver
    ? 'bg-purple-50 border-l-4 border-purple-500'
    : isHovered
    ? 'bg-purple-50'
    : 'bg-white';

  return (
    <tr
      ref={setNodeRef}
      {...attributes}
      className={`${baseClassName} ${backgroundClass}`}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        transition: 'background-color 200ms, border-color 200ms',
        borderLeftWidth: isOver ? '4px' : '0px',
        borderLeftColor: isOver ? 'rgb(168 85 247)' : 'transparent',
      }}
    >
      {children(listeners, isDragging, isOver)}
    </tr>
  );
}

// Slot type for position-based rendering
interface TableSlot {
  position: number;
  invoiceLine: InvoiceLineItem | null;
  poLine: POLineItem | null;
}

// Empty droppable slot for positions without invoice lines
interface EmptySlotProps {
  position: number;
  colSpan: number;
  isEditMode: boolean;
  isDragPlaceholder?: boolean;
}

function EmptySlot({ position, colSpan, isEditMode, isDragPlaceholder = false }: EmptySlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty-slot-${position}`,
  });

  // In read-only mode, show a simple empty row
  if (!isEditMode) {
    return (
      <tr className="h-[48px] bg-white">
        <td colSpan={colSpan} className="px-1.5 py-2">
          {/* Empty row filler */}
        </td>
      </tr>
    );
  }

  // In edit mode, show droppable slot
  return (
    <tr
      ref={setNodeRef}
      className={`h-[48px] transition-colors ${
        isOver
          ? 'bg-purple-100 border-2 border-dashed border-purple-400'
          : isDragPlaceholder
          ? 'bg-blue-50 border-2 border-dashed border-blue-400'
          : 'bg-gray-50 border border-dashed border-gray-300'
      }`}
    >
      <td colSpan={colSpan} className="px-1.5 py-2 text-center">
        <span className="text-xs italic" style={{ color: isDragPlaceholder ? '#3B82F6' : '#9CA3AF' }}>
          {isOver ? 'Drop here' : isDragPlaceholder ? 'Item being dragged' : 'Empty slot'}
        </span>
      </td>
    </tr>
  );
}

export function LineItemsPreviewPanel({
  invoiceLines,
  poLines = [],
  matchResults = [],
  currency,
  onMaximize,
  isMaximized = false,
  invoiceId,
  externallyControlled = false,
  externalCollapsed = false,
  onToggleCollapsed,
  onLinesUpdate,
  showComparison = false,
  startExpanded = false,
  useDetailedVarianceColumns = false,
}: LineItemsPreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!startExpanded); // Start expanded if startExpanded is true
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableLines, setEditableLines] = useState<InvoiceLineItem[]>(invoiceLines);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [manuallyMatchedLines, setManuallyMatchedLines] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update editable lines when invoice lines change
  // Always initialize display_position to ensure lines are visible in read-only mode
  useEffect(() => {
    const linesWithPositions = invoiceLines.map((line, index) => ({
      ...line,
      display_position: line.display_position ?? index
    }));
    setEditableLines(linesWithPositions);
  }, [invoiceLines]);

  const formatCurrency = (amount: number) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  const toggleCollapsed = () => {
    if (externallyControlled && onToggleCollapsed) {
      onToggleCollapsed();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  // Handle row hover for synchronized highlighting across tables
  const handleRowHover = (position: number) => {
    setHoveredPosition(position);
  };

  const handleRowLeave = () => {
    setHoveredPosition(null);
  };

  // Handle fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Get match result for a specific invoice line
  const getMatchResultForLine = (lineId?: string) => {
    if (!lineId) return null;
    return matchResults.find((mr) => mr.invoice_line_id === lineId);
  };

  // Get PO line that matches an invoice line
  const getMatchedPOLine = (invoiceLine: InvoiceLineItem, lineIndex?: number) => {
    // First try to find a match via match results
    const matchResult = getMatchResultForLine(invoiceLine.id);
    if (matchResult?.matched_po_line_id) {
      return poLines.find(po => po.id === matchResult.matched_po_line_id);
    }

    // If no match result, use index-based matching for simple comparison
    if (lineIndex !== undefined && poLines[lineIndex]) {
      return poLines[lineIndex];
    }

    return null;
  };

  // Count errors in invoice lines (for needs info mode)
  const countErrors = () => {
    // If not showing comparison, don't count comparison errors
    if (!showComparison || poLines.length === 0) {
      // Count validation errors from match results if any
      return matchResults.filter(mr => !mr.within_tolerance).length;
    }

    // If showing comparison, count mismatches
    let errorCount = 0;
    invoiceLines.forEach((invoiceLine, index) => {
      const poLine = getMatchedPOLine(invoiceLine, index);
      if (poLine && hasMismatch(invoiceLine, poLine)) {
        errorCount++;
      }
    });
    return errorCount;
  };

  // Check if there's a mismatch (kept for PO comparison mode)
  const hasMismatch = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null) => {
    if (!poLine) return false;

    // If line is manually marked as matched, no mismatch
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    if (manuallyMatchedLines.has(lineId)) return false;

    // Check quantity mismatch
    if (Math.abs(invoiceLine.qty - poLine.qty_ordered) > 0.01) return true;

    // Check price mismatch
    if (Math.abs(invoiceLine.unit_price - poLine.unit_price) > 0.01) return true;

    // Check total mismatch
    const invoiceTotal = invoiceLine.qty * invoiceLine.unit_price;
    const poTotal = poLine.qty_ordered * poLine.unit_price;
    if (Math.abs(invoiceTotal - poTotal) > 0.01) return true;

    return false;
  };

  // Get status for an invoice line
  const getLineStatus = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): 'variance' | 'matched' | 'missing' => {
    if (!poLine) return 'missing';
    if (hasMismatch(invoiceLine, poLine)) return 'variance';
    return 'matched';
  };

  // Generate random SKU for display purposes
  const generateSKU = (lineNo: number) => {
    const prefixes = ['CH', 'DK', 'TV', 'SF', 'LT', 'BK', 'DS', 'CB'];
    const prefix = prefixes[lineNo % prefixes.length];
    const number = String(lineNo).padStart(4, '0');
    return `${prefix}-${number}`;
  };

  const errorCount = countErrors();

  // Generate slots for position-based rendering
  // Each slot represents a row position and contains either an invoice line, PO line, or both
  const generateSlots = (): TableSlot[] => {
    // Calculate max rows needed (max of invoice display positions and PO line count)
    const maxInvoicePosition = editableLines.reduce((max, line) =>
      Math.max(max, line.display_position ?? 0), -1
    );
    const maxRows = Math.max(
      maxInvoicePosition + 1,
      editableLines.length, // Ensure at least as many slots as lines
      poLines.length
    );

    // Create slots array with positions 0 to maxRows-1
    const slots: TableSlot[] = Array.from({ length: maxRows }, (_, position) => {
      // If we're dragging and this is the position of the dragged item, show it as empty
      const lineAtPosition = editableLines.find((line, idx) =>
        line.display_position !== undefined
          ? line.display_position === position
          : idx === position
      );

      const isDraggedPosition = activeDragId && lineAtPosition &&
        (lineAtPosition.id || `line-${lineAtPosition.line_no}`) === activeDragId;

      return {
        position,
        // If this is the dragged position, treat it as empty (but keep the line reference for the placeholder)
        invoiceLine: isDraggedPosition ? null : lineAtPosition || null,
        poLine: poLines[position] || null
      };
    });

    return slots;
  };

  const slots = generateSlots();

  // Handle line editing
  const handleLineChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const updatedLines = [...editableLines];
    const line = updatedLines[index];

    // Update the field
    (line as any)[field] = value;

    // Recalculate line total if qty or price changed
    if (field === 'qty' || field === 'unit_price') {
      line.line_total = line.qty * line.unit_price;
      line.net_amount = line.line_total;
    }

    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Add new line
  const handleAddLine = () => {
    // Find the highest line_no and add 1 (NOT array length + 1)
    // This ensures correct numbering even after dragging/reordering
    const maxLineNo = editableLines.reduce((max, line) =>
      Math.max(max, line.line_no), 0
    );

    const newLine: InvoiceLineItem = {
      id: `new-line-${Date.now()}`,
      line_no: maxLineNo + 1,
      description: '',
      qty: 1,
      uom: 'Units',
      unit_price: 0,
      net_amount: 0,
      line_total: 0
    };
    const updatedLines = [...editableLines, newLine];
    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Remove line
  const handleRemoveLine = (index: number) => {
    const updatedLines = editableLines.filter((_, i) => i !== index);
    // Renumber lines
    updatedLines.forEach((line, i) => {
      line.line_no = i + 1;
    });
    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  // Mark line as manually matched
  const handleMarkAsMatched = (lineId: string) => {
    setManuallyMatchedLines(prev => {
      const newSet = new Set(prev);
      newSet.add(lineId);
      return newSet;
    });
    setOpenDropdownId(null);
  };

  // Toggle dropdown for a specific line
  const toggleDropdown = (lineId: string) => {
    setOpenDropdownId(prev => prev === lineId ? null : lineId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId && !(event.target as Element).closest('.actions-dropdown')) {
        setOpenDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openDropdownId]);

  // Toggle edit mode
  const toggleEditMode = () => {
    if (!isEditMode) {
      // Entering edit mode - positions are already initialized in useEffect
    } else {
      // Exiting edit mode - ensure we save changes
      onLinesUpdate?.(editableLines);
    }
    setIsEditMode(!isEditMode);
  };

  // Set up sensors for drag interaction
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle drag start - track which item is being dragged
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveDragId(active.id as string);
  };

  // Handle drag end - swap positions, not array order (keeps line_no unchanged)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Clear the active drag ID
    setActiveDragId(null);

    if (!over) {
      return;
    }

    // Extract target position from over ID
    // Could be "line-X", "empty-slot-Y", or a line ID
    const getPositionFromId = (id: string | number): number | null => {
      const idStr = String(id);
      if (idStr.startsWith('empty-slot-')) {
        return parseInt(idStr.replace('empty-slot-', ''), 10);
      }
      // Find the line with this ID and get its display_position
      const line = editableLines.find(l => (l.id || `line-${l.line_no}`) === idStr);
      return line?.display_position ?? null;
    };

    const draggedLine = editableLines.find(
      (line) => (line.id || `line-${line.line_no}`) === active.id
    );

    if (!draggedLine) return;

    const oldPosition = draggedLine.display_position!;
    const newPosition = getPositionFromId(over.id);

    if (newPosition === null || oldPosition === newPosition) {
      return;
    }

    // Swap positions: dragged line goes to new position,
    // line at new position (if any) goes to old position
    const updatedLines = editableLines.map(line => {
      if (line === draggedLine) {
        return { ...line, display_position: newPosition };
      }
      if (line.display_position === newPosition) {
        return { ...line, display_position: oldPosition };
      }
      return line;
    });

    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-white ${
        isFullscreen ? 'fixed inset-0 z-50' : 'h-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-purple-600" />
          <h3 className="text-xs font-semibold text-gray-950 uppercase tracking-wider">LINE ITEMS</h3>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            {invoiceLines.length} {invoiceLines.length === 1 ? 'item' : 'items'}
          </span>
          {errorCount > 0 ? (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <AlertCircle className="h-3 w-3" />
              {errorCount} {errorCount === 1 ? 'variance' : 'variances'}
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              <CheckCircle className="h-3 w-3" />
              Valid
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-950"
            title={isFullscreen ? 'Exit Fullscreen' : 'Maximize'}
          >
            {isFullscreen ? (
              <X className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto transition-all duration-200">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {showComparison && poLines.length > 0 ? (
            // Horizontal scrollable layout when PO lines exist - Invoice table first, then PO table
            <div className="flex min-h-full w-full">
              {/* Invoice Lines */}
              <div className="flex-shrink-0 border-r border-gray-200">
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={useDetailedVarianceColumns ? (isEditMode ? 10 : 8) : (isEditMode ? 11 : 9)} className="px-4 bg-white border-b h-[42px]">
                        <div className="flex items-center justify-between h-full">
                          <span className="text-sm font-semibold text-gray-950">Invoice</span>
                          <button
                            onClick={toggleEditMode}
                            className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                              isEditMode
                                ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                                : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                            }`}
                          >
                            {isEditMode ? 'Done' : 'Edit'}
                          </button>
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      {isEditMode && (
                        <th className="px-2 text-center text-xs font-medium text-gray-800 uppercase w-8"></th>
                      )}
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Status</th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                      {!useDetailedVarianceColumns && (
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Delta</th>
                      )}
                      {isEditMode && (
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase w-32">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {slots.map((slot) => {
                        const line = slot.invoiceLine;

                        // Check if this position has a dragged item
                        const draggedLineAtPosition = editableLines.find((l, idx) =>
                          (l.display_position !== undefined ? l.display_position === slot.position : idx === slot.position) &&
                          (l.id || `line-${l.line_no}`) === activeDragId
                        );

                        // If an item is being dragged from this position, show a placeholder
                        if (draggedLineAtPosition && isEditMode) {
                          return (
                            <EmptySlot
                              key={`dragged-placeholder-${slot.position}`}
                              position={slot.position}
                              colSpan={useDetailedVarianceColumns ? (isEditMode ? 10 : 8) : (isEditMode ? 11 : 9)}
                              isEditMode={isEditMode}
                              isDragPlaceholder={true}
                            />
                          );
                        }

                        // If no invoice line at this position, show empty slot
                        if (!line) {
                          return (
                            <EmptySlot
                              key={`empty-slot-${slot.position}`}
                              position={slot.position}
                              colSpan={useDetailedVarianceColumns ? (isEditMode ? 10 : 8) : (isEditMode ? 11 : 9)}
                              isEditMode={isEditMode}
                            />
                          );
                        }

                        // Find the line's index in editableLines array for handleLineChange
                        const lineIndex = editableLines.findIndex(l => l === line);
                        const matchedPO = slot.poLine;
                        const mismatch = hasMismatch(line, matchedPO);
                        const status = getLineStatus(line, matchedPO);

                        const rowContent = (listeners?: any, isDragging?: boolean, isOver?: boolean) => (
                          <>
                            {isEditMode && (
                              <td className="px-2 py-2 text-center cursor-grab active:cursor-grabbing" {...listeners}>
                                <GripVertical className="h-4 w-4 text-gray-400" />
                              </td>
                            )}
                            <td className="px-1.5 py-2 text-xs text-gray-950">{line.line_no}</td>
                          <td className="px-1.5 py-2 text-xs text-center">
                            {status === 'variance' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                                Variance
                              </span>
                            )}
                            {status === 'matched' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Matched
                              </span>
                            )}
                            {status === 'missing' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Missing
                              </span>
                            )}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-gray-950">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                              />
                            ) : (
                              <div className="truncate max-w-[200px]" title={line.description}>
                                {line.description}
                              </div>
                            )}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-gray-950">
                            {generateSKU(line.line_no)}
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                              ? 'bg-red-50 border border-red-300'
                              : ''
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.qty}
                                onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                className={`w-14 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01
                                    ? 'border border-red-300'
                                    : 'border border-gray-300'
                                }`}
                              />
                            ) : (
                              line.qty
                            )}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-center text-gray-950">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.uom}
                                onChange={(e) => handleLineChange(lineIndex, 'uom', e.target.value)}
                                className="w-16 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                              />
                            ) : (
                              line.uom
                            )}
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                              ? 'bg-red-50 border border-red-300'
                              : ''
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.unit_price}
                                onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                className={`w-24 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01
                                    ? 'border border-red-300'
                                    : 'border border-gray-300'
                                }`}
                              />
                            ) : (
                              formatCurrency(line.unit_price)
                            )}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                            {formatCurrency(line.line_total)}
                          </td>
                          {!useDetailedVarianceColumns && (
                            <td className="px-1.5 py-2 text-xs">
                              {matchedPO && (
                                <div className="flex flex-col items-center gap-0.5">
                                  {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                    <span className="text-xs text-red-600 font-semibold">
                                      Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                    </span>
                                  )}
                                  {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                    <span className="text-xs text-red-600 font-semibold">
                                      Price: {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                    </span>
                                  )}
                                  {Math.abs(line.qty - matchedPO.qty_ordered) <= 0.01 && Math.abs(line.unit_price - matchedPO.unit_price) <= 0.01 && (
                                    <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                  )}
                                </div>
                              )}
                              {!matchedPO && (
                                <span className="text-xs text-gray-400">No PO</span>
                              )}
                            </td>
                          )}
                          {isEditMode && (
                            <td className="px-1.5 py-2 text-sm">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  onClick={() => handleRemoveLine(lineIndex)}
                                  className="p-1 text-gray-900 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Delete line"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="relative actions-dropdown">
                                  <button
                                    onClick={() => toggleDropdown(line.id || `line-${line.line_no}`)}
                                    className="p-1 text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                    title="More actions"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>
                                  {openDropdownId === (line.id || `line-${line.line_no}`) && (
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                      <button
                                        onClick={() => handleMarkAsMatched(line.id || `line-${line.line_no}`)}
                                        className="w-full px-4 py-2 text-left text-sm text-gray-950 hover:bg-gray-50 transition-colors"
                                      >
                                        Mark as Matched
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          </>
                        );

                        return isEditMode ? (
                          <DraggableDroppableRow
                            key={line.id || line.line_no}
                            id={line.id || `line-${line.line_no}`}
                            className="h-[48px] bg-white"
                            isHovered={hoveredPosition === slot.position}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {rowContent}
                          </DraggableDroppableRow>
                        ) : (
                          <tr
                            key={line.id || line.line_no}
                            className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {rowContent()}
                          </tr>
                        );
                      })}
                    {isEditMode && (
                      <tr className="h-[40px]">
                        <td colSpan={useDetailedVarianceColumns ? 10 : 11} className="px-1.5 py-2 align-middle">
                          <button
                            onClick={handleAddLine}
                            className="flex items-center gap-1.5 text-sm text-purple-700 hover:text-purple-900 font-medium transition-colors"
                          >
                            <Plus className="h-4 w-4" />
                            Add Line
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr className="h-[52px]">
                      <td colSpan={isEditMode ? 8 : 7} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950">
                        Invoice Total:
                      </td>
                      <td className="px-1.5 py-2 text-right text-sm font-bold text-gray-950">
                        {formatCurrency(invoiceLines.reduce((sum, line) => sum + line.line_total, 0))}
                      </td>
                      {!useDetailedVarianceColumns && (
                        <td className="px-1.5 py-2 text-center">
                          {(() => {
                            const invoiceTotal = invoiceLines.reduce((sum, line) => sum + line.line_total, 0);
                            const poTotal = poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0);
                            const delta = invoiceTotal - poTotal;
                            if (Math.abs(delta) > 0.01) {
                              return (
                                <span className={`text-xs font-bold ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                  {delta > 0 ? '+' : ''}{formatCurrency(delta)}
                                </span>
                              );
                            }
                            return <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />;
                          })()}
                        </td>
                      )}
                      {/* Empty cell for Actions column in edit mode */}
                      {isEditMode && (
                        <td className="px-1.5 py-2"></td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PO Lines */}
              <div className="flex-shrink-0">
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={6} className="px-4 bg-white border-b h-[42px]">
                        <div className="flex items-center h-full">
                          <span className="text-sm font-semibold text-gray-950">Purchase Order</span>
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {slots.map((slot) => {
                      const matchedPO = slot.poLine;
                      const invLine = slot.invoiceLine;

                      if (!matchedPO) {
                        // Show empty row for positions without PO line
                        return (
                          <tr
                            key={`po-empty-${slot.position}`}
                            className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            <td className="px-1.5 py-2 text-xs text-gray-400 italic text-center align-middle" colSpan={6}>
                              No PO line
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={matchedPO.id}
                          className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          <td className="px-1.5 py-2 text-xs text-gray-950">{matchedPO.line_no}</td>
                          <td className="px-1.5 py-2 text-xs text-gray-950">
                            <div className="truncate max-w-[200px]" title={matchedPO.description}>
                              {matchedPO.item_description || matchedPO.description}
                            </div>
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            invLine && Math.abs(matchedPO.qty_ordered - invLine.qty) > 0.01 ? 'bg-red-50 border border-red-300' : ''
                          }`}>
                            {matchedPO.qty_ordered}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-center text-gray-950">{matchedPO.uom}</td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            invLine && Math.abs(matchedPO.unit_price - invLine.unit_price) > 0.01 ? 'bg-red-50 border border-red-300' : ''
                          }`}>
                            {formatCurrency(matchedPO.unit_price)}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                            {formatCurrency(matchedPO.qty_ordered * matchedPO.unit_price)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Empty spacer row in edit mode to match Invoice table's "Add Line" row */}
                    {isEditMode && (
                      <tr className="h-[40px]">
                        <td colSpan={6} className="px-1.5 py-2"></td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr className="h-[52px]">
                      <td colSpan={5} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950">
                        PO Total:
                      </td>
                      <td className="px-1.5 py-2 text-right text-sm font-bold text-gray-950">
                        {formatCurrency(poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0))}
                      </td>
                      {/* Empty cells for visual continuity with Invoice table columns */}
                      {!useDetailedVarianceColumns && (
                        <td className="px-1.5 py-2"></td>
                      )}
                      {isEditMode && (
                        <td className="px-1.5 py-2"></td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Continuation table to create visual flow between PO and Variance */}
              <div className="flex-1">
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    {/* Two-row header to match Invoice/PO/Variance structure */}
                    <tr>
                      <th className="px-4 bg-white border-b border-r border-gray-200 h-[42px]">
                        <div className="h-full"></div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      <th className="px-1.5 border-r border-gray-200">&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {slots.map((slot) => {
                      const hasPOLine = slot.poLine !== null;

                      // Only show continuation row if there's a PO line at this position
                      // This creates visual continuity from PO table to Variance column
                      if (!hasPOLine) {
                        return null;
                      }

                      return (
                        <tr
                          key={`continuation-${slot.position}`}
                          className={`h-[48px] border-r border-gray-200 ${
                            hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'
                          }`}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          <td className="px-1.5 py-2">&nbsp;</td>
                        </tr>
                      );
                    })}

                    {/* Empty spacer row in edit mode to match "Add Line" row */}
                    {isEditMode && (
                      <tr className="h-[40px] border-r border-gray-200 bg-white">
                        <td className="px-1.5 py-2">&nbsp;</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr className="h-[52px] border-r border-gray-200">
                      <td className="px-1.5 py-2">&nbsp;</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Floating Variance Panel - Only shown when useDetailedVarianceColumns is true */}
              {useDetailedVarianceColumns && (
                <div className="sticky right-0 flex-shrink-0 border-l-2 border-gray-300 shadow-lg z-20 bg-white">
                  <table className="min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      {/* Two-row header to match Invoice/PO structure */}
                      <tr>
                        <th colSpan={2} className="px-4 bg-white border-b h-[42px]">
                          <div className="flex items-center h-full">
                            <span className="text-sm font-semibold text-gray-950">Variance</span>
                          </div>
                        </th>
                      </tr>
                      <tr className="h-[40px]">
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty Var</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price Var</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {slots.map((slot) => {
                        const line = slot.invoiceLine;
                        const matchedPO = slot.poLine;

                        // If no invoice line at this position, show empty row
                        if (!line) {
                          return isEditMode ? (
                            <tr
                              key={`variance-empty-${slot.position}`}
                              className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-gray-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                              onMouseEnter={() => handleRowHover(slot.position)}
                              onMouseLeave={handleRowLeave}
                            >
                              <td colSpan={2} className="px-1.5 py-2 text-center">
                                <span className="text-xs text-gray-400 italic">-</span>
                              </td>
                            </tr>
                          ) : null;
                        }

                        return (
                          <tr
                            key={line.id || line.line_no}
                            className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {/* Qty Variance Column */}
                            <td className="px-1.5 py-2 text-xs text-right">
                              {matchedPO ? (
                                Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? (
                                  <span className="text-red-600 font-semibold">
                                    {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>

                            {/* Price Variance Column */}
                            <td className="px-1.5 py-2 text-xs text-right">
                              {matchedPO ? (
                                Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? (
                                  <span className="text-red-600 font-semibold">
                                    {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                  </span>
                                ) : (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600 mx-auto" />
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Empty spacer row in edit mode to match "Add Line" row */}
                      {isEditMode && (
                        <tr className="h-[40px]">
                          <td colSpan={2} className="px-1.5 py-2"></td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-gray-50 sticky bottom-0">
                      <tr className="h-[52px]">
                        {/* Empty footer cells for visual continuity */}
                        <td colSpan={2} className="px-1.5 py-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ) : (
            // Full width layout when no PO lines (needs info mode)
            <div className="h-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th colSpan={poLines.length > 0 ? (isEditMode ? 11 : 10) : (isEditMode ? 10 : 9)} className="px-4 bg-white border-b h-[42px]">
                      <div className="flex items-center justify-between h-full">
                        <span className="text-sm font-semibold text-gray-950">Invoice</span>
                        <button
                          onClick={toggleEditMode}
                          className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                            isEditMode
                              ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                              : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                          }`}
                        >
                          {isEditMode ? 'Done' : 'Edit'}
                        </button>
                      </div>
                    </th>
                  </tr>
                  <tr className="h-[40px]">
                    {isEditMode && (
                      <th className="px-2 text-center text-xs font-medium text-gray-800 uppercase w-8"></th>
                    )}
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                    <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Status</th>
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                    <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                    <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                    <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                    <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                    {poLines.length > 0 && (
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Delta</th>
                    )}
                    <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {slots.map((slot) => {
                      const line = slot.invoiceLine;

                      // Check if this position has a dragged item
                      const draggedLineAtPosition = editableLines.find((l, idx) =>
                        (l.display_position !== undefined ? l.display_position === slot.position : idx === slot.position) &&
                        (l.id || `line-${l.line_no}`) === activeDragId
                      );

                      // If an item is being dragged from this position, show a placeholder
                      if (draggedLineAtPosition && isEditMode) {
                        return (
                          <EmptySlot
                            key={`dragged-placeholder-${slot.position}`}
                            position={slot.position}
                            colSpan={poLines.length > 0 ? (isEditMode ? 11 : 10) : (isEditMode ? 10 : 9)}
                            isEditMode={isEditMode}
                          />
                        );
                      }

                      // If no invoice line at this position, show empty slot
                      if (!line) {
                        return (
                          <EmptySlot
                            key={`empty-slot-${slot.position}`}
                            position={slot.position}
                            colSpan={poLines.length > 0 ? (isEditMode ? 11 : 10) : (isEditMode ? 10 : 9)}
                            isEditMode={isEditMode}
                          />
                        );
                      }

                      // Find the line's index in editableLines array for handleLineChange
                      const lineIndex = editableLines.findIndex(l => l === line);
                      const matchedPO = slot.poLine;
                      const mismatch = hasMismatch(line, matchedPO);
                      const status = getLineStatus(line, matchedPO);

                      const rowContent = (listeners?: any, isDragging?: boolean, isOver?: boolean) => (
                        <>
                          {isEditMode && (
                            <td className="px-2 py-2 text-center cursor-grab active:cursor-grabbing" {...listeners}>
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </td>
                          )}
                          <td className="px-1.5 py-2 text-xs text-gray-950">
                            {line.line_no}
                          </td>
                        <td className="px-1.5 py-2 text-xs text-center">
                          {status === 'variance' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              Variance
                            </span>
                          )}
                          {status === 'matched' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Matched
                            </span>
                          )}
                          {status === 'missing' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Missing
                            </span>
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-gray-950">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                            />
                          ) : (
                            <div className="truncate max-w-[400px]" title={line.description}>
                              {line.description}
                            </div>
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-gray-950">
                          {generateSKU(line.line_no)}
                        </td>
                        <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                          matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                            ? 'bg-red-50 border border-red-300'
                            : ''
                        }`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                              className={`w-14 px-2 py-1 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01
                                  ? 'border border-red-300'
                                  : 'border border-gray-300'
                              }`}
                            />
                          ) : (
                            line.qty
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-center text-gray-950">
                          {isEditMode ? (
                            <input
                              type="text"
                              value={line.uom}
                              onChange={(e) => handleLineChange(lineIndex, 'uom', e.target.value)}
                              className="w-20 px-2 py-1 text-xs text-center border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                            />
                          ) : (
                            line.uom
                          )}
                        </td>
                        <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                          matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                            ? 'bg-red-50 border border-red-300'
                            : ''
                        }`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              className={`w-24 px-2 py-1 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01
                                  ? 'border border-red-300'
                                  : 'border border-gray-300'
                              }`}
                            />
                          ) : (
                            formatCurrency(line.unit_price)
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                          {formatCurrency(line.line_total)}
                        </td>
                        {poLines.length > 0 && (
                          <td className="px-1.5 py-2 text-xs">
                            {matchedPO && (
                              <div className="flex flex-col items-center gap-0.5">
                                {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                  <span className="text-xs text-red-600 font-semibold">
                                    Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                )}
                                {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                  <span className="text-xs text-red-600 font-semibold">
                                    Price: {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                  </span>
                                )}
                                {Math.abs(line.qty - matchedPO.qty_ordered) <= 0.01 && Math.abs(line.unit_price - matchedPO.unit_price) <= 0.01 && (
                                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                                )}
                              </div>
                            )}
                            {!matchedPO && (
                              <span className="text-xs text-gray-400">No PO</span>
                            )}
                          </td>
                        )}
                        <td className="px-1.5 py-2 text-xs text-center">
                          {isEditMode && (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleRemoveLine(lineIndex)}
                                className="p-1 text-gray-900 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title="Remove line"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <div className="relative actions-dropdown">
                                <button
                                  onClick={() => toggleDropdown(line.id || `line-${line.line_no}`)}
                                  className="p-1 text-gray-900 hover:bg-gray-100 rounded transition-colors"
                                  title="More actions"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                                {openDropdownId === (line.id || `line-${line.line_no}`) && (
                                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                                    <button
                                      onClick={() => handleMarkAsMatched(line.id || `line-${line.line_no}`)}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-950 hover:bg-gray-50 transition-colors"
                                    >
                                      Mark as Matched
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </td>
                        </>
                      );

                      return isEditMode ? (
                        <DraggableDroppableRow
                          key={line.id || line.line_no}
                          id={line.id || `line-${line.line_no}`}
                          className="bg-white"
                          isHovered={hoveredPosition === slot.position}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          {rowContent}
                        </DraggableDroppableRow>
                      ) : (
                        <tr
                          key={line.id || line.line_no}
                          className={hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          {rowContent()}
                        </tr>
                      );
                    })}
                  {/* Add new line button row */}
                  {isEditMode && (
                    <tr className="bg-gray-50 hover:bg-gray-100">
                      <td colSpan={poLines.length > 0 ? 11 : 10} className="px-1.5 py-2">
                        <button
                          onClick={handleAddLine}
                          className="flex items-center gap-2 text-sm text-purple-600 hover:text-purple-700 font-medium"
                        >
                          <Plus className="h-4 w-4" />
                          Add Line Item
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-gray-50 sticky bottom-0">
                  <tr className="h-[52px]">
                    <td colSpan={isEditMode ? 8 : 7} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950">
                      Invoice Total:
                    </td>
                    <td className="px-1.5 py-2 text-right text-sm font-bold text-gray-950">
                      {formatCurrency(editableLines.reduce((sum, line) => sum + line.line_total, 0))}
                    </td>
                    {poLines.length > 0 && <td></td>}
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Drag Overlay - shows the dragged item as a floating element */}
          <DragOverlay>
            {activeDragId ? (
              <div className="bg-white shadow-lg rounded border-2 border-purple-500 opacity-95">
                <table className="w-full">
                  <tbody>
                    <tr className="h-[48px]">
                      {(() => {
                        const draggedLine = editableLines.find(
                          line => (line.id || `line-${line.line_no}`) === activeDragId
                        );
                        if (!draggedLine) return null;

                        return (
                          <>
                            <td className="px-2 py-2 text-center">
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </td>
                            <td className="px-1.5 py-2 text-xs text-gray-950">#{draggedLine.line_no}</td>
                            <td className="px-1.5 py-2 text-xs text-gray-950 max-w-[200px] truncate">
                              {draggedLine.description}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-right text-gray-950">{draggedLine.qty}</td>
                            <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                              {formatCurrency(draggedLine.unit_price)}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                              {formatCurrency(draggedLine.line_total)}
                            </td>
                          </>
                        );
                      })()}
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}