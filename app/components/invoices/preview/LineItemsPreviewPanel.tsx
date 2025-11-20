'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Maximize2, Minimize2, X, AlertCircle, ChevronDown, CheckCircle, Edit2, Plus, Trash2, Copy, GitBranch, MoreVertical, Link2, Package, GripVertical, Zap, Sparkles, List, ArrowDownWideNarrow } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable, DragOverlay, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Switch from '@radix-ui/react-switch';
import { SmartMatchPopover } from '../SmartMatchPopover';
import { SubstitutionSuggestionPopover } from '../SubstitutionSuggestionPopover';
import { UomMatchPopover } from '../UomMatchPopover';
import { useToast } from '@/app/components/ui/Toast';
import { SparkleButton } from '../SparkleButton';
import { CustomRulePopover, UnitConversionRule } from '../CustomRulePopover';
import { TeachRuleDrawer } from '../TeachRuleDrawer';

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
  suggested_po_match?: {
    po_line_id: string;
    po_line_no: number;
    po_description: string;
    po_qty: number;
    po_unit_price: number;
    po_uom: string;
    confidence: number;
    reason: string;
    differences: Array<{
      field: string;
      invoice_value: string;
      po_value: string;
    }>;
  };
  uom_conversion?: {
    invoice_qty: number;
    invoice_uom: string;
    po_qty: number;
    po_uom: string;
    conversion_factor: number;
    explanation: string;
  };
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
  hideInternalHeader?: boolean; // Hide the internal LINE ITEMS header bar (for accordion integration)
  hideEditButton?: boolean; // Hide the Edit button in the Invoice table header
  externalEditMode?: boolean; // External control for edit mode
  onEditModeChange?: (isEditing: boolean) => void; // Callback when edit mode changes
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
    ? 'bg-gray-50 border-l-4 border-purple-500'
    : isHovered
    ? 'bg-gray-50'
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

// Collapsible "Matched Items" Row Component
interface MatchedItemsRowProps {
  isExpanded: boolean;
  onToggle: () => void;
  matchedCount: number;
  colSpan: number;
}

function MatchedItemsRow({ isExpanded, onToggle, matchedCount, colSpan }: MatchedItemsRowProps) {
  return (
    <tr className="bg-gray-50 hover:bg-gray-100 transition-colors">
      <td colSpan={colSpan} className="px-4 py-2">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 w-full text-left text-xs font-medium text-gray-700"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
          />
          <span>Matched Items ({matchedCount})</span>
        </button>
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
  hideInternalHeader = false,
  hideEditButton = false,
  externalEditMode,
  onEditModeChange,
}: LineItemsPreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!startExpanded); // Start expanded if startExpanded is true
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableLines, setEditableLines] = useState<InvoiceLineItem[]>(invoiceLines);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [manuallyMatchedLines, setManuallyMatchedLines] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [unmatchedLines, setUnmatchedLines] = useState<Set<string>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [openSuggestionId, setOpenSuggestionId] = useState<string | null>(null);
  const [customRules, setCustomRules] = useState<Map<string, UnitConversionRule>>(new Map());
  const [teachRuleDrawerOpen, setTeachRuleDrawerOpen] = useState(false);
  const [selectedLineForRule, setSelectedLineForRule] = useState<InvoiceLineItem | null>(null);
  const [viewMode, setViewMode] = useState<'default' | 'grouped'>('default');
  const [matchedItemsExpanded, setMatchedItemsExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const flexContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasEnoughSpace, setHasEnoughSpace] = useState(false);
  const { showToast} = useToast();

  // Toggle states for showing PO and Receipt data
  const [showPO, setShowPO] = useState(showComparison && poLines.length > 0);
  const [showReceipt, setShowReceipt] = useState(false);

  // Update editable lines when invoice lines change
  // Always initialize display_position to ensure lines are visible in read-only mode
  useEffect(() => {
    const linesWithPositions = invoiceLines.map((line, index) => ({
      ...line,
      display_position: line.display_position ?? index
    }));
    setEditableLines(linesWithPositions);
  }, [invoiceLines]);

  // Handle ESC key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);

  // ResizeObserver to detect when there's enough horizontal space for variance column
  useEffect(() => {
    if (!useDetailedVarianceColumns || !flexContainerRef.current) {
      return;
    }

    const calculateSpaceAvailability = () => {
      const container = flexContainerRef.current;
      if (!container) return;

      // Get actual widths of the tables
      const invoiceTable = container.querySelector('table:first-of-type');
      const poTable = container.querySelectorAll('table')[1];
      const varianceTable = container.querySelectorAll('table')[2];

      const invoiceWidth = invoiceTable?.scrollWidth || 800;
      const poWidth = poTable?.scrollWidth || 600;

      // For variance width, get the parent div (the one with border-l-2 border-gray-300)
      const varianceContainer = varianceTable?.parentElement;
      let varianceWidth = varianceContainer?.scrollWidth || varianceTable?.scrollWidth || 250;

      // If variance width seems too small (< 150px), use a reasonable estimate
      // The variance column has two columns (QTY VAR and PRICE VAR)
      if (varianceWidth < 150) {
        varianceWidth = 180; // Conservative estimate for 2-column variance table
      }

      const totalNeeded = invoiceWidth + poWidth + varianceWidth;

      // Find the scrollable container to get the actual available viewport width
      let currentElement = container.parentElement;
      let scrollContainer = null;
      let attempts = 0;
      const maxAttempts = 20;

      while (currentElement && attempts < maxAttempts) {
        const computedStyle = window.getComputedStyle(currentElement);
        const overflowX = computedStyle.overflowX;

        if (overflowX === 'auto' || overflowX === 'scroll') {
          scrollContainer = currentElement;
          break;
        }

        currentElement = currentElement.parentElement;
        attempts++;
      }

      // Available width is the scrollable container's viewport width
      const availableWidth = scrollContainer?.clientWidth || container.clientWidth;

      // Show spacer when all tables can fit within the viewport
      // Very small buffer to account for borders and padding
      const hasSpace = availableWidth >= totalNeeded + 5;

      // Uncomment for debugging:
      // console.log('[Variance Debug]', {
      //   availableWidth,
      //   invoiceWidth,
      //   poWidth,
      //   varianceWidth,
      //   totalNeeded: totalNeeded + 20,
      //   hasSpace,
      //   willShowSpacer: hasSpace,
      //   willBeSticky: !hasSpace
      // });

      setHasEnoughSpace(hasSpace);
    };

    // Find the scrollable container to observe
    let currentElement = flexContainerRef.current.parentElement;
    let scrollContainer = null;
    let attempts = 0;
    const maxAttempts = 20;

    while (currentElement && attempts < maxAttempts) {
      const computedStyle = window.getComputedStyle(currentElement);
      const overflowX = computedStyle.overflowX;

      if (overflowX === 'auto' || overflowX === 'scroll') {
        scrollContainer = currentElement;
        break;
      }

      currentElement = currentElement.parentElement;
      attempts++;
    }

    // Set up ResizeObserver on the scrollable container
    const resizeObserver = new ResizeObserver(() => {
      calculateSpaceAvailability();
    });

    if (scrollContainer) {
      resizeObserver.observe(scrollContainer);
    }

    // Also observe window resize
    const handleResize = () => calculateSpaceAvailability();
    window.addEventListener('resize', handleResize);

    // Initial calculation - wait for tables to render
    setTimeout(calculateSpaceAvailability, 100);
    setTimeout(calculateSpaceAvailability, 500); // Second check after everything settles

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [useDetailedVarianceColumns, showPO, poLines.length]);

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

  // Handle smart match unmatch action
  const handleUnmatch = (lineId: string) => {
    setUnmatchedLines(prev => new Set(prev).add(lineId));
    setOpenPopoverId(null);
    showToast("Match removed. These descriptions won't auto-match in future invoices.", 'info');
  };

  // Handle accepting substitution suggestion
  const handleAcceptSuggestion = (lineId: string, suggestion: any) => {
    setAcceptedSuggestions(prev => new Set(prev).add(lineId));

    // Update editable lines to match with suggested PO line
    const updatedLines = editableLines.map(line => {
      const id = line.id || `line-${line.line_no}`;
      if (id === lineId) {
        return { ...line, po_line_id: suggestion.po_line_id };
      }
      return line;
    });

    setEditableLines(updatedLines);
    onLinesUpdate?.(updatedLines);

    showToast('Substitution accepted and learned. Similar matches will be applied automatically in the future.');
    setOpenSuggestionId(null);
  };

  // Handle rejecting substitution suggestion
  const handleRejectSuggestion = (lineId: string) => {
    setRejectedSuggestions(prev => new Set(prev).add(lineId));
    showToast('Suggestion rejected. Line marked as unmatched.');
    setOpenSuggestionId(null);
  };

  // Handle opening teach rule drawer
  const handleOpenTeachRuleDrawer = (line: InvoiceLineItem) => {
    setSelectedLineForRule(line);
    setTeachRuleDrawerOpen(true);
  };

  // Handle confirming custom rule
  const handleConfirmRule = (rule: any) => {
    if (!selectedLineForRule) return;

    const lineId = selectedLineForRule.id || `line-${selectedLineForRule.line_no}`;

    // Create custom rule object
    const newRule: UnitConversionRule = {
      id: `rule-${Date.now()}`,
      lineId: lineId,
      description: rule.naturalLanguage,
      fromUnit: rule.fromUnit,
      fromQuantity: rule.fromQuantity,
      toUnit: rule.toUnit,
      toQuantity: rule.toQuantity,
      vendorName: "BuildTech Supplies Ltd",
      createdBy: "User", // TODO: Get actual user name
      createdAt: new Date()
    };

    // Add rule to custom rules map
    setCustomRules(prev => {
      const updated = new Map(prev);
      updated.set(lineId, newRule);
      return updated;
    });

    // Remove from unmatched lines if it was there
    setUnmatchedLines(prev => {
      const updated = new Set(prev);
      updated.delete(lineId);
      return updated;
    });

    // Close drawer
    setTeachRuleDrawerOpen(false);
    setSelectedLineForRule(null);

    showToast('Conversion rule applied! This line is now matched.', 'success');
  };

  // Handle editing custom rule
  const handleEditRule = (line: InvoiceLineItem) => {
    setSelectedLineForRule(line);
    setTeachRuleDrawerOpen(true);
  };

  // Handle removing custom rule
  const handleRemoveRule = (lineId: string) => {
    setCustomRules(prev => {
      const updated = new Map(prev);
      updated.delete(lineId);
      return updated;
    });

    setOpenPopoverId(null);
    showToast('Custom conversion rule removed.', 'info');
  };


  // Check if line has suggestion and it's not yet accepted/rejected
  const hasSuggestion = (line: InvoiceLineItem): boolean => {
    const lineId = line.id || `line-${line.line_no}`;
    return !!line.suggested_po_match &&
           !acceptedSuggestions.has(lineId) &&
           !rejectedSuggestions.has(lineId);
  };

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
    if (!showPO || poLines.length === 0) {
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
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;

    // Check accepted suggestions FIRST (treat as matched)
    if (acceptedSuggestions.has(lineId)) {
      return 'matched';
    }

    // Check rejected suggestions (treat as variance)
    if (rejectedSuggestions.has(lineId)) {
      return 'variance';
    }

    // Check if there's a pending suggestion - treat as variance (not yet matched)
    if (hasSuggestion(invoiceLine)) {
      return 'variance';
    }

    // Check if manually unmatched - this overrides other status
    if (unmatchedLines.has(lineId)) {
      return 'variance';
    }

    // Check if line has smart match applied (UOM or description difference auto-matched) - treat as matched
    if (poLine && (hasMatchedUomDifference(invoiceLine, poLine) || hasMatchedDescriptionDifference(invoiceLine, poLine))) {
      return 'matched';
    }

    // Check if line has custom conversion rule applied - treat as matched
    if (poLine && hasCustomRuleMatch(invoiceLine, poLine)) {
      return 'matched';
    }

    if (!poLine) return 'missing';
    if (hasMismatch(invoiceLine, poLine)) return 'variance';
    return 'matched';
  };

  // Check if descriptions differ between invoice and PO line (for smart match indicator)
  const hasDescriptionDifference = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    if (!poLine) return false;

    // Don't show thunderbolts for pending substitution suggestions
    // Only show after user accepts the suggestion
    if (hasSuggestion(invoiceLine)) {
      return false;
    }

    const invDesc = invoiceLine.description.trim().toLowerCase();
    const poDesc = (poLine.description || '').trim().toLowerCase();

    // Consider "different" if descriptions don't match and neither contains the other
    return invDesc !== poDesc && !invDesc.includes(poDesc) && !poDesc.includes(invDesc);
  };

  const hasUomDifference = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    if (!poLine) return false;

    // Check if UOMs differ between invoice and PO
    return invoiceLine.uom.toLowerCase() !== poLine.uom.toLowerCase();
  };

  // Check if line has UOM conversion metadata (auto-matched UOM difference)
  const hasUomConversion = (invoiceLine: InvoiceLineItem): boolean => {
    return !!invoiceLine.uom_conversion;
  };

  // Check if line has UOM difference that is STILL auto-matched (not manually unmatched)
  const hasMatchedUomDifference = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    return hasUomConversion(invoiceLine) && hasUomDifference(invoiceLine, poLine) && !unmatchedLines.has(lineId);
  };

  // Check if line has description difference that is STILL auto-matched (not manually unmatched)
  const hasMatchedDescriptionDifference = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    return hasDescriptionDifference(invoiceLine, poLine) && !unmatchedLines.has(lineId);
  };

  // Check if line has a custom conversion rule
  const hasCustomRule = (invoiceLine: InvoiceLineItem): boolean => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    return customRules.has(lineId);
  };

  // Get custom rule for a line
  const getCustomRule = (invoiceLine: InvoiceLineItem): UnitConversionRule | null => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    return customRules.get(lineId) || null;
  };

  // Check if line has custom rule that matches current UOM difference
  const hasCustomRuleMatch = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    if (!poLine || !hasUomDifference(invoiceLine, poLine)) return false;

    const rule = getCustomRule(invoiceLine);
    if (!rule) return false;

    // Validate that the rule applies to this line
    const expectedPOQty = invoiceLine.qty * (rule.toQuantity / rule.fromQuantity);
    const matches = Math.abs(expectedPOQty - poLine.qty_ordered) < 0.01;

    return matches;
  };

  // Get SKU from line data, or generate for display purposes
  const getSKU = (line: any) => {
    // Use actual SKU from line data if available
    if (line.sku !== undefined && line.sku !== null) {
      return line.sku;
    }
    // Fallback to generated SKU for display purposes
    const prefixes = ['CH', 'DK', 'TV', 'SF', 'LT', 'BK', 'DS', 'CB'];
    const prefix = prefixes[line.line_no % prefixes.length];
    const number = String(line.line_no).padStart(4, '0');
    return `${prefix}-${number}`;
  };

  const errorCount = countErrors();

  // Categorize lines into variances and matched for grouped view
  const categorizeLines = () => {
    const varianceLines: InvoiceLineItem[] = [];
    const matchedLines: InvoiceLineItem[] = [];

    editableLines.forEach((line, index) => {
      const matchedPO = getMatchedPOLine(line, index);
      const lineId = line.id || `line-${line.line_no}`;

      // Check if it's a variance
      const isVariance = matchedPO &&
                        hasMismatch(line, matchedPO) &&
                        !manuallyMatchedLines.has(lineId) &&
                        !acceptedSuggestions.has(lineId);

      if (isVariance) {
        varianceLines.push(line);
      } else {
        matchedLines.push(line);
      }
    });

    return { varianceLines, matchedLines };
  };

  const { varianceLines, matchedLines } = categorizeLines();

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

  // Process slots for grouped view if needed
  const getDisplaySlots = () => {
    if (viewMode === 'default') {
      // Sort by line number only
      const sortedSlots = [...slots].sort((a, b) => {
        const lineNoA = a.invoiceLine?.line_no ?? Infinity;
        const lineNoB = b.invoiceLine?.line_no ?? Infinity;
        return lineNoA - lineNoB;
      });

      return sortedSlots;
    }

    // Grouped view: variance slots first, then matched slots
    const varianceSlots = slots.filter(slot => {
      if (!slot.invoiceLine) return false;
      return varianceLines.some(v => v.line_no === slot.invoiceLine!.line_no);
    });

    const matchedSlots = slots.filter(slot => {
      if (!slot.invoiceLine) return false;
      return matchedLines.some(m => m.line_no === slot.invoiceLine!.line_no);
    });

    return { varianceSlots, matchedSlots };
  };

  const displaySlots = getDisplaySlots();

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

  // Sync internal edit mode with external control
  useEffect(() => {
    if (externalEditMode !== undefined && externalEditMode !== isEditMode) {
      setIsEditMode(externalEditMode);
    }
  }, [externalEditMode]);

  // Toggle edit mode
  const toggleEditMode = () => {
    const newEditMode = !isEditMode;
    if (!newEditMode) {
      // Exiting edit mode - ensure we save changes
      onLinesUpdate?.(editableLines);
    }
    setIsEditMode(newEditMode);
    // Notify parent of edit mode change
    onEditModeChange?.(newEditMode);
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
      {!hideInternalHeader && (
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
          {/* View mode toggle - hide in fullscreen */}
          {!isFullscreen && (
            <button
              onClick={() => setViewMode(viewMode === 'default' ? 'grouped' : 'default')}
              className="p-1.5 rounded hover:bg-gray-200 transition-colors text-gray-950"
              title={viewMode === 'default' ? 'Group by Status' : 'Show All Items'}
            >
              {viewMode === 'default' ? (
                <ArrowDownWideNarrow className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </button>
          )}

          {/* Edit button - only show in fullscreen mode */}
          {isFullscreen && !hideEditButton && (
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
          )}

          <button
            onClick={toggleFullscreen}
            className={`px-2 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1 ${
              isFullscreen
                ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                : 'p-1.5 hover:bg-gray-200 text-gray-950 border-transparent'
            }`}
            title={isFullscreen ? 'Exit Fullscreen' : 'Maximize'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span>Collapse</span>
              </>
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
      )}

      {/* Content */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto transition-all duration-200">
        {viewMode === 'default' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {showPO && poLines.length > 0 ? (
            // Horizontal scrollable layout when PO lines exist - Invoice table first, then PO table
            <div ref={flexContainerRef} className={`flex min-h-full ${hasEnoughSpace ? 'w-fit' : 'w-full'}`}>
              {/* Invoice Lines */}
              <div className="flex-shrink-0 border-r border-gray-200">
                {/* SVG gradient definition (hidden, used by icons) */}
                <svg width="0" height="0" style={{ position: 'absolute' }}>
                  <defs>
                    <linearGradient id="sparkle-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: '#f472b6', stopOpacity: 1 }} />
                      <stop offset="70%" style={{ stopColor: '#9333ea', stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: '#6b21a8', stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                </svg>
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={useDetailedVarianceColumns ? (isEditMode ? 12 : 10) : (10 + (isEditMode ? 2 : 0))} className="px-4 bg-white border-b h-[36px]">
                        <div className="flex items-center justify-between h-full">
                          {/* Left side: Compare to toggles */}
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-gray-600">Compare to:</span>

                            {/* PO Toggle */}
                            <label className="flex items-center gap-1.5">
                              <Switch.Root
                                checked={showPO}
                                onCheckedChange={setShowPO}
                                disabled={!poLines || poLines.length === 0}
                                className="w-7 h-4 bg-gray-200 rounded-full relative data-[state=checked]:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[13px]" />
                              </Switch.Root>
                              <span className="text-xs font-medium text-gray-950">PO</span>
                            </label>

                            {/* Receipt Toggle - Hidden for now */}
                            <label className="hidden flex items-center gap-1.5">
                              <Switch.Root
                                checked={showReceipt}
                                onCheckedChange={setShowReceipt}
                                className="w-7 h-4 bg-gray-200 rounded-full relative data-[state=checked]:bg-purple-600 transition-colors"
                              >
                                <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[13px]" />
                              </Switch.Root>
                              <span className="text-xs font-medium text-gray-950">Receipt</span>
                            </label>
                          </div>

                          {/* Right side: Edit button */}
                          {!hideEditButton && (
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
                          )}
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      {isEditMode && (
                        <th className="px-2 text-center text-xs font-medium text-gray-800 uppercase w-8"></th>
                      )}
                      <th className="pl-5 pr-1.5 text-right text-xs font-medium text-gray-800 uppercase">#</th>
                      <th className="w-8"></th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">
                        Status
                      </th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                      <th className="pl-1.5 pr-4 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                      {!useDetailedVarianceColumns && (
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Variance</th>
                      )}
                      {isEditMode && (
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase w-32">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
                        const line = slot.invoiceLine;

                        // Check if this position has a dragged item
                        const draggedLineAtPosition = editableLines.find((l, idx) =>
                          (l.display_position !== undefined ? l.display_position === slot.position : idx === slot.position) &&
                          (l.id || `line-${l.line_no}`) === activeDragId
                        );

                        // If an item is being dragged from this position, show a placeholder
                        if (draggedLineAtPosition && isEditMode) {
                          const colSpan = useDetailedVarianceColumns
                            ? (isEditMode ? 12 : 10)
                            : (10 + (isEditMode ? 2 : 0));
                          return (
                            <EmptySlot
                              key={`dragged-placeholder-${slot.position}`}
                              position={slot.position}
                              colSpan={colSpan}
                              isEditMode={isEditMode}
                              isDragPlaceholder={true}
                            />
                          );
                        }

                        // If no invoice line at this position, show empty slot
                        if (!line) {
                          const colSpan = useDetailedVarianceColumns
                            ? (isEditMode ? 12 : 10)
                            : (10 + (isEditMode ? 2 : 0));
                          return (
                            <EmptySlot
                              key={`empty-slot-${slot.position}`}
                              position={slot.position}
                              colSpan={colSpan}
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
                            <td className="pl-5 pr-1.5 py-2 text-xs text-right text-gray-950">{line.line_no}</td>
                            {/* Icon column for smart match indicators and AI suggestions */}
                            <td className="px-1 py-2 text-center relative">
                              {hasSuggestion(line) ? (
                                // PRIORITY 1: Show gradient Sparkles for AI suggestions
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openSuggestionId === (line.id || `line-${line.line_no}`) ? false : undefined}>
                                    <SubstitutionSuggestionPopover
                                      invoiceDescription={line.description}
                                      poDescription={line.suggested_po_match!.po_description}
                                      invoiceLine={{
                                        qty: line.qty,
                                        unit_price: line.unit_price,
                                        line_total: line.line_total
                                      }}
                                      poLine={{
                                        qty_ordered: line.suggested_po_match!.po_qty,
                                        unit_price: line.suggested_po_match!.po_unit_price
                                      }}
                                      confidence={line.suggested_po_match!.confidence}
                                      reason={line.suggested_po_match!.reason}
                                      differences={line.suggested_po_match!.differences}
                                      onAccept={() => handleAcceptSuggestion(line.id || `line-${line.line_no}`, line.suggested_po_match)}
                                      onReject={() => handleRejectSuggestion(line.id || `line-${line.line_no}`)}
                                      open={openSuggestionId === (line.id || `line-${line.line_no}`)}
                                      onOpenChange={(open) => setOpenSuggestionId(open ? (line.id || `line-${line.line_no}`) : null)}
                                      collisionBoundary={scrollContainerRef.current}
                                    >
                                      <Tooltip.Trigger asChild>
                                        <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                          <Sparkles
                                            className="h-4 w-4"
                                            fill="currentColor"
                                            style={{ fill: 'url(#sparkle-gradient)', stroke: 'url(#sparkle-gradient)' }}
                                          />
                                        </span>
                                      </Tooltip.Trigger>
                                    </SubstitutionSuggestionPopover>
                                    <Tooltip.Portal>
                                      <Tooltip.Content className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg">
                                        AI suggests possible substitution - Click to review
                                        <Tooltip.Arrow className="fill-gray-900" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              ) : matchedPO && (hasUomConversion(line) || hasDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
                                // PRIORITY 2: Show purple Zap for smart matches
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openPopoverId === `invoice-${line.id || `line-${line.line_no}`}` ? false : undefined}>
                                    {hasCustomRule(line) ? (
                                      <CustomRulePopover
                                        rule={getCustomRule(line)!}
                                        invoiceQty={line.qty}
                                        invoiceUom={line.uom}
                                        poQty={matchedPO.qty_ordered}
                                        poUom={matchedPO.uom}
                                        lineTotal={line.line_total}
                                        onEdit={() => handleEditRule(line)}
                                        onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </CustomRulePopover>
                                    ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                      <UomMatchPopover
                                        invoiceQty={line.uom_conversion!.invoice_qty}
                                        invoiceUom={line.uom_conversion!.invoice_uom}
                                        invoiceUnitPrice={line.unit_price}
                                        poQty={line.uom_conversion!.po_qty}
                                        poUom={line.uom_conversion!.po_uom}
                                        poUnitPrice={matchedPO.unit_price}
                                        conversionFactor={line.uom_conversion!.conversion_factor}
                                        conversionExplanation={line.uom_conversion!.explanation}
                                        lineTotal={line.line_total}
                                        onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </UomMatchPopover>
                                    ) : (
                                      <SmartMatchPopover
                                        invoiceDescription={line.description}
                                        poDescription={matchedPO.item_description || matchedPO.description}
                                        invoiceLine={line}
                                        poLine={matchedPO}
                                        onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </SmartMatchPopover>
                                    )}
                                    <Tooltip.Portal>
                                      <Tooltip.Content
                                        style={{ zIndex: 9999 }}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]"
                                        sideOffset={5}
                                      >
                                        <div className="space-y-1">
                                          <p className="font-semibold">Smart Match Applied</p>
                                          <p>Click to review or unmatch</p>
                                        </div>
                                        <Tooltip.Arrow className="fill-gray-900" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              ) : (
                                // PRIORITY 3: Show purple + icon on hover when no other icon
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200}>
                                    <Tooltip.Trigger asChild>
                                      <button
                                        onClick={() => handleOpenTeachRuleDrawer(line)}
                                        className="inline-flex items-center justify-center cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        <Plus className="h-4 w-4 text-purple-600" />
                                      </button>
                                    </Tooltip.Trigger>
                                    <Tooltip.Portal>
                                      <Tooltip.Content
                                        style={{ zIndex: 9999 }}
                                        className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg"
                                      >
                                        Add custom rule
                                        <Tooltip.Arrow className="fill-gray-900" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              )}
                            </td>
                          <td className="px-1.5 py-2 text-xs text-left">
                            {status === 'variance' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
                                Variance
                              </span>
                            )}
                            {status === 'matched' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                                Matched
                              </span>
                            )}
                            {status === 'missing' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                                Not Matched
                              </span>
                            )}
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-gray-950 ${
                            (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                              ? 'bg-red-50'
                              : ''
                          }`}>
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
                            {getSKU(line)}
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                              ? 'bg-red-50'
                              : ''
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.qty}
                                onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                className={`w-14 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01
                                    ? ''
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
                              ? 'bg-red-50'
                              : ''
                          }`}>
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.unit_price}
                                onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                className={`w-24 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01
                                    ? ''
                                    : 'border border-gray-300'
                                }`}
                              />
                            ) : (
                              formatCurrency(line.unit_price)
                            )}
                          </td>
                          <td className="pl-1.5 pr-4 py-2 text-xs text-right font-medium text-gray-950">
                            {formatCurrency(line.line_total)}
                          </td>
                          {!useDetailedVarianceColumns && (
                            <td className="px-1.5 py-2 text-xs">
                              {matchedPO && (
                                <div className="flex flex-col items-center gap-0.5">
                                  {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                    <span className={`text-xs font-semibold ${
                                      hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                    }`}>
                                      Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                    </span>
                                  )}
                                  {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                    <span className={`text-xs font-semibold ${
                                      hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                    }`}>
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
                            className="h-[48px] bg-white group"
                            isHovered={hoveredPosition === slot.position}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {rowContent}
                          </DraggableDroppableRow>
                        ) : (
                          <tr
                            key={line.id || line.line_no}
                            className={`h-[48px] group ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {rowContent()}
                          </tr>
                        );
                      })}
                    {isEditMode && (
                      <tr className="h-[40px]">
                        <td colSpan={useDetailedVarianceColumns ? 12 : 12} className="px-1.5 py-2 align-middle">
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
                    <tr className="h-[42px]">
                      <td colSpan={isEditMode ? 9 : 8} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950">
                        Invoice Total:
                      </td>
                      <td colSpan={1 + (!useDetailedVarianceColumns ? 1 : 0) + (isEditMode ? 1 : 0)} className="pl-1.5 pr-4 py-2 text-right text-sm font-bold text-gray-950">
                        {formatCurrency(invoiceLines.reduce((sum, line) => sum + line.line_total, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PO Lines */}
              <div className="flex-shrink-0">
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={6} className="px-4 bg-white border-b h-[36px]">
                        <div className="flex items-center h-full">
                          <span className="text-sm font-semibold text-gray-950">Purchase Order</span>
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      <th className="pl-5 pr-1.5 text-right text-xs font-medium text-gray-800 uppercase">#</th>
                      <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                      <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
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
                          <td className="pl-4 pr-1.5 py-2 text-xs text-right text-gray-950">{matchedPO.line_no}</td>
                          <td className={`px-1.5 py-2 text-xs text-gray-950 ${
                            invLine && ((unmatchedLines.has(invLine.id || `line-${invLine.line_no}`) && hasDescriptionDifference(invLine, matchedPO)) || hasSuggestion(invLine))
                              ? 'bg-red-50'
                              : ''
                          }`}>
                            <div className="truncate max-w-[250px]" title={matchedPO.description}>
                              {matchedPO.item_description || matchedPO.description}
                            </div>
                          </td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            invLine && Math.abs(matchedPO.qty_ordered - invLine.qty) > 0.01
                              ? 'bg-red-50'
                              : ''
                          }`}>
                            {matchedPO.qty_ordered}
                          </td>
                          <td className="px-1.5 py-2 text-xs text-center text-gray-950">{matchedPO.uom}</td>
                          <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                            invLine && Math.abs(matchedPO.unit_price - invLine.unit_price) > 0.01
                              ? 'bg-red-50'
                              : ''
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
                      <th className="px-4 bg-white border-b border-r border-gray-200 h-[36px]">
                        <div className="h-full"></div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      <th className="px-1.5 border-r border-gray-200">&nbsp;</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
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

              {/* Flexible spacer - only shown when there's enough space */}
              {useDetailedVarianceColumns && hasEnoughSpace && (
                <div className="flex-grow min-w-0"></div>
              )}

              {/* Variance Panel - adaptive positioning */}
              {useDetailedVarianceColumns && (
                <div className={`flex-shrink-0 bg-white ${
                  hasEnoughSpace
                    ? 'border-l border-r border-gray-200'
                    : 'border-l border-gray-200 sticky right-0 shadow-xl z-20'
                }`}>
                  <table className="min-w-max">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      {/* Two-row header to match Invoice/PO structure */}
                      <tr>
                        <th colSpan={2} className="px-4 bg-white border-b h-[36px]">
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
                      {(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
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
                    <th colSpan={poLines.length > 0 ? (isEditMode ? 12 : 11) : (isEditMode ? 11 : 10)} className="px-4 bg-white h-[36px]">
                      <div className="flex items-center justify-between h-full">
                        {/* Left side: Compare to toggles */}
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-gray-600">Compare to:</span>

                          {/* PO Toggle */}
                          <label className="flex items-center gap-1.5">
                            <Switch.Root
                              checked={showPO}
                              onCheckedChange={setShowPO}
                              disabled={!poLines || poLines.length === 0}
                              className="w-7 h-4 bg-gray-200 rounded-full relative data-[state=checked]:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[13px]" />
                            </Switch.Root>
                            <span className="text-xs font-medium text-gray-950">PO</span>
                          </label>

                          {/* Receipt Toggle - Hidden for now */}
                          <label className="hidden flex items-center gap-1.5">
                            <Switch.Root
                              checked={showReceipt}
                              onCheckedChange={setShowReceipt}
                              className="w-7 h-4 bg-gray-200 rounded-full relative data-[state=checked]:bg-purple-600 transition-colors"
                            >
                              <Switch.Thumb className="block w-3 h-3 bg-white rounded-full transition-transform translate-x-0.5 data-[state=checked]:translate-x-[13px]" />
                            </Switch.Root>
                            <span className="text-xs font-medium text-gray-950">Receipt</span>
                          </label>
                        </div>

                        {/* Right side: Edit button */}
                        {!hideEditButton && (
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
                        )}
                      </div>
                    </th>
                  </tr>
                  <tr className="h-[40px]">
                    {isEditMode && (
                      <th className="px-2 text-center text-xs font-medium text-gray-800 uppercase w-8"></th>
                    )}
                    <th className="pl-5 pr-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                    <th className="w-8"></th>
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">
                      Status
                    </th>
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                    <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                    <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                    <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                    <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                    <th className="pl-1.5 pr-4 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                    {poLines.length > 0 && (
                      <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Variance</th>
                    )}
                    <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
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
                            colSpan={poLines.length > 0 ? (isEditMode ? 12 : 11) : (isEditMode ? 11 : 10)}
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
                            colSpan={poLines.length > 0 ? (isEditMode ? 12 : 11) : (isEditMode ? 11 : 10)}
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
                          <td className="pl-4 pr-1.5 py-2 text-xs text-right text-gray-950">
                            {line.line_no}
                          </td>
                          {/* Icon column for smart match indicators */}
                          <td className="px-1 py-2 text-center relative">
                            {matchedPO && (hasUomConversion(line) || hasDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
                              <Tooltip.Provider>
                                <Tooltip.Root delayDuration={200} open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}` ? false : undefined}>
                                  {hasCustomRule(line) ? (
                                    <CustomRulePopover
                                      rule={getCustomRule(line)!}
                                      invoiceQty={line.qty}
                                      invoiceUom={line.uom}
                                      poQty={matchedPO.qty_ordered}
                                      poUom={matchedPO.uom}
                                      lineTotal={line.line_total}
                                      onEdit={() => handleEditRule(line)}
                                      onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)}
                                      open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                      onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                    >
                                      <Tooltip.Trigger asChild>
                                        <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                          <Zap className="h-3.5 w-3.5 text-purple-600" />
                                        </span>
                                      </Tooltip.Trigger>
                                    </CustomRulePopover>
                                  ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                    <UomMatchPopover
                                      invoiceQty={line.uom_conversion!.invoice_qty}
                                      invoiceUom={line.uom_conversion!.invoice_uom}
                                      invoiceUnitPrice={line.unit_price}
                                      poQty={line.uom_conversion!.po_qty}
                                      poUom={line.uom_conversion!.po_uom}
                                      poUnitPrice={matchedPO.unit_price}
                                      conversionFactor={line.uom_conversion!.conversion_factor}
                                      conversionExplanation={line.uom_conversion!.explanation}
                                      lineTotal={line.line_total}
                                      onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                      open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                      onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                    >
                                      <Tooltip.Trigger asChild>
                                        <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                          <Zap className="h-3.5 w-3.5 text-purple-600" />
                                        </span>
                                      </Tooltip.Trigger>
                                    </UomMatchPopover>
                                  ) : (
                                    <SmartMatchPopover
                                      invoiceDescription={line.description}
                                      poDescription={matchedPO.item_description || matchedPO.description}
                                      invoiceLine={line}
                                      poLine={matchedPO}
                                      onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                      open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                      onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                    >
                                      <Tooltip.Trigger asChild>
                                        <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                          <Zap className="h-3.5 w-3.5 text-purple-600" />
                                        </span>
                                      </Tooltip.Trigger>
                                    </SmartMatchPopover>
                                  )}
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      style={{ zIndex: 9999 }}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]"
                                      sideOffset={5}
                                    >
                                      <div className="space-y-1">
                                        <p className="font-semibold">Smart Match Applied</p>
                                        <p>Click to review or unmatch</p>
                                      </div>
                                      <Tooltip.Arrow className="fill-gray-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            ) : (
                              // Show purple + icon on hover when no other icon
                              <Tooltip.Provider>
                                <Tooltip.Root delayDuration={200}>
                                  <Tooltip.Trigger asChild>
                                    <button
                                      onClick={() => handleOpenTeachRuleDrawer(line)}
                                      className="inline-flex items-center justify-center cursor-pointer flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Plus className="h-4 w-4 text-purple-600" />
                                    </button>
                                  </Tooltip.Trigger>
                                  <Tooltip.Portal>
                                    <Tooltip.Content
                                      style={{ zIndex: 9999 }}
                                      className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg"
                                    >
                                      Add custom rule
                                      <Tooltip.Arrow className="fill-gray-900" />
                                    </Tooltip.Content>
                                  </Tooltip.Portal>
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            )}
                          </td>
                        <td className="px-1.5 py-2 text-xs text-left">
                          {status === 'variance' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 whitespace-nowrap">
                              Variance
                            </span>
                          )}
                          {status === 'matched' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 whitespace-nowrap">
                              Matched
                            </span>
                          )}
                          {status === 'missing' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                              Not Matched
                            </span>
                          )}
                        </td>
                        <td className={`px-1.5 py-2 text-xs text-gray-950 ${
                          (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                            ? 'bg-red-50'
                            : ''
                        }`}>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={line.description}
                              onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {matchedPO && (hasUomConversion(line) || hasDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) && (
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}` ? false : undefined}>
                                    {hasCustomRule(line) ? (
                                      <CustomRulePopover
                                        rule={getCustomRule(line)!}
                                        invoiceQty={line.qty}
                                        invoiceUom={line.uom}
                                        poQty={matchedPO.qty_ordered}
                                        poUom={matchedPO.uom}
                                        lineTotal={line.line_total}
                                        onEdit={() => handleEditRule(line)}
                                        onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </CustomRulePopover>
                                    ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                      <UomMatchPopover
                                        invoiceQty={line.uom_conversion!.invoice_qty}
                                        invoiceUom={line.uom_conversion!.invoice_uom}
                                        invoiceUnitPrice={line.unit_price}
                                        poQty={line.uom_conversion!.po_qty}
                                        poUom={line.uom_conversion!.po_uom}
                                        poUnitPrice={matchedPO.unit_price}
                                        conversionFactor={line.uom_conversion!.conversion_factor}
                                        conversionExplanation={line.uom_conversion!.explanation}
                                        lineTotal={line.line_total}
                                        onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </UomMatchPopover>
                                    ) : (
                                      <SmartMatchPopover
                                        invoiceDescription={line.description}
                                        poDescription={matchedPO.item_description || matchedPO.description}
                                        invoiceLine={line}
                                        poLine={matchedPO}
                                        onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                        open={openPopoverId === `invoice-detailed-${line.id || `line-${line.line_no}`}`}
                                        onOpenChange={(open) => setOpenPopoverId(open ? `invoice-detailed-${line.id || `line-${line.line_no}`}` : null)}
                                      >
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </SmartMatchPopover>
                                    )}
                                    <Tooltip.Portal>
                                      <Tooltip.Content
                                        style={{ zIndex: 9999 }}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]"
                                        sideOffset={5}
                                      >
                                        <div className="space-y-1">
                                          <p className="font-semibold">Smart Match Applied</p>
                                          <p>Click to review or unmatch</p>
                                        </div>
                                        <Tooltip.Arrow className="fill-gray-900" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              )}
                              <div className="truncate max-w-[400px]" title={line.description}>
                                {line.description}
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-gray-950">
                          {getSKU(line)}
                        </td>
                        <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                          matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                            ? 'bg-red-50'
                            : ''
                        }`}>
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                              className={`w-14 px-2 py-1 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01
                                  ? ''
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
                            ? 'bg-red-50'
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
                                  ? ''
                                  : 'border border-gray-300'
                              }`}
                            />
                          ) : (
                            formatCurrency(line.unit_price)
                          )}
                        </td>
                        <td className="pl-1.5 pr-4 py-2 text-xs text-right font-medium text-gray-950">
                          {formatCurrency(line.line_total)}
                        </td>
                        {poLines.length > 0 && (
                          <td className="px-1.5 py-2 text-xs">
                            {matchedPO && (
                              <div className="flex flex-col items-center gap-0.5">
                                {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                  <span className={`text-xs font-semibold ${
                                    hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                  }`}>
                                    Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                )}
                                {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && (
                                  <span className={`text-xs font-semibold ${
                                    hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                  }`}>
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
                          className="bg-white group"
                          isHovered={hoveredPosition === slot.position}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          {rowContent}
                        </DraggableDroppableRow>
                      ) : (
                        <tr
                          key={line.id || line.line_no}
                          className={`group ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
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
                  <tr className="h-[42px]">
                    <td colSpan={isEditMode ? 8 : 7} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950">
                      Invoice Total:
                    </td>
                    <td colSpan={2 + (poLines.length > 0 ? 1 : 0)} className="pl-1.5 pr-4 py-2 text-right text-sm font-bold text-gray-950">
                      {formatCurrency(editableLines.reduce((sum, line) => sum + line.line_total, 0))}
                    </td>
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
        ) : (
          // Grouped View (variances first, then matched items)
          <>
            {showPO && poLines.length > 0 && !Array.isArray(displaySlots) && 'varianceSlots' in displaySlots ? (
              // Horizontal scrollable layout - Invoice table first, then PO table
              <div className="flex min-h-full w-full">
                {/* Invoice Lines - Grouped */}
                <div className="flex-shrink-0 border-r border-gray-200">
                  <table className="min-w-max">
                    {/* Same header as default view */}
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th colSpan={useDetailedVarianceColumns ? 9 : 9} className="px-4 bg-white border-b h-[36px]">
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
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Status</th>
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                        {!useDetailedVarianceColumns && (
                          <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Variance</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {/* Render variance lines first */}
                      {(displaySlots as {varianceSlots: typeof slots, matchedSlots: typeof slots}).varianceSlots.map((slot) => {
                        const line = slot.invoiceLine;
                        if (!line) return null;

                        const lineIndex = editableLines.findIndex(l => l.line_no === line.line_no);
                        const matchedPO = slot.poLine;
                        const status = getLineStatus(line, matchedPO);

                        return (
                          <tr key={`variance-${line.id || line.line_no}`} className="h-[48px] bg-white hover:bg-purple-50 transition-colors">
                            <td className="px-1.5 py-2 text-xs text-gray-950 font-medium">{line.line_no}</td>
                            <td className="px-1.5 py-2 text-xs text-left">
                              {status === 'matched' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                  Matched
                                </span>
                              )}
                              {status === 'variance' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 whitespace-nowrap">
                                  Variance
                                </span>
                              )}
                              {status === 'missing' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
                                  Not Matched
                                </span>
                              )}
                            </td>
                            <td className={`px-1.5 py-2 text-xs text-gray-950 ${
                              (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                                ? 'bg-red-50'
                                : ''
                            }`}>
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={line.description}
                                  onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                                  className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                                />
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  {matchedPO && (hasUomConversion(line) || hasDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) && (
                                    <Tooltip.Provider>
                                      <Tooltip.Root delayDuration={200}>
                                        {hasCustomRule(line) ? (
                                          <CustomRulePopover
                                            rule={getCustomRule(line)!}
                                            invoiceQty={line.qty}
                                            invoiceUom={line.uom}
                                            poQty={matchedPO.qty_ordered}
                                            poUom={matchedPO.uom}
                                            lineTotal={line.line_total}
                                            onEdit={() => handleEditRule(line)}
                                            onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </CustomRulePopover>
                                        ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                          <UomMatchPopover
                                            invoiceQty={line.uom_conversion!.invoice_qty}
                                            invoiceUom={line.uom_conversion!.invoice_uom}
                                            invoiceUnitPrice={line.unit_price}
                                            poQty={line.uom_conversion!.po_qty}
                                            poUom={line.uom_conversion!.po_uom}
                                            poUnitPrice={matchedPO.unit_price}
                                            conversionFactor={line.uom_conversion!.conversion_factor}
                                            conversionExplanation={line.uom_conversion!.explanation}
                                            lineTotal={line.line_total}
                                            onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </UomMatchPopover>
                                        ) : (
                                          <SmartMatchPopover
                                            invoiceDescription={line.description}
                                            poDescription={matchedPO.item_description || matchedPO.description}
                                            invoiceLine={line}
                                            poLine={matchedPO}
                                            onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </SmartMatchPopover>
                                        )}
                                        <Tooltip.Portal>
                                          <Tooltip.Content
                                            style={{ zIndex: 9999 }}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]"
                                            sideOffset={5}
                                          >
                                            <div className="space-y-1">
                                              <p className="font-semibold">Smart Match Applied</p>
                                              <p className="text-gray-300">Click for details</p>
                                            </div>
                                            <Tooltip.Arrow className="fill-gray-900" />
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    </Tooltip.Provider>
                                  )}
                                  {matchedPO && hasUomDifference(line, matchedPO) && !hasUomConversion(line) && !hasCustomRule(line) && (
                                    <SparkleButton
                                      onClick={() => handleOpenTeachRuleDrawer(line)}
                                      hasRule={hasCustomRule(line)}
                                    />
                                  )}
                                  <span className="flex-1">{line.description}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-gray-950">
                              {getSKU(line)}
                            </td>
                            <td className={`px-1.5 py-2 text-xs text-right text-gray-950 ${
                              matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`)
                                ? 'bg-red-50'
                                : ''
                            }`}>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={line.qty}
                                  onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                  className={`w-14 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                    matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01
                                      ? ''
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
                                ? 'bg-red-50'
                                : ''
                            }`}>
                              {isEditMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={line.unit_price}
                                  onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className={`w-20 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                    matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01
                                      ? ''
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
                              <td className="px-1.5 py-2 text-xs text-center">
                                {matchedPO && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) ? (
                                  <>
                                    {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ||
                                     Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                        {((line.line_total - (matchedPO.qty_ordered * matchedPO.unit_price)) >= 0 ? '+' : '') +
                                          formatCurrency(Math.abs(line.line_total - (matchedPO.qty_ordered * matchedPO.unit_price)))}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>
                            )}
                            {hasSuggestion(line) && !rejectedSuggestions.has(line.id || `line-${line.line_no}`) && (
                              <td className="px-1.5 py-2">
                                <SubstitutionSuggestionPopover
                                  invoiceDescription={line.description}
                                  poDescription={line.suggested_po_match!.po_description}
                                  confidence={line.suggested_po_match!.confidence}
                                  reason={line.suggested_po_match!.reason}
                                  differences={line.suggested_po_match!.differences}
                                  onAccept={() => handleAcceptSuggestion(line.id || `line-${line.line_no}`, line.suggested_po_match)}
                                  onReject={() => handleRejectSuggestion(line.id || `line-${line.line_no}`)}
                                  open={openSuggestionId === (line.id || `line-${line.line_no}`)}
                                  onOpenChange={(open) => setOpenSuggestionId(open ? (line.id || `line-${line.line_no}`) : null)}
                                >
                                  <Tooltip.Trigger asChild>
                                    <button className="bg-purple-900 text-white rounded-md px-2 py-1 hover:bg-purple-800 transition-colors inline-flex items-center gap-1.5">
                                      <Sparkles className="h-4 w-4 text-white" />
                                      <span className="text-xs font-medium">Review</span>
                                    </button>
                                  </Tooltip.Trigger>
                                </SubstitutionSuggestionPopover>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Collapsible Matched Items Row */}
                      <MatchedItemsRow
                        isExpanded={matchedItemsExpanded}
                        onToggle={() => setMatchedItemsExpanded(!matchedItemsExpanded)}
                        matchedCount={matchedLines.length}
                        colSpan={useDetailedVarianceColumns ? 9 : 9}
                      />

                      {/* Render matched lines if expanded - Similar structure to variance lines but without drag handles */}
                      {matchedItemsExpanded && (displaySlots as {varianceSlots: typeof slots, matchedSlots: typeof slots}).matchedSlots.map((slot) => {
                        const line = slot.invoiceLine;
                        if (!line) return null;

                        const lineIndex = editableLines.findIndex(l => l.line_no === line.line_no);
                        const matchedPO = slot.poLine;
                        const status = getLineStatus(line, matchedPO);

                        return (
                          <tr key={`matched-${line.id || line.line_no}`} className="h-[48px] bg-white hover:bg-purple-50 transition-colors">
                            {/* Same cell structure as variance lines */}
                            <td className="px-1.5 py-2 text-xs text-gray-950 font-medium">{line.line_no}</td>
                            <td className="px-1.5 py-2 text-xs text-center">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Matched
                              </span>
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
                                <div className="flex items-center gap-1.5">
                                  {matchedPO && (hasUomConversion(line) || hasDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) && (
                                    <Tooltip.Provider>
                                      <Tooltip.Root delayDuration={200}>
                                        {hasCustomRule(line) ? (
                                          <CustomRulePopover
                                            rule={getCustomRule(line)!}
                                            invoiceQty={line.qty}
                                            invoiceUom={line.uom}
                                            poQty={matchedPO.qty_ordered}
                                            poUom={matchedPO.uom}
                                            lineTotal={line.line_total}
                                            onEdit={() => handleEditRule(line)}
                                            onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </CustomRulePopover>
                                        ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                          <UomMatchPopover
                                            invoiceQty={line.uom_conversion!.invoice_qty}
                                            invoiceUom={line.uom_conversion!.invoice_uom}
                                            invoiceUnitPrice={line.unit_price}
                                            poQty={line.uom_conversion!.po_qty}
                                            poUom={line.uom_conversion!.po_uom}
                                            poUnitPrice={matchedPO.unit_price}
                                            conversionFactor={line.uom_conversion!.conversion_factor}
                                            conversionExplanation={line.uom_conversion!.explanation}
                                            lineTotal={line.line_total}
                                            onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </UomMatchPopover>
                                        ) : (
                                          <SmartMatchPopover
                                            invoiceDescription={line.description}
                                            poDescription={matchedPO.item_description || matchedPO.description}
                                            invoiceLine={line}
                                            poLine={matchedPO}
                                            onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)}
                                            open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`}
                                            onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}
                                          >
                                            <Tooltip.Trigger asChild>
                                              <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                                <Zap className="h-3.5 w-3.5 text-purple-600" />
                                              </span>
                                            </Tooltip.Trigger>
                                          </SmartMatchPopover>
                                        )}
                                        <Tooltip.Portal>
                                          <Tooltip.Content
                                            style={{ zIndex: 9999 }}
                                        className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]"
                                            sideOffset={5}
                                          >
                                            <div className="space-y-1">
                                              <p className="font-semibold">Smart Match Applied</p>
                                              <p className="text-gray-300">Click for details</p>
                                            </div>
                                            <Tooltip.Arrow className="fill-gray-900" />
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    </Tooltip.Provider>
                                  )}
                                  <span className="flex-1">{line.description}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-gray-950">{getSKU(line)}</td>
                            <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={line.qty}
                                  onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                  className="w-14 px-1 py-0.5 text-xs text-right border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
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
                            <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={line.unit_price}
                                  onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="w-20 px-1 py-0.5 text-xs text-right border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                                />
                              ) : (
                                formatCurrency(line.unit_price)
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                              {formatCurrency(line.line_total)}
                            </td>
                            {!useDetailedVarianceColumns && (
                              <td className="px-1.5 py-2 text-xs text-center">
                                <span className="text-gray-400">—</span>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* PO Lines table - TODO: Add similar grouped rendering */}
                <div className="flex-shrink-0">
                  <div className="text-center py-4 text-gray-500 text-sm">
                    PO comparison not yet implemented in grouped view
                  </div>
                </div>
              </div>
            ) : (
              // Full-width table for grouped view - TODO: Implement
              <div className="text-center py-4 text-gray-500 text-sm">
                Grouped view for single table not yet implemented
              </div>
            )}
          </>
        )}

        {/* Teach Rule Drawer */}
        <TeachRuleDrawer
          open={teachRuleDrawerOpen}
          onClose={() => {
            setTeachRuleDrawerOpen(false);
            setSelectedLineForRule(null);
          }}
          invoiceLine={selectedLineForRule ? {
            qty: selectedLineForRule.qty,
            uom: selectedLineForRule.uom,
            description: selectedLineForRule.description,
            unit_price: selectedLineForRule.unit_price,
            line_total: selectedLineForRule.line_total
          } : null}
          poLine={selectedLineForRule ? (() => {
            const matchedPO = poLines.find(po => po.id === selectedLineForRule.po_line_id);
            return matchedPO ? {
              qty_ordered: matchedPO.qty_ordered,
              uom: matchedPO.uom,
              description: matchedPO.description,
              unit_price: matchedPO.unit_price
            } : null;
          })() : null}
          vendorName="BuildTech Supplies Ltd"
          onConfirm={handleConfirmRule}
        />
      </div>
    </div>
  );
}