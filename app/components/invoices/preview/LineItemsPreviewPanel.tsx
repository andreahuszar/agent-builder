'use client';
// Updated: Removed TeachRuleDrawer and "+" hover buttons

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Maximize2, Minimize2, X, AlertCircle, ChevronDown, CheckCircle, Check, Edit2, Plus, Trash2, Copy, GitBranch, MoreVertical, Link2, Package, GripVertical, Zap, Sparkles, List, ArrowDownWideNarrow } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable, DragOverlay, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as Switch from '@radix-ui/react-switch';
import * as Select from '@radix-ui/react-select';
import * as Popover from '@radix-ui/react-popover';
import { SmartMatchPopover } from '../SmartMatchPopover';
import { SubstitutionSuggestionPopover } from '../SubstitutionSuggestionPopover';
import { UomMatchPopover } from '../UomMatchPopover';
import { useToast } from '@/app/components/ui/Toast';
import { SparkleButton } from '../SparkleButton';
import { CustomRulePopover, UnitConversionRule } from '../CustomRulePopover';
import { AddPODrawer } from '../AddPODrawer';
import { POLineUsage, ResolvedPOLine, POWithLines } from '@/types/api';

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
  suppress_price_variance?: boolean;
}

interface POLineItem {
  id: string;
  line_no: number;
  description: string;
  item_description?: string;
  qty_ordered: number;
  uom: string;
  unit_price: number;
  usage?: POLineUsage;  // PO line usage tracking
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

interface PODataWithLines {
  id: string;
  po_number: string;
  vendor_id?: string;
  currency: string;
  po_status?: string;
  subtotal: number;
  total: number;
  lines: POLineItem[];
}

interface POUtilization {
  totalLines: number;
  usedLines: number;
  totalAmount: number;
  usedAmount: number;
  unusedLines: POLineItem[];
  fullyUsedLines: POLineItem[];
}

interface LineItemsPreviewPanelProps {
  invoiceLines: InvoiceLineItem[];
  poLines?: POLineItem[];  // Keep for backward compatibility
  poDataList?: PODataWithLines[];  // NEW: Multi-PO support
  utilization?: { [poNumber: string]: POUtilization };  // NEW: PO utilization data
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
  // Add PO flow props
  onAddPO?: (poNumber: string, poData: any) => void; // Callback when a PO is added
  invoiceVendor?: string; // Vendor name for filtering POs
  // Callback to report error count changes (for parent components to update their UI)
  onErrorCountChange?: (errorCount: number) => void;
  // Callback to report validation state changes (for reactive validation results)
  onValidationStateChange?: (state: LineItemsValidationState) => void;
  // Auto-corrections data for agent-applied changes
  autoCorrections?: Array<{
    field: string;
    original_value: string;
    corrected_value: string;
    reason: string;
    agent_name: string;
    agent_id: string;
    timestamp: string;
    confidence?: number;
  }>;
}

// Interface for validation state reported to parent
export interface LineItemsValidationState {
  errorCount: number;
  resolvedLineIds: string[];  // Line IDs where issues have been fixed
  allLinesMatched: boolean;   // True when all lines show "Matched" status
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
  poDataList,
  utilization,
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
  onAddPO,
  invoiceVendor,
  onErrorCountChange,
  onValidationStateChange,
  autoCorrections = [],
}: LineItemsPreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(!startExpanded); // Start expanded if startExpanded is true
  const [isEditMode, setIsEditMode] = useState(false);
  const [editableLines, setEditableLines] = useState<InvoiceLineItem[]>(invoiceLines);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  
  // Sync editableLines when invoiceLines prop changes (e.g., from reprocessing)
  useEffect(() => {
    setEditableLines(invoiceLines);
  }, [invoiceLines]);
  const [hoveredPosition, setHoveredPosition] = useState<number | null>(null);
  const [manuallyMatchedLines, setManuallyMatchedLines] = useState<Set<string>>(new Set());
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  const [unmatchedLines, setUnmatchedLines] = useState<Set<string>>(new Set());
  const [acceptedSuggestions, setAcceptedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [openSuggestionId, setOpenSuggestionId] = useState<string | null>(null);
  const [customRules, setCustomRules] = useState<Map<string, UnitConversionRule>>(new Map());
  const [viewMode, setViewMode] = useState<'default' | 'grouped'>('default');
  const [matchedItemsExpanded, setMatchedItemsExpanded] = useState(true);
  const [poLineSearchQuery, setPoLineSearchQuery] = useState('');
  const [otherPOLinesExpanded, setOtherPOLinesExpanded] = useState(false); // Collapsed by default

  // Add PO drawer state
  const [showAddPODrawer, setShowAddPODrawer] = useState(false);
  const [reopenDropdownForLineId, setReopenDropdownForLineId] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const flexContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasEnoughSpace, setHasEnoughSpace] = useState(false);
  const { showToast} = useToast();

  // Multi-PO support: determine if we're in multi-PO mode
  const isMultiPO = Boolean(poDataList && poDataList.length > 1);
  // Detect non-PO invoices - no PO data available
  const isNonPO = (!poLines || poLines.length === 0) && (!poDataList || poDataList.length === 0);
  // Show "Assigned PO Line" column when in edit mode OR when multiple POs exist
  const showAssignedPOColumn = isEditMode || isMultiPO;
  const allPONumbers = poDataList?.map(po => po.po_number) || [];

  // PO selection state: 'all' or specific PO number
  const [selectedPO, setSelectedPO] = useState<string>(isMultiPO ? 'all' : allPONumbers[0] || '');

  // Sync selectedPO when isMultiPO changes (e.g., when poDataList loads)
  useEffect(() => {
    if (isMultiPO && selectedPO !== 'all' && !allPONumbers.includes(selectedPO)) {
      // Reset to 'all' if current selection is invalid for multi-PO
      setSelectedPO('all');
    } else if (!isMultiPO && allPONumbers.length > 0 && selectedPO === 'all') {
      // For single-PO, set to the only PO number
      setSelectedPO(allPONumbers[0]);
    }
  }, [isMultiPO, allPONumbers.length]);

  // Staged reassignments: track pending line reassignments
  const [stagedReassignments, setStagedReassignments] = useState<{
    [invoiceLineId: string]: {
      oldPoLineId: string | null;
      oldPoNumber: string | null;
      newPoLineId: string | null;  // null means clear/unassign
      newPoNumber: string | null;  // null means clear/unassign
    }
  }>({});

  // Compute effective usage for each PO line considering staged reassignments
  // This is a derived state that updates when stagedReassignments changes
  const getEffectiveUsage = (poLine: POLineItem, invoiceId?: string): POLineUsage => {
    const poLineId = poLine.id;

    // Check if any staged reassignment targets this PO line
    const reassignedTo = Object.entries(stagedReassignments).find(
      ([, reassignment]) => reassignment.newPoLineId === poLineId
    );

    if (reassignedTo) {
      const [invoiceLineId] = reassignedTo;
      return {
        state: 'usedByThisInvoice',
        invoiceId: invoiceId || '',
        invoiceLineId
      };
    }

    // Check if a staged reassignment moves away from this PO line
    const reassignedFrom = Object.entries(stagedReassignments).find(
      ([, reassignment]) => reassignment.oldPoLineId === poLineId
    );

    if (reassignedFrom) {
      // This line is being freed up - check original usage
      const originalUsage = poLine.usage;
      if (originalUsage?.state === 'usedByThisInvoice') {
        // Was used by this invoice, now becoming unused
        return { state: 'unused' };
      }
    }

    // Return the original usage from the PO line data
    return poLine.usage || { state: 'unused' };
  };

  // Helper function to get quantity correction for a specific line
  const getQuantityCorrection = (lineNo: number) => {
    const fieldName = `line_${lineNo}_qty`;
    return autoCorrections.find(correction => correction.field === fieldName);
  };

  // Find the assigned PO line for an invoice line based on usage metadata
  // This looks up the PO line where usage.state === 'usedByThisInvoice' and usage.invoiceLineId matches
  const findAssignedPoLine = (invoiceLine: InvoiceLineItem): POLineItem | null => {
    const invoiceLineId = invoiceLine.id || `line-${invoiceLine.line_no}`;

    // Check all PO lines across all POs
    for (const poData of poDataList || []) {
      for (const poLine of poData.lines) {
        const effectiveUsage = getEffectiveUsage(poLine as POLineItem, invoiceId);

        // Match if this PO line is used by THIS invoice line
        if (effectiveUsage.state === 'usedByThisInvoice' &&
            effectiveUsage.invoiceLineId === invoiceLineId) {
          return {
            id: poLine.id,
            line_no: poLine.line_no,
            description: poLine.description || poLine.item_description || '',
            item_description: poLine.item_description,
            qty_ordered: poLine.qty_ordered,
            uom: poLine.uom,
            unit_price: poLine.unit_price,
            usage: effectiveUsage
          } as POLineItem;
        }
      }
    }

    // Fallback: Check if invoice line has a direct po_line_id reference
    // This handles cases where PO lines don't have usage metadata (e.g., mock data)
    if (invoiceLine.po_line_id) {
      for (const poData of poDataList || []) {
        const matchedLine = poData.lines.find(pl => pl.id === invoiceLine.po_line_id);
        if (matchedLine) {
          return {
            id: matchedLine.id,
            line_no: matchedLine.line_no,
            description: matchedLine.description || matchedLine.item_description || '',
            item_description: matchedLine.item_description,
            qty_ordered: matchedLine.qty_ordered,
            uom: matchedLine.uom,
            unit_price: matchedLine.unit_price,
            usage: { state: 'usedByThisInvoice', invoiceLineId }
          } as POLineItem;
        }
      }
    }

    // Fallback: Check if invoice line has a suggested_po_match (AI suggestion)
    // Show the suggested PO line on the PO side so user can see the proposed match
    if (invoiceLine.suggested_po_match?.po_line_id) {
      for (const poData of poDataList || []) {
        const matchedLine = poData.lines.find(pl => pl.id === invoiceLine.suggested_po_match!.po_line_id);
        if (matchedLine) {
          return {
            id: matchedLine.id,
            line_no: matchedLine.line_no,
            description: matchedLine.description || matchedLine.item_description || '',
            item_description: matchedLine.item_description,
            qty_ordered: matchedLine.qty_ordered,
            uom: matchedLine.uom,
            unit_price: matchedLine.unit_price,
            usage: { state: 'suggested', invoiceLineId }
          } as POLineItem;
        }
      }
    }

    return null;
  };

  // Reassignment dropdown state
  const [reassignmentDropdownOpen, setReassignmentDropdownOpen] = useState<string | null>(null);

  // Toggle states for showing PO and Receipt data
  const [showPO, setShowPO] = useState(poLines.length > 0); // Default to ON when PO lines available
  const [showReceipt, setShowReceipt] = useState(false);

  // Keep showPO in sync when poLines changes - always ON when PO lines are available
  useEffect(() => {
    if (poLines.length > 0 && !showPO) {
      setShowPO(true);
    }
  }, [poLines.length]);

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
      // If available width is very large (> 1400px), always disable sticky behavior
      // This typically indicates the PDF panel is collapsed and there's plenty of space
      const hasSpace = availableWidth > 1400 || availableWidth >= totalNeeded + 5;

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

  // Check if line has suggestion and it's not yet accepted/rejected
  const hasSuggestion = (line: InvoiceLineItem): boolean => {
    const lineId = line.id || `line-${line.line_no}`;
    return !!line.suggested_po_match &&
           !acceptedSuggestions.has(lineId) &&
           !rejectedSuggestions.has(lineId);
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

  // ============================================================================
  // MULTI-PO HELPER FUNCTIONS
  // ============================================================================

  // Get the PO number that an invoice line is matched to
  const getMatchedPONumber = (invoiceLine: InvoiceLineItem): string | null => {
    // Check for staged reassignment first
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    if (stagedReassignments[lineId]) {
      return stagedReassignments[lineId].newPoNumber;
    }

    // Find match result for this line
    const matchResult = matchResults?.find(mr => mr.invoice_line_id === lineId);
    if (!matchResult?.matched_po_line_id) return null;

    // Find which PO contains this line
    if (poDataList) {
      for (const poData of poDataList) {
        const poLine = poData.lines.find(pl => pl.id === matchResult.matched_po_line_id);
        if (poLine) {
          return poData.po_number;
        }
      }
    }

    // Fallback: if only one PO, return that
    if (poDataList && poDataList.length === 1) {
      return poDataList[0].po_number;
    }

    return null;
  };

  // Get formatted utilization summary for dropdown display
  const getUtilizationSummary = (poNumber: string): string => {
    if (!utilization || !utilization[poNumber]) return '';

    const util = utilization[poNumber];
    const linesText = `${util.usedLines}/${util.totalLines} lines`;
    const amountText = `${currency}${(util.usedAmount / 1000).toFixed(1)}k/${(util.totalAmount / 1000).toFixed(1)}k`;

    return `${linesText} • ${amountText}`;
  };

  // Get aggregated utilization for all POs
  const getTotalUtilization = (): string => {
    if (!utilization || !poDataList) return '';

    const totalUsed = poDataList.reduce((sum, po) => {
      const util = utilization[po.po_number];
      return sum + (util?.usedLines || 0);
    }, 0);

    const totalLines = poDataList.reduce((sum, po) => {
      const util = utilization[po.po_number];
      return sum + (util?.totalLines || 0);
    }, 0);

    const totalUsedAmount = poDataList.reduce((sum, po) => {
      const util = utilization[po.po_number];
      return sum + (util?.usedAmount || 0);
    }, 0);

    const totalAmount = poDataList.reduce((sum, po) => {
      const util = utilization[po.po_number];
      return sum + (util?.totalAmount || 0);
    }, 0);

    return `${poDataList.length} POs • ${totalUsed}/${totalLines} lines • ${currency}${(totalUsedAmount / 1000).toFixed(1)}k/${(totalAmount / 1000).toFixed(1)}k`;
  };

  // Get badge text for PO table header (lines only, no amounts)
  const getPOBadgeText = (): string => {
    if (!poDataList || poDataList.length === 0) return '';

    if (isMultiPO) {
      // Multi-PO: show aggregate "N POs • X/Y lines"
      const totalUsed = poDataList.reduce((sum, po) => {
        const util = utilization?.[po.po_number];
        return sum + (util?.usedLines || 0);
      }, 0);

      const totalLines = poDataList.reduce((sum, po) => {
        const util = utilization?.[po.po_number];
        return sum + (util?.totalLines || 0);
      }, 0);

      return `${poDataList.length} POs • ${totalUsed}/${totalLines} lines`;
    } else {
      // Single PO: show "PO-XXXX • X/Y lines"
      const poNumber = poDataList[0].po_number;
      const util = utilization?.[poNumber];
      if (util) {
        return `${poNumber} • ${util.usedLines}/${util.totalLines} lines`;
      }
      return poNumber;
    }
  };

  // Determine row highlighting class based on selected PO (background only - border goes on first cell)
  const getRowHighlightClass = (invoiceLine: InvoiceLineItem): string => {
    if (!isMultiPO || selectedPO === 'all') return '';

    const matchedPO = getMatchedPONumber(invoiceLine);
    if (matchedPO === selectedPO) {
      // Use dynamic colors matching the PO pill (background only)
      return getHighlightBgClass(matchedPO);
    }

    return 'opacity-50'; // Dimmed
  };

  // Get border class for first cell of invoice table row
  const getRowBorderClass = (invoiceLine: InvoiceLineItem): string => {
    if (!isMultiPO || selectedPO === 'all') return '';

    const matchedPO = getMatchedPONumber(invoiceLine);
    if (matchedPO === selectedPO) {
      return `border-l-2 ${getHighlightBorderClass(matchedPO)}`;
    }
    return '';
  };

  // Get slots for PO table display - spotlight mode (no filtering, just visual highlight/dim)
  const getFilteredSlotsForPOTable = (slots: TableSlot[]): TableSlot[] => {
    // Spotlight mode: always return all slots unchanged
    // The dropdown is a focus/highlight tool, not a filter
    return slots;
  };

  // Get row highlight class for PO table rows (spotlight mode - background only, border goes on first cell)
  const getPORowHighlightClass = (poLine: POLineItem | null): string => {
    if (!isMultiPO || selectedPO === 'all' || !poLine) return '';

    // Determine which PO this line belongs to
    const poNumber = poDataList?.find(po =>
      (po.lines || po.po_lines)?.some((l: any) => l.id === poLine.id)
    )?.po_number;

    if (poNumber === selectedPO) {
      // Use dynamic colors matching the PO pill (background only)
      return getHighlightBgClass(poNumber);
    }

    return 'opacity-50'; // Dimmed
  };

  // Get border class for first cell of PO table row
  const getPORowBorderClass = (poLine: POLineItem | null): string => {
    if (!isMultiPO || selectedPO === 'all' || !poLine) return '';

    const poNumber = poDataList?.find(po =>
      (po.lines || po.po_lines)?.some((l: any) => l.id === poLine.id)
    )?.po_number;

    if (poNumber === selectedPO) {
      return `border-l-2 ${getHighlightBorderClass(poNumber)}`;
    }
    return '';
  };

  // Get PO number for a PO line (used for sorting and highlighting)
  const getPONumberForLine = (poLine: POLineItem | null): string | null => {
    if (!poLine) return null;
    return poDataList?.find(po =>
      (po.lines || po.po_lines)?.some((l: any) => l.id === poLine.id)
    )?.po_number || null;
  };

  // Check if an invoice line has a staged reassignment
  const hasStagedReassignment = (invoiceLine: InvoiceLineItem): boolean => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    return !!stagedReassignments[lineId];
  };

  // Get badge color classes for PO number
  const getPOBadgeClasses = (poNumber: string): { bg: string; text: string } => {
    const colorClasses = [
      { bg: 'bg-purple-100', text: 'text-purple-700' },
      { bg: 'bg-blue-100', text: 'text-blue-700' },
      { bg: 'bg-green-100', text: 'text-green-700' },
      { bg: 'bg-orange-100', text: 'text-orange-700' },
      { bg: 'bg-pink-100', text: 'text-pink-700' },
    ];
    const index = allPONumbers.indexOf(poNumber);
    // Handle case where PO is not found (index === -1) or allPONumbers is empty
    const colorIndex = index === -1 ? 0 : index % colorClasses.length;
    return colorClasses[colorIndex];
  };

  // Get border color class for PO number (matches badge colors)
  const getHighlightBorderClass = (poNumber: string): string => {
    const borderClasses = [
      'border-purple-600',
      'border-blue-600',
      'border-green-600',
      'border-orange-600',
      'border-pink-600',
    ];
    const index = allPONumbers.indexOf(poNumber);
    const colorIndex = index === -1 ? 0 : index % borderClasses.length;
    return borderClasses[colorIndex];
  };

  // Get background color class for PO number (matches badge colors)
  const getHighlightBgClass = (poNumber: string): string => {
    const bgClasses = [
      'bg-purple-50',
      'bg-blue-50',
      'bg-green-50',
      'bg-orange-50',
      'bg-pink-50',
    ];
    const index = allPONumbers.indexOf(poNumber);
    const colorIndex = index === -1 ? 0 : index % bgClasses.length;
    return bgClasses[colorIndex];
  };

  // Get display label for selected PO
  const getSelectedPOLabel = (): React.ReactNode => {
    if (!selectedPO || selectedPO === 'all') {
      return <span className="font-medium">All POs</span>;
    }
    const badgeClasses = getPOBadgeClasses(selectedPO);
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badgeClasses.bg} ${badgeClasses.text}`}>
        {selectedPO}
      </span>
    );
  };

  // Build list of available PO lines for reassignment dropdown
  const buildAvailablePOLines = (currentInvoiceLine: InvoiceLineItem) => {
    if (!poDataList || poDataList.length === 0) return [];

    const availableLines: Array<{
      poNumber: string;
      poLineId: string;
      lineNo: number;
      description: string;
      qty: number;
      price: number;
      uom: string;
      usage: POLineUsage;
    }> = [];

    poDataList.forEach(poData => {
      const poLines = poData.lines || poData.po_lines || [];
      poLines.forEach((poLine: any) => {
        // Get effective usage considering staged reassignments
        const effectiveUsage = getEffectiveUsage(poLine, invoiceId);

        availableLines.push({
          poNumber: poData.po_number,
          poLineId: poLine.id,
          lineNo: poLine.line_no || 0,
          description: poLine.description || poLine.item_description || '',
          qty: parseFloat(poLine.qty_ordered?.toString() || '0'),
          price: parseFloat(poLine.unit_price?.toString() || '0'),
          uom: poLine.uom || '',
          usage: effectiveUsage
        });
      });
    });

    return availableLines;
  };

  // Get PO lines that are not matched to any invoice line on this invoice
  // These are "other" lines: unused ones available for assignment, plus ones used by other invoices
  // Returns data grouped by PO, respecting the selectedPO filter
  const getOtherPOLines = () => {
    type LineInfo = {
      poLineId: string;
      lineNo: number;
      description: string;
      qty: number;
      price: number;
      uom: string;
    };

    type UsedByOtherLineInfo = LineInfo & {
      usedByInvoice: string;
    };

    type POGroup = {
      poNumber: string;
      unused: LineInfo[];
      usedByOther: UsedByOtherLineInfo[];
    };

    if (!poDataList || poDataList.length === 0) {
      return { poGroups: [], totalUnused: 0, totalUsedByOther: 0 };
    }

    const poGroupsMap: Map<string, POGroup> = new Map();

    // Filter poDataList based on selectedPO
    const filteredPODataList = selectedPO === 'all'
      ? poDataList
      : poDataList.filter(po => po.po_number === selectedPO);

    filteredPODataList.forEach(poData => {
      const poLines = poData.lines || poData.po_lines || [];

      poLines.forEach((poLine: any) => {
        const effectiveUsage = getEffectiveUsage(poLine, invoiceId);

        // Only include unused or usedByOtherInvoice lines
        if (effectiveUsage.state === 'unused' || effectiveUsage.state === 'usedByOtherInvoice') {
          // Get or create the PO group
          if (!poGroupsMap.has(poData.po_number)) {
            poGroupsMap.set(poData.po_number, {
              poNumber: poData.po_number,
              unused: [],
              usedByOther: []
            });
          }
          const group = poGroupsMap.get(poData.po_number)!;

          const lineInfo: LineInfo = {
            poLineId: poLine.id,
            lineNo: poLine.line_no || 0,
            description: poLine.description || poLine.item_description || '',
            qty: parseFloat(poLine.qty_ordered?.toString() || '0'),
            price: parseFloat(poLine.unit_price?.toString() || '0'),
            uom: poLine.uom || ''
          };

          if (effectiveUsage.state === 'unused') {
            group.unused.push(lineInfo);
          } else if (effectiveUsage.state === 'usedByOtherInvoice') {
            group.usedByOther.push({
              ...lineInfo,
              usedByInvoice: effectiveUsage.invoiceNumber || effectiveUsage.invoiceId || 'another invoice'
            });
          }
        }
        // Lines with state === 'usedByThisInvoice' are matched to this invoice, so not "other"
      });
    });

    // Convert map to array and filter out POs with no leftover lines
    const poGroups = Array.from(poGroupsMap.values()).filter(
      group => group.unused.length > 0 || group.usedByOther.length > 0
    );

    // Sort by PO number, with selected PO first when a specific PO is selected
    poGroups.sort((a, b) => {
      if (selectedPO !== 'all') {
        if (a.poNumber === selectedPO && b.poNumber !== selectedPO) return -1;
        if (a.poNumber !== selectedPO && b.poNumber === selectedPO) return 1;
      }
      return a.poNumber.localeCompare(b.poNumber);
    });

    // Calculate totals
    const totalUnused = poGroups.reduce((sum, g) => sum + g.unused.length, 0);
    const totalUsedByOther = poGroups.reduce((sum, g) => sum + g.usedByOther.length, 0);

    return { poGroups, totalUnused, totalUsedByOther };
  };

  // Handle reassignment of invoice line to a different PO line
  const handleReassignLine = (invoiceLine: InvoiceLineItem, newPoLineId: string, newPoNumber: string) => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    const currentPoNumber = getMatchedPONumber(invoiceLine);
    const currentPoLineId = invoiceLine.po_line_id || null;

    // Stage the reassignment, clearing any conflicting claims from other lines
    setStagedReassignments(prev => {
      const updated = { ...prev };

      // Clear any other line's claim to this same PO line (conflict resolution)
      // "Last action wins" - the victim line becomes unassigned (not reverted to original)
      for (const [otherLineId, reassignment] of Object.entries(updated)) {
        if (otherLineId !== lineId && reassignment.newPoLineId === newPoLineId) {
          // Set to unassigned rather than deleting (which would revert to original)
          updated[otherLineId] = {
            ...reassignment,
            newPoLineId: null,
            newPoNumber: null
          };
        }
      }

      // Add this line's reassignment
      updated[lineId] = {
        oldPoLineId: currentPoLineId,
        oldPoNumber: currentPoNumber,
        newPoLineId,
        newPoNumber
      };

      return updated;
    });

    // Close the dropdown
    setReassignmentDropdownOpen(null);

    // Show toast notification
    showToast(
      `Line reassignment staged: ${currentPoNumber || 'None'} → ${newPoNumber}`,
      'info'
    );
  };

  // Handle clearing PO line assignment
  const handleClearAssignment = (invoiceLine: InvoiceLineItem) => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    const currentPoNumber = getMatchedPONumber(invoiceLine);
    const currentPoLineId = invoiceLine.po_line_id || null;

    // Stage clearing the assignment (null values)
    setStagedReassignments(prev => ({
      ...prev,
      [lineId]: {
        oldPoLineId: currentPoLineId,
        oldPoNumber: currentPoNumber,
        newPoLineId: null,  // Clear
        newPoNumber: null   // Clear
      }
    }));

    setPoLineSearchQuery('');
    showToast(`PO line assignment cleared for line ${invoiceLine.line_no}`, 'info');
  };

  // Commit all staged reassignments
  const handleCommitReassignments = () => {
    const count = Object.keys(stagedReassignments).length;
    if (count === 0) return;

    // Apply the staged reassignments by updating editableLines
    const updatedLines = editableLines.map(line => {
      const lineId = line.id || `line-${line.line_no}`;
      const stagedChange = stagedReassignments[lineId];

      if (stagedChange) {
        return {
          ...line,
          po_line_id: stagedChange.newPoLineId
        };
      }

      return line;
    });

    setEditableLines(updatedLines);

    // Clear staged reassignments
    setStagedReassignments({});

    // Show success toast
    showToast(
      `${count} line reassignment${count > 1 ? 's' : ''} applied successfully`,
      'success'
    );
  };

  // Handle adding a new PO from the drawer
  const handleAddPO = useCallback((poNumber: string, poData: PODataWithLines) => {
    // Close drawer
    setShowAddPODrawer(false);

    // Notify parent to add PO to the invoice's linked POs
    // Parent (DetailsTab) handles showing the toast
    onAddPO?.(poNumber, poData);

    // If opened from dropdown, reopen that dropdown
    if (reopenDropdownForLineId) {
      // Use setTimeout to allow drawer close animation
      setTimeout(() => {
        setReassignmentDropdownOpen(reopenDropdownForLineId);
        setReopenDropdownForLineId(null);
      }, 350);
    }
  }, [onAddPO, reopenDropdownForLineId]);

  // Cancel all staged reassignments
  const handleCancelReassignments = () => {
    const count = Object.keys(stagedReassignments).length;
    if (count === 0) return;

    setStagedReassignments({});

    showToast(
      `${count} pending reassignment${count > 1 ? 's' : ''} cancelled`,
      'info'
    );
  };

  // ============================================================================
  // END MULTI-PO HELPER FUNCTIONS
  // ============================================================================

  // Get match result for a specific invoice line
  const getMatchResultForLine = (lineId?: string) => {
    if (!lineId) return null;
    return matchResults.find((mr) => mr.invoice_line_id === lineId);
  };

  // Helper: Find a PO line by ID across all POs
  const findPOLineById = (poLineId: string) => {
    // First try the local poLines array
    const localMatch = poLines.find(po => po.id === poLineId);
    if (localMatch) return localMatch;

    // Search across all POs in poDataList
    if (poDataList) {
      for (const poData of poDataList) {
        const lines = poData.lines || poData.po_lines || [];
        const match = lines.find((pl: any) => pl.id === poLineId);
        if (match) return match;
      }
    }
    return null;
  };

  // Get PO line that matches an invoice line
  const getMatchedPOLine = (invoiceLine: InvoiceLineItem, lineIndex?: number) => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;

    // Helper to check if a PO line has been "stolen" by another invoice line's staged reassignment
    const isStolen = (poLineId: string) => {
      // Check if any OTHER invoice line has a staged reassignment targeting this PO line
      for (const [otherLineId, reassignment] of Object.entries(stagedReassignments)) {
        if (otherLineId !== lineId && reassignment.newPoLineId === poLineId) {
          return true; // Another line has claimed this PO line
        }
      }
      return false;
    };

    // 1. Check for staged reassignment first (pending changes)
    if (stagedReassignments[lineId]?.newPoLineId) {
      return findPOLineById(stagedReassignments[lineId].newPoLineId);
    }

    // 2. Check for saved po_line_id on the invoice line
    if (invoiceLine.po_line_id) {
      // Check if this PO line was stolen by another line
      if (isStolen(invoiceLine.po_line_id)) {
        return null; // Another line claimed it
      }
      return findPOLineById(invoiceLine.po_line_id);
    }

    // 3. Check match results from backend
    const matchResult = getMatchResultForLine(lineId);
    if (matchResult?.matched_po_line_id) {
      // Check if this PO line was stolen by another line
      if (isStolen(matchResult.matched_po_line_id)) {
        return null; // Another line claimed it
      }
      return findPOLineById(matchResult.matched_po_line_id);
    }

    // 4. Index-based fallback only for initial display (before any assignments)
    if (lineIndex !== undefined && poLines[lineIndex]) {
      const poLine = poLines[lineIndex];
      // Check if this PO line was stolen by another line
      if (isStolen(poLine.id)) {
        return null; // Another line claimed it
      }
      return poLine;
    }

    return null;
  };

  // Count errors in invoice lines (for needs info mode)
  const countErrors = () => {
    // If not showing comparison, count variances from line status
    if (!showPO || poLines.length === 0) {
      // Count lines with variance status or substitution suggestions
      let varianceCount = 0;

      // Use match results if available
      if (matchResults && matchResults.length > 0) {
        varianceCount = matchResults.filter(mr => !mr.within_tolerance).length;
      }

      // Also count lines with explicit variance status or substitution suggestions
      invoiceLines.forEach(line => {
        const alreadyCounted = matchResults?.some(mr =>
          mr.invoice_line_id === line.id && !mr.within_tolerance
        );

        if (!alreadyCounted) {
          // Count lines with variance status
          if (line.status === 'variance') {
            varianceCount++;
          }
          // Count lines with pending substitution suggestions
          else if (line.suggested_po_match) {
            varianceCount++;
          }
        }
      });

      return varianceCount;
    }

    // If showing comparison, count mismatches
    // IMPORTANT: This logic must match getLineStatus() exactly
    // Use editableLines (same as visual rendering) not invoiceLines
    let errorCount = 0;
    editableLines.forEach((invoiceLine, index) => {
      const poLine = getMatchedPOLine(invoiceLine, index);
      const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;

      // Match getLineStatus() logic exactly:

      // 1. Accepted suggestions are matched (not variance)
      if (acceptedSuggestions.has(lineId)) {
        return; // matched
      }

      // 2. Rejected suggestions are variances
      if (rejectedSuggestions.has(lineId)) {
        errorCount++;
        return;
      }

      // 3. Pending suggestions are variances (whether or not they have a matched PO)
      if (hasSuggestion(invoiceLine)) {
        errorCount++;
        return;
      }

      // 4. Manually unmatched lines are variances
      if (unmatchedLines.has(lineId)) {
        errorCount++;
        return;
      }

      // 5. Smart matches (UOM or description difference auto-matched) are matched
      if (poLine && (hasMatchedUomDifference(invoiceLine, poLine) || hasMatchedDescriptionDifference(invoiceLine, poLine))) {
        return; // matched
      }

      // 6. Custom rule matches are matched
      if (poLine && hasCustomRuleMatch(invoiceLine, poLine)) {
        return; // matched
      }

      // 7. No PO line = missing (not counted as variance for the pill)
      if (!poLine) return;

      // 8. Actual mismatches are variances
      if (hasMismatch(invoiceLine, poLine)) {
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
  
  // Check if line has any visible variance (for row background highlighting)
  const hasAnyVariance = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    if (!poLine) return false;
    
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    
    // Skip if manually matched or has custom rule/UoM conversion
    if (manuallyMatchedLines.has(lineId) || hasCustomRuleMatch(invoiceLine, poLine) || hasMatchedUomDifference(invoiceLine, poLine)) {
      return false;
    }
    
    // Check for description variance
    if ((unmatchedLines.has(lineId) && hasDescriptionDifference(invoiceLine, poLine)) || hasSuggestion(invoiceLine)) {
      return true;
    }
    
    // Check for quantity variance
    if (Math.abs(invoiceLine.qty - poLine.qty_ordered) > 0.01) {
      return true;
    }
    
    // Check for unit price variance (unless suppressed)
    if (Math.abs(invoiceLine.unit_price - poLine.unit_price) > 0.01 && !invoiceLine.suppress_price_variance) {
      return true;
    }
    
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
    // UNLESS the line has been manually marked as matched
    if (hasSuggestion(invoiceLine) && !manuallyMatchedLines.has(lineId)) {
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
  // This is a "smart match" - descriptions differ BUT values (qty/price) match
  const hasMatchedDescriptionDifference = (invoiceLine: InvoiceLineItem, poLine: POLineItem | null): boolean => {
    const lineId = invoiceLine.id || `line-${invoiceLine.line_no}`;
    // Only a "smart match" if descriptions differ but VALUES MATCH (qty/price are the same)
    return hasDescriptionDifference(invoiceLine, poLine) && !hasMismatch(invoiceLine, poLine) && !unmatchedLines.has(lineId);
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

    // Direction-aware conversion check (same logic as RuleChatInterface validation)
    const poUomNormalized = poLine.uom.toLowerCase().replace(/s$/, '');
    const fromUnitNormalized = rule.fromUnit.toLowerCase().replace(/s$/, '');
    const toUnitNormalized = rule.toUnit.toLowerCase().replace(/s$/, '');

    if (poUomNormalized === fromUnitNormalized) {
      // PO is in fromUnit, convert PO qty to invoice UOM and compare
      const expectedInvoiceQty = poLine.qty_ordered * (rule.toQuantity / rule.fromQuantity);
      return Math.abs(expectedInvoiceQty - invoiceLine.qty) < 0.01;
    } else if (poUomNormalized === toUnitNormalized) {
      // PO is in toUnit, convert invoice qty to PO UOM and compare
      const expectedPOQty = invoiceLine.qty * (rule.fromQuantity / rule.toQuantity);
      return Math.abs(expectedPOQty - poLine.qty_ordered) < 0.01;
    }

    return false;
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

  // Report error count changes to parent component
  useEffect(() => {
    if (onErrorCountChange) {
      onErrorCountChange(errorCount);
    }
  }, [errorCount, onErrorCountChange]);

  // Calculate validation state for parent component (for reactive validation results)
  const getValidationState = (): LineItemsValidationState => {
    const resolvedLineIds: string[] = [];
    let allLinesMatched = true;

    editableLines.forEach((line, index) => {
      const matchedPO = getMatchedPOLine(line, index);
      const lineId = line.id || `line-${line.line_no}`;
      // Use line_no for field matching (validation fields use line_<line_no>)
      const lineNumber = line.line_no;
      const fieldLineId = `line-${lineNumber}`;

      // Check if this line was originally a variance but is now resolved
      const hasOriginalMismatch = matchedPO && hasMismatch(line, matchedPO);
      const hadSuggestion = line.suggested_po_match;

      // Line is resolved if:
      // 1. It had a mismatch that was fixed by manual match, accepted suggestion, custom rule, or UOM conversion
      // 2. It had a suggestion that was accepted or manually marked as matched
      const isResolved =
        (hasOriginalMismatch && (manuallyMatchedLines.has(lineId) || acceptedSuggestions.has(lineId) || (matchedPO && hasCustomRuleMatch(line, matchedPO)) || (matchedPO && hasMatchedUomDifference(line, matchedPO)))) ||
        (hadSuggestion && (acceptedSuggestions.has(lineId) || manuallyMatchedLines.has(lineId)));

      if (isResolved) {
        resolvedLineIds.push(fieldLineId);
      }

      // Check if this line is currently a variance
      // For lines with suggestions, also check manuallyMatchedLines to allow "Mark as Matched" to clear the variance
      const isVariance = (matchedPO && hasOriginalMismatch &&
                         !manuallyMatchedLines.has(lineId) &&
                         !acceptedSuggestions.has(lineId) &&
                         !hasCustomRuleMatch(line, matchedPO) &&
                         !hasMatchedUomDifference(line, matchedPO)) ||
                         (hadSuggestion && !acceptedSuggestions.has(lineId) && !manuallyMatchedLines.has(lineId));

      if (isVariance) {
        allLinesMatched = false;
      }
    });

    return {
      errorCount,
      resolvedLineIds,
      allLinesMatched
    };
  };

  // Report validation state changes to parent component
  useEffect(() => {
    if (onValidationStateChange) {
      const validationState = getValidationState();
      onValidationStateChange(validationState);
    }
  }, [errorCount, acceptedSuggestions, manuallyMatchedLines, customRules, editableLines, onValidationStateChange]);

  // Categorize lines into variances and matched for grouped view
  const categorizeLines = () => {
    const varianceLines: InvoiceLineItem[] = [];
    const matchedLines: InvoiceLineItem[] = [];

    editableLines.forEach((line, index) => {
      const matchedPO = getMatchedPOLine(line, index);
      const lineId = line.id || `line-${line.line_no}`;

      // Check if it's a variance
      // Lines with matching custom rules or UOM conversions should NOT be variances
      const isVariance = matchedPO &&
                        hasMismatch(line, matchedPO) &&
                        !manuallyMatchedLines.has(lineId) &&
                        !acceptedSuggestions.has(lineId) &&
                        !hasCustomRuleMatch(line, matchedPO) &&
                        !hasMatchedUomDifference(line, matchedPO);

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
  // IMPORTANT: Grid is driven by INVOICE LINES only - PO lines are matched via usage metadata
  const generateSlots = (): TableSlot[] => {
    // Calculate max rows needed - driven by INVOICE lines only (not PO lines)
    // Unassigned PO lines should only appear in "Other PO Lines" section
    const maxInvoicePosition = editableLines.reduce((max, line) =>
      Math.max(max, line.display_position ?? 0), -1
    );
    const maxRows = Math.max(
      maxInvoicePosition + 1,
      editableLines.length // Ensure at least as many slots as lines
      // REMOVED: poLines.length - grid should NOT create rows for unassigned PO lines
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

      // Get the invoice line for this slot
      const invoiceLine = isDraggedPosition ? null : lineAtPosition || null;

      // Find the assigned PO line based on usage (not by index)
      // This ensures only PO lines with usage.state === 'usedByThisInvoice' appear in the grid
      const assignedPoLine = invoiceLine ? findAssignedPoLine(invoiceLine) : null;

      return {
        position,
        // If this is the dragged position, treat it as empty (but keep the line reference for the placeholder)
        invoiceLine,
        poLine: assignedPoLine
      };
    });

    return slots;
  };

  const slots = generateSlots();

  // Process slots for grouped view if needed
  const getDisplaySlots = () => {
    if (viewMode === 'default') {
      // Sort by line number, with selected PO lines first when a specific PO is selected
      const sortedSlots = [...slots].sort((a, b) => {
        // When a specific PO is selected, prioritize those lines
        if (isMultiPO && selectedPO !== 'all') {
          const poNumberA = getPONumberForLine(a.poLine);
          const poNumberB = getPONumberForLine(b.poLine);

          // Selected PO lines come first
          if (poNumberA === selectedPO && poNumberB !== selectedPO) return -1;
          if (poNumberA !== selectedPO && poNumberB === selectedPO) return 1;
        }

        // Then sort by line number
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

  // Toggle edit mode (Save when exiting)
  const toggleEditMode = () => {
    const newEditMode = !isEditMode;
    if (!newEditMode) {
      // Exiting edit mode (Save) - commit staged reassignments first
      let linesToSave = editableLines;

      // Apply staged reassignments if any
      if (Object.keys(stagedReassignments).length > 0) {
        linesToSave = editableLines.map(line => {
          const lineId = line.id || `line-${line.line_no}`;
          const stagedChange = stagedReassignments[lineId];
          if (stagedChange) {
            return {
              ...line,
              po_line_id: stagedChange.newPoLineId
            };
          }
          return line;
        });
        setEditableLines(linesToSave);
        setStagedReassignments({});
      }

      // Save the changes
      onLinesUpdate?.(linesToSave);
    }
    setIsEditMode(newEditMode);
    // Notify parent of edit mode change
    onEditModeChange?.(newEditMode);
  };

  // Cancel edit mode - discard all changes including staged reassignments
  const cancelEditMode = () => {
    // Reset editable lines to original invoice lines
    const originalWithPositions = invoiceLines.map((line, index) => ({
      ...line,
      display_position: line.display_position ?? index
    }));
    setEditableLines(originalWithPositions);

    // Clear staged reassignments
    if (Object.keys(stagedReassignments).length > 0) {
      setStagedReassignments({});
      showToast('Changes cancelled', 'info');
    }

    setIsEditMode(false);
    onEditModeChange?.(false);
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
            {invoiceLines.length} {invoiceLines.length === 1 ? 'line' : 'lines'}
          </span>
          {/* Only show matching badge for PO invoices */}
          {!isNonPO && (
            errorCount > 0 ? (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                <AlertCircle className="h-3 w-3" />
                {errorCount} {errorCount === 1 ? 'variance' : 'variances'}
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <CheckCircle className="h-3 w-3" />
                Fully Matched
              </span>
            )
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
            <div className="flex items-center gap-2">
              {isEditMode && (
                <button
                  onClick={toggleEditMode}
                  className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={toggleEditMode}
                className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                  isEditMode
                    ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                    : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                }`}
              >
                {isEditMode ? 'Save' : 'Edit'}
              </button>
            </div>
          )}

          {/* Expand/Collapse button - moved to last position */}
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
            <>
            <div ref={flexContainerRef} className="flex min-h-full w-full">
              {/* Invoice Lines */}
              <div className="flex-shrink-0 flex-grow border-r border-gray-200">
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
                <table className="w-full min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={useDetailedVarianceColumns ? (isEditMode ? 13 : 11) : (11 + (isEditMode ? 2 : 0))} className="px-4 bg-white border-b h-[36px]">
                        <div className="flex items-center justify-between h-full">
                          {/* Left side: Invoice title and Compare toggle */}
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-950">Invoice</span>
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {invoiceLines.length} {invoiceLines.length === 1 ? 'line' : 'lines'}
                            </span>
                            {/* Hide PO toggle for non-PO invoices */}
                            {!isNonPO && (
                              <>
                                <div className="h-5 w-px bg-gray-300"></div>
                                <span className="text-xs font-medium text-gray-600">Compare to:</span>
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
                              </>
                            )}
                          </div>

                          {/* Right side: Edit/Save/Cancel buttons */}
                          <div className="flex items-center gap-2">
                            {!hideEditButton && (
                              <div className="flex items-center gap-2">
                                {isEditMode && (
                                  <button
                                    onClick={cancelEditMode}
                                    className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={toggleEditMode}
                                  className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                    isEditMode
                                      ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                                      : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                                  }`}
                                >
                                  {isEditMode ? (Object.keys(stagedReassignments).length > 0 ? `Save (${Object.keys(stagedReassignments).length})` : 'Save') : 'Edit'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      {isEditMode && (
                        <th className="hidden px-1 text-center text-xs font-medium text-gray-800 uppercase w-6"></th>
                      )}
                      <th className="pl-3 pr-1 text-right text-xs font-medium text-gray-800 uppercase w-6">#</th>
                      <th className="w-6"></th>
                      <th className="px-1 text-left text-xs font-medium text-gray-800 uppercase w-16">
                        Status
                      </th>
                      <th className="px-1 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1 text-left text-xs font-medium text-gray-800 uppercase w-16">SKU</th>
                      <th className="px-1 text-right text-xs font-medium text-gray-800 uppercase w-12">Qty</th>
                      <th className="px-1 text-center text-xs font-medium text-gray-800 uppercase w-10">UOM</th>
                      <th className="px-1 text-right text-xs font-medium text-gray-800 uppercase w-16">Price</th>
                      <th className="pl-1 pr-2 text-right text-xs font-medium text-gray-800 uppercase w-20">Total</th>
                      {!useDetailedVarianceColumns && showPO && (
                        <th className="px-1 text-center text-xs font-medium text-gray-800 uppercase w-16">Variance</th>
                      )}
                      {isEditMode && (
                        <th className="px-1 text-center text-xs font-medium text-gray-800 uppercase w-12">Actions</th>
                      )}
                      {showAssignedPOColumn && (
                        <th className="px-1 pl-3 text-left text-xs font-medium text-gray-800 uppercase whitespace-nowrap">Assigned PO Line</th>
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
                              <td className="hidden px-1 py-2 text-center cursor-grab active:cursor-grabbing" {...listeners}>
                                <GripVertical className="h-4 w-4 text-gray-400" />
                              </td>
                            )}
                            <td className={`pl-3 pr-1 py-2 text-xs text-right text-gray-950 w-6 ${getRowBorderClass(line)}`}>{line.line_no}</td>
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
                              ) : matchedPO && (hasUomConversion(line) || hasMatchedDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
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
                                        confidence={(line as any).smart_match_confidence}
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
                              ) : null}
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
                                {isNonPO ? 'Not Approved' : 'Not Matched'}
                              </span>
                            )}
                          </td>
                          <td className="px-1 py-2 text-xs text-gray-950">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.description}
                                onChange={(e) => handleLineChange(lineIndex, 'description', e.target.value)}
                                className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                              />
                            ) : (
                              <div className={`truncate max-w-[160px] ${
                                (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                                  ? 'font-bold text-red-600'
                                  : ''
                              }`} title={line.description}>
                                {line.description}
                              </div>
                            )}
                          </td>
                          <td className="px-1 py-2 text-xs text-gray-950 w-16">
                            {getSKU(line)}
                          </td>
                          <td className="px-1 py-2 text-xs text-right text-gray-950 w-12">
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.qty}
                                onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                className={`w-12 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                    ? ''
                                    : 'border border-gray-300'
                                }`}
                              />
                            ) : (() => {
                              const qtyCorrection = getQuantityCorrection(line.line_no);
                              if (qtyCorrection) {
                                return (
                                  <div className="flex items-center justify-end gap-1">
                                    <span className="text-gray-400 line-through text-xs">
                                      {qtyCorrection.original_value}
                                    </span>
                                    <span className="text-gray-950 font-medium">
                                      {qtyCorrection.corrected_value}
                                    </span>
                                    <Tooltip.Provider>
                                      <Tooltip.Root delayDuration={200}>
                                        <Tooltip.Trigger asChild>
                                          <Zap className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                                        </Tooltip.Trigger>
                                        <Tooltip.Portal>
                                          <Tooltip.Content
                                            side="top"
                                            className="z-50 max-w-xs rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
                                            sideOffset={5}
                                          >
                                            <div className="space-y-1">
                                              <div className="font-semibold">{qtyCorrection.agent_name}</div>
                                              <div>{qtyCorrection.reason}</div>
                                            </div>
                                            <Tooltip.Arrow className="fill-gray-900" />
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    </Tooltip.Provider>
                                  </div>
                                );
                              }
                              const hasVariance = matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO);
                              return <span className={hasVariance ? 'font-bold text-red-600' : ''}>{line.qty}</span>;
                            })()}
                          </td>
                          <td className="px-1 py-2 text-xs text-center text-gray-950 w-10">
                            {isEditMode ? (
                              <input
                                type="text"
                                value={line.uom}
                                onChange={(e) => handleLineChange(lineIndex, 'uom', e.target.value)}
                                className="w-10 px-1 py-0.5 text-xs text-center border border-gray-300 rounded focus:border-purple-500 focus:outline-none"
                              />
                            ) : (
                              line.uom
                            )}
                          </td>
                          <td className="px-1 py-2 text-xs text-right text-gray-950 w-16">
                            {isEditMode ? (
                              <input
                                type="number"
                                value={line.unit_price}
                                onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                                className={`w-14 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                  matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO) && !line.suppress_price_variance
                                    ? ''
                                    : 'border border-gray-300'
                                }`}
                              />
                            ) : (
                              <span className={
                                matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO) && !line.suppress_price_variance && !line.suppress_price_variance
                                  ? 'font-bold text-red-600'
                                  : ''
                              }>
                                {formatCurrency(line.unit_price)}
                              </span>
                            )}
                          </td>
                          <td className="pl-1 pr-2 py-2 text-xs text-right font-medium text-gray-950 w-20">
                            {formatCurrency(line.line_total)}
                          </td>
                          {!useDetailedVarianceColumns && showPO && (
                            <td className="px-1 py-2 text-xs w-16">
                              {matchedPO && (
                                <div className="flex flex-col items-center gap-0.5">
                                  {/* Show 0 variance when custom rule matches OR UOM conversion reconciles */}
                                  {(hasCustomRuleMatch(line, matchedPO) || hasMatchedUomDifference(line, matchedPO)) ? (
                                    <span className="text-green-600 font-bold text-xs">0 / {formatCurrency(0)}</span>
                                  ) : (
                                    <>
                                      {Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && (
                                        <span className={`text-xs font-semibold ${
                                          hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                        }`}>
                                          Qty: {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                        </span>
                                      )}
                                      {Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !line.suppress_price_variance && (
                                        <span className={`text-xs font-semibold ${
                                          hasMatchedUomDifference(line, matchedPO) ? 'text-purple-700' : 'text-red-600'
                                        }`}>
                                          Price: {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                        </span>
                                      )}
                                      {Math.abs(line.qty - matchedPO.qty_ordered) <= 0.01 && Math.abs(line.unit_price - matchedPO.unit_price) <= 0.01 && (
                                        <span className="text-green-600 font-bold text-xs">0 / {formatCurrency(0)}</span>
                                      )}
                                    </>
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
                          {/* PO / Line column - conditionally visible */}
                          {showAssignedPOColumn && (
                          <td className="px-1.5 pl-3 py-2 text-xs text-left whitespace-nowrap">
                            {(() => {
                              const matchedPoNumber = getMatchedPONumber(line);
                              const matchedPoLine = getMatchedPOLine(line, lineIndex);
                              const isUnmatched = !matchedPoNumber || !matchedPoLine;

                              // In edit mode: show clickable dropdown (for both matched AND unmatched)
                              if (isEditMode && poDataList && poDataList.length > 0) {
                                const badgeClasses = !isUnmatched ? getPOBadgeClasses(matchedPoNumber) : { bg: '', text: '' };
                                const pillText = !isUnmatched ? `${matchedPoNumber} · L${matchedPoLine.line_no}` : '';
                                const availableLines = buildAvailablePOLines(line);
                                const filteredLines = availableLines.filter(l =>
                                  l.description.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                  l.poNumber.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                  `L${l.lineNo}`.toLowerCase().includes(poLineSearchQuery.toLowerCase())
                                );

                                return (
                                  <Popover.Root
                                    onOpenChange={(open) => {
                                      if (!open) setPoLineSearchQuery('');
                                    }}
                                  >
                                    <Popover.Trigger className={isUnmatched
                                      ? `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:bg-gray-100 transition-colors whitespace-nowrap text-gray-700 bg-gray-50 border border-gray-300`
                                      : `inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${badgeClasses.bg} ${badgeClasses.text}`
                                    }>
                                      {isUnmatched ? 'Unmatched' : pillText}
                                      <ChevronDown className="h-3 w-3" />
                                    </Popover.Trigger>
                                    <Popover.Portal>
                                      <Popover.Content
                                        className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 w-[480px]"
                                        style={{ zIndex: 99999 }}
                                        sideOffset={5}
                                        align="start"
                                      >
                                        {/* Sticky search field */}
                                        <div className="sticky top-0 bg-white border-b border-gray-100 p-2 z-10">
                                          <input
                                            type="text"
                                            placeholder="Search lines..."
                                            value={poLineSearchQuery}
                                            onChange={(e) => setPoLineSearchQuery(e.target.value)}
                                            autoFocus
                                            className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                          />
                                        </div>
                                        <div className="p-1 max-h-[280px] overflow-y-auto">
                                          {/* Clear Assignment Option - only show if already matched */}
                                          {!isUnmatched && (
                                            <Popover.Close asChild>
                                              <button
                                                onClick={() => handleClearAssignment(line)}
                                                className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-red-50 text-gray-600 border-b border-gray-100 mb-1"
                                              >
                                                <X className="h-3 w-3 mr-2 text-gray-400" />
                                                <span>No PO line / Clear assignment</span>
                                              </button>
                                            </Popover.Close>
                                          )}
                                          {filteredLines.map((poLine) => {
                                            const lineBadgeClasses = getPOBadgeClasses(poLine.poNumber);
                                            const isCurrentMatch = !isUnmatched && poLine.poLineId === matchedPoLine?.id;
                                            const isUsedByOther = poLine.usage.state === 'usedByOtherInvoice';
                                            const isUsedByThis = poLine.usage.state === 'usedByThisInvoice' && !isCurrentMatch;
                                            const invoiceNumber = isUsedByOther && poLine.usage.state === 'usedByOtherInvoice'
                                              ? poLine.usage.invoiceNumber || 'other'
                                              : undefined;

                                            // Disabled row for lines used by other invoices
                                            if (isUsedByOther) {
                                              return (
                                                <div
                                                  key={poLine.poLineId}
                                                  className="w-full flex items-center px-2 py-1.5 text-xs rounded bg-amber-50/50 cursor-not-allowed"
                                                >
                                                  {/* PO Badge - fixed width */}
                                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                    {poLine.poNumber}
                                                  </span>
                                                  {/* Line number - fixed width */}
                                                  <span className="text-gray-600 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                  {/* Description - flex grows */}
                                                  <span className="text-gray-600 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                  {/* Qty - fixed width */}
                                                  <span className="text-gray-500 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                  {/* Price - fixed width */}
                                                  <span className="text-gray-600 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                  {/* Status chip - fixed width */}
                                                  <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 truncate max-w-full" title={`Used by ${invoiceNumber}`}>
                                                      {invoiceNumber}
                                                    </span>
                                                  </span>
                                                </div>
                                              );
                                            }

                                            // Selectable row
                                            return (
                                              <Popover.Close asChild key={poLine.poLineId}>
                                                <button
                                                  onClick={() => {
                                                    handleReassignLine(line, poLine.poLineId, poLine.poNumber);
                                                    setPoLineSearchQuery('');
                                                  }}
                                                  className={`w-full flex items-center px-2 py-1.5 text-xs rounded outline-none cursor-pointer hover:bg-gray-100 focus:bg-gray-100 ${
                                                    isCurrentMatch ? 'bg-purple-50 border-l-2 border-purple-500' :
                                                    isUsedByThis ? 'bg-blue-50/50' : ''
                                                  }`}
                                                >
                                                  {/* PO Badge - fixed width */}
                                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                    {poLine.poNumber}
                                                  </span>
                                                  {/* Line number - fixed width */}
                                                  <span className="text-gray-900 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                  {/* Description - flex grows */}
                                                  <span className="text-gray-900 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                  {/* Qty - fixed width */}
                                                  <span className="text-gray-700 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                  {/* Price - fixed width */}
                                                  <span className="text-gray-950 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                  {/* Status chip - fixed width */}
                                                  <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                    {isCurrentMatch && (
                                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                                                        <Check className="h-2.5 w-2.5" />
                                                        Selected
                                                      </span>
                                                    )}
                                                    {isUsedByThis && (
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
                                                        In use
                                                      </span>
                                                    )}
                                                    {!isCurrentMatch && !isUsedByThis && (
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-700">
                                                        Available
                                                      </span>
                                                    )}
                                                  </span>
                                                </button>
                                              </Popover.Close>
                                            );
                                          })}
                                          {/* Add Another PO Option */}
                                          {onAddPO && (
                                            <div className="border-t border-gray-100 mt-1 pt-1">
                                              <Popover.Close asChild>
                                                <button
                                                  onClick={() => {
                                                    setReopenDropdownForLineId(line.id || `line-${line.line_no}`);
                                                    setShowAddPODrawer(true);
                                                  }}
                                                  className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-purple-50 text-purple-700"
                                                >
                                                  <Plus className="h-3 w-3 mr-2" />
                                                  <span>Add another PO...</span>
                                                </button>
                                              </Popover.Close>
                                            </div>
                                          )}
                                        </div>
                                      </Popover.Content>
                                    </Popover.Portal>
                                  </Popover.Root>
                                );
                              }

                              // View mode: static text
                              if (isUnmatched) {
                                return <span className="text-gray-400 text-xs">Unmatched</span>;
                              }

                              // View mode: static badge for matched lines
                              const badgeClasses = getPOBadgeClasses(matchedPoNumber);
                              const pillText = `${matchedPoNumber} · L${matchedPoLine.line_no}`;
                              return (
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badgeClasses.bg} ${badgeClasses.text}`}>
                                  {pillText}
                                </span>
                              );
                            })()}
                          </td>
                          )}
                          </>
                        );

                        return isEditMode ? (
                          <DraggableDroppableRow
                            key={line.id || line.line_no}
                            id={line.id || `line-${line.line_no}`}
                            className={`h-[48px] group ${getRowHighlightClass(line) || (hasAnyVariance(line, matchedPO) ? 'bg-red-50/30 hover:bg-red-50/40' : 'bg-white')}`}
                            isHovered={hoveredPosition === slot.position}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {rowContent}
                          </DraggableDroppableRow>
                        ) : (
                          <tr
                            key={line.id || line.line_no}
                            className={`h-[48px] group ${getRowHighlightClass(line)} ${
                              hoveredPosition === slot.position 
                                ? 'bg-purple-50' 
                                : hasAnyVariance(line, matchedPO)
                                  ? 'bg-red-50/30 hover:bg-red-50/40'
                                  : getRowHighlightClass(line) 
                                    ? '' 
                                    : 'bg-white hover:bg-purple-50'
                            }`}
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
                            className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add Line
                          </button>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr className="h-[42px] bg-gray-50">
                      <td colSpan={isEditMode ? 9 : 8} className="px-1 py-2 text-right text-sm font-semibold text-gray-950 bg-gray-50">
                        Invoice Total:
                      </td>
                      <td className="pl-1 pr-2 py-2 text-right text-sm font-bold text-gray-950 bg-gray-50">
                        {formatCurrency(invoiceLines.reduce((sum, line) => sum + line.line_total, 0))}
                      </td>
                      {/* Empty cell for Variance column when not using detailed variance */}
                      {!useDetailedVarianceColumns && showPO && <td className="bg-gray-50"></td>}
                      {/* Empty cell for Actions column in edit mode */}
                      {isEditMode && <td className="bg-gray-50"></td>}
                      {/* Empty cell to cover PO / Line column */}
                      {showAssignedPOColumn && <td className="bg-gray-50"></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* PO Lines */}
              <div className="flex-shrink-0">
                <table className="min-w-max">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th colSpan={7} className="px-4 bg-white border-b h-[36px]">
                        <div className="flex items-center gap-3 h-full">
                          <span className="text-sm font-semibold text-gray-950">
                            Purchase Order
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {getPOBadgeText()}
                          </span>

                          {/* PO dropdown - only for multi-PO */}
                          {isMultiPO && (
                            <Select.Root value={selectedPO} onValueChange={setSelectedPO}>
                              <Select.Trigger className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-950 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1 data-[state=open]:bg-gray-50">
                                {getSelectedPOLabel() || 'Select PO'}
                                <Select.Icon>
                                  <ChevronDown className="h-3 w-3 text-gray-500" />
                                </Select.Icon>
                              </Select.Trigger>
                              <Select.Portal>
                                <Select.Content
                                  className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200"
                                  style={{ zIndex: 99999 }}
                                  position="popper"
                                  sideOffset={5}
                                >
                                  <Select.Viewport className="p-1">
                                    {/* All POs option */}
                                    <Select.Item
                                      value="all"
                                      className="relative flex items-center px-2 py-1.5 text-xs rounded outline-none cursor-pointer hover:bg-gray-100 focus:bg-gray-100 data-[state=checked]:bg-purple-50 data-[state=checked]:text-purple-900"
                                    >
                                      <Select.ItemText>
                                        <span className="font-medium">All POs</span>
                                        {utilization && (
                                          <span className="ml-2 text-gray-600">
                                            {getTotalUtilization()}
                                          </span>
                                        )}
                                      </Select.ItemText>
                                    </Select.Item>

                                    {/* Individual PO options */}
                                    {allPONumbers.map((poNumber) => {
                                      const badgeClasses = getPOBadgeClasses(poNumber);
                                      return (
                                        <Select.Item
                                          key={poNumber}
                                          value={poNumber}
                                          className="relative flex items-center px-2 py-1.5 text-xs rounded outline-none cursor-pointer hover:bg-gray-100 focus:bg-gray-100 data-[state=checked]:bg-purple-50 data-[state=checked]:text-purple-900"
                                        >
                                          <Select.ItemText>
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badgeClasses.bg} ${badgeClasses.text}`}>
                                              {poNumber}
                                            </span>
                                            {utilization && utilization[poNumber] && (
                                              <span className="ml-2 text-gray-700">
                                                {getUtilizationSummary(poNumber)}
                                              </span>
                                            )}
                                          </Select.ItemText>
                                        </Select.Item>
                                      );
                                    })}
                                  </Select.Viewport>
                                </Select.Content>
                              </Select.Portal>
                            </Select.Root>
                          )}

                          {/* Inline utilization summary - only when specific PO is selected */}
                          {isMultiPO && utilization && selectedPO !== 'all' && (
                            <span className="text-xs text-gray-700 ml-2">
                              {getUtilizationSummary(selectedPO)}
                            </span>
                          )}

                          {/* Add PO Button */}
                          {onAddPO && (
                            <button
                              onClick={() => setShowAddPODrawer(true)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50 ml-auto"
                            >
                              <Plus className="h-3 w-3" />
                              Add PO
                            </button>
                          )}
                        </div>
                      </th>
                    </tr>
                    <tr className="h-[40px]">
                      <th className="pl-3 pr-1 text-right text-xs font-medium text-gray-800 uppercase w-6">#</th>
                      <th className="px-1 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                      <th className="px-1 text-left text-xs font-medium text-gray-800 uppercase w-16">SKU</th>
                      <th className="px-1 text-right text-xs font-medium text-gray-800 uppercase w-8">Qty</th>
                      <th className="px-1 text-center text-xs font-medium text-gray-800 uppercase w-10">UOM</th>
                      <th className="px-1 text-right text-xs font-medium text-gray-800 uppercase w-16">Price</th>
                      <th className="pl-1 pr-2 text-right text-xs font-medium text-gray-800 uppercase w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {getFilteredSlotsForPOTable(Array.isArray(displaySlots) ? displaySlots : slots).map((slot) => {
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
                            <td className="px-1.5 py-2 text-xs text-gray-400 italic text-center align-middle" colSpan={7}>
                              No PO line
                            </td>
                          </tr>
                        );
                      }

                      return (
                        <tr
                          key={matchedPO.id}
                          className={`h-[48px] ${getPORowHighlightClass(matchedPO)} ${
                            hoveredPosition === slot.position 
                              ? 'bg-purple-50' 
                              : invLine && hasAnyVariance(invLine, matchedPO)
                                ? 'bg-red-50/30 hover:bg-red-50/40'
                                : getPORowHighlightClass(matchedPO) 
                                  ? '' 
                                  : 'bg-white hover:bg-purple-50'
                          }`}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          <td className={`pl-3 pr-1 py-2 text-xs text-right text-gray-950 w-6 ${getPORowBorderClass(matchedPO)}`}>{matchedPO.line_no}</td>
                          <td className="px-1 py-2 text-xs text-gray-950">
                            <div className={`truncate max-w-[160px] ${
                              invLine && ((unmatchedLines.has(invLine.id || `line-${invLine.line_no}`) && hasDescriptionDifference(invLine, matchedPO)) || hasSuggestion(invLine))
                                ? 'font-bold text-red-600'
                                : ''
                            }`} title={matchedPO.description}>
                              {matchedPO.item_description || matchedPO.description}
                            </div>
                          </td>
                          <td className="px-1 py-2 text-xs text-gray-950 w-16">{matchedPO.sku || '-'}</td>
                          <td className="px-1 py-2 text-xs text-right text-gray-950 w-8">
                            <span className={
                              invLine && Math.abs(matchedPO.qty_ordered - invLine.qty) > 0.01 && !hasCustomRuleMatch(invLine, matchedPO) && !hasMatchedUomDifference(invLine, matchedPO)
                                ? 'font-bold text-red-600'
                                : ''
                            }>
                              {matchedPO.qty_ordered}
                            </span>
                          </td>
                          <td className="px-1 py-2 text-xs text-center text-gray-950 w-10">
                            <span className={
                              invLine && Math.abs(matchedPO.qty_ordered - invLine.qty) > 0.01 && !hasCustomRuleMatch(invLine, matchedPO) && !hasMatchedUomDifference(invLine, matchedPO) && invLine.uom.toLowerCase() !== matchedPO.uom.toLowerCase()
                                ? 'font-bold text-red-600'
                                : ''
                            }>
                              {matchedPO.uom}
                            </span>
                          </td>
                          <td className="px-1 py-2 text-xs text-right text-gray-950 w-16">
                            <span className={
                              invLine && Math.abs(matchedPO.unit_price - invLine.unit_price) > 0.01 && !hasCustomRuleMatch(invLine, matchedPO) && !hasMatchedUomDifference(invLine, matchedPO) && !invLine.suppress_price_variance
                                ? 'font-bold text-red-600'
                                : ''
                            }>
                              {formatCurrency(matchedPO.unit_price)}
                            </span>
                          </td>
                          <td className="pl-1 pr-2 py-2 text-xs text-right font-medium text-gray-950 w-20">
                            {formatCurrency(matchedPO.qty_ordered * matchedPO.unit_price)}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Empty spacer row in edit mode to match Invoice table's "Add Line" row */}
                    {isEditMode && (
                      <tr className="h-[40px]">
                        <td colSpan={7} className="px-1.5 py-2"></td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-gray-50 sticky bottom-0">
                    <tr className="h-[42px] bg-gray-50">
                      <td colSpan={6} className="px-1 py-2 text-right text-sm font-semibold text-gray-950 bg-gray-50">
                        PO Total:
                      </td>
                      <td className="pl-1 pr-2 py-2 text-right text-sm font-bold text-gray-950 bg-gray-50">
                        {formatCurrency(poLines.reduce((sum, line) => sum + (line.qty_ordered * line.unit_price), 0))}
                      </td>
                      {/* Empty cells for visual continuity with Invoice table columns */}
                      {!useDetailedVarianceColumns && (
                        <td className="px-1 py-2 bg-gray-50"></td>
                      )}
                      {isEditMode && (
                        <td className="px-1.5 py-2 bg-gray-50"></td>
                      )}
                    </tr>
                  </tfoot>
                </table>

                {/* Other PO Lines - Collapsible section grouped by PO (only for multi-PO invoices) */}
                {(() => {
                  const { poGroups, totalUnused, totalUsedByOther } = getOtherPOLines();
                  const totalOther = totalUnused + totalUsedByOther;

                  // Only show "Other PO Lines" section for multi-PO invoices
                  if (!isMultiPO || poGroups.length === 0) return null;

                  return (
                    <div className="mt-2 border-t border-gray-200 bg-gray-50">
                      {/* Collapsible Header */}
                      <button
                        onClick={() => setOtherPOLinesExpanded(!otherPOLinesExpanded)}
                        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronDown
                            className={`h-4 w-4 text-gray-500 transition-transform ${otherPOLinesExpanded ? 'rotate-0' : '-rotate-90'}`}
                          />
                          <span className="text-sm font-medium text-gray-950">Other PO Lines</span>
                          <span className="text-xs text-gray-600">
                            ({totalUnused} available{totalUsedByOther > 0 ? `, ${totalUsedByOther} used by other invoices` : ''})
                          </span>
                        </div>
                        <span className="text-xs text-purple-600 hover:text-purple-800 hover:underline">
                          {otherPOLinesExpanded ? 'Collapse' : 'Expand'}
                        </span>
                      </button>

                      {/* Expanded Content - Grouped by PO */}
                      {otherPOLinesExpanded && (
                        <div className="border-t border-gray-200 p-3 space-y-3">
                          {poGroups.map((poGroup) => {
                            const badgeClasses = getPOBadgeClasses(poGroup.poNumber);
                            return (
                              <div key={poGroup.poNumber} className="bg-white border border-gray-200 rounded-lg p-3">
                                {/* PO Header */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded font-medium text-xs ${badgeClasses.bg} ${badgeClasses.text}`}>
                                    {poGroup.poNumber}
                                  </span>
                                </div>

                                {/* Available for Assignment */}
                                {poGroup.unused.length > 0 && (
                                  <div className="mb-2">
                                    <div className="text-xs font-medium text-green-700 mb-1.5 flex items-center gap-1">
                                      <Package className="h-3 w-3" />
                                      Available for assignment ({poGroup.unused.length})
                                    </div>
                                    <div className="space-y-1 pl-1">
                                      {poGroup.unused.map((line) => (
                                        <div
                                          key={line.poLineId}
                                          className="flex items-center gap-2 px-2 py-1 bg-gray-50 border border-gray-100 rounded text-xs"
                                        >
                                          <span className="text-gray-950 w-5 text-center shrink-0">L{line.lineNo}</span>
                                          <span className="text-gray-950 truncate flex-1">{line.description}</span>
                                          <span className="text-gray-700 shrink-0">×{line.qty}</span>
                                          <span className="text-gray-950 shrink-0 w-16 text-right">{formatCurrency(line.price)}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Used by Other Invoices */}
                                {poGroup.usedByOther.length > 0 && (
                                  <div>
                                    <div className="text-xs font-medium text-gray-700 mb-1.5 flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      Used by other invoices ({poGroup.usedByOther.length})
                                    </div>
                                    <div className="space-y-1 pl-1">
                                      {poGroup.usedByOther.map((line) => (
                                        <div
                                          key={line.poLineId}
                                          className="flex items-center gap-2 px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs opacity-70"
                                        >
                                          <span className="text-gray-950 w-5 text-center shrink-0">L{line.lineNo}</span>
                                          <span className="text-gray-950 truncate flex-1">{line.description}</span>
                                          <span className="text-gray-700 italic shrink-0">Used by {line.usedByInvoice}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

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

                        // If no invoice line at this position, show empty row for visual continuity
                        // This ensures alignment with PO table rows
                        if (!line) {
                          // Only skip if there's no PO line either (nothing to show)
                          if (!matchedPO) {
                            return null;
                          }
                          // Show empty row for PO-only positions to maintain alignment
                          return (
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
                          );
                        }

                        return (
                          <tr
                            key={line.id || line.line_no}
                            className={`h-[48px] ${hoveredPosition === slot.position ? 'bg-purple-50' : 'bg-white hover:bg-purple-50'}`}
                            onMouseEnter={() => handleRowHover(slot.position)}
                            onMouseLeave={handleRowLeave}
                          >
                            {/* Qty Variance Column */}
                            <td className={`px-1.5 py-2 text-xs text-right ${hasAnyVariance(line, matchedPO) ? 'bg-red-50/30' : ''}`}>
                              {matchedPO ? (
                                // Show 0 variance if custom rule matches OR UOM conversion reconciles the difference
                                (hasCustomRuleMatch(line, matchedPO) || hasMatchedUomDifference(line, matchedPO)) ? (
                                  <span className="text-green-600 font-bold">0</span>
                                ) : Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ? (
                                  <span className="text-red-600 font-semibold">
                                    {line.qty > matchedPO.qty_ordered ? '+' : ''}{(line.qty - matchedPO.qty_ordered).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-green-600 font-bold">0</span>
                                )
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>

                            {/* Price Variance Column */}
                            <td className={`px-1.5 py-2 text-xs text-right ${hasAnyVariance(line, matchedPO) ? 'bg-red-50/30' : ''}`}>
                              {matchedPO ? (
                                // Show 0 variance if custom rule matches OR UOM conversion reconciles the difference OR price variance suppressed
                                (hasCustomRuleMatch(line, matchedPO) || hasMatchedUomDifference(line, matchedPO) || line.suppress_price_variance) ? (
                                  <span className="text-green-600 font-bold">{formatCurrency(0)}</span>
                                ) : Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 ? (
                                  <span className="text-red-600 font-semibold">
                                    {line.unit_price > matchedPO.unit_price ? '+' : ''}{formatCurrency(line.unit_price - matchedPO.unit_price)}
                                  </span>
                                ) : (
                                  <span className="text-green-600 font-bold">{formatCurrency(0)}</span>
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
                      <tr className="h-[42px] bg-gray-50">
                        {/* Empty footer cells for visual continuity */}
                        <td colSpan={2} className="px-1.5 py-2 bg-gray-50"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
            </>
          ) : (
            // Full width layout when no PO lines (needs info mode)
            <div className="h-full w-full">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th colSpan={poLines.length > 0 ? (isEditMode ? 12 : 11) : (isEditMode ? 11 : 10)} className="px-4 bg-white border-b h-[36px]">
                      <div className="flex items-center justify-between h-full">
                        {/* Left side: Invoice title and Compare to toggles */}
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-gray-950">Invoice</span>
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {invoiceLines.length} {invoiceLines.length === 1 ? 'line' : 'lines'}
                          </span>
                          {/* Hide PO toggle for non-PO invoices */}
                          {!isNonPO && (
                            <>
                              <div className="h-5 w-px bg-gray-300"></div>
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
                            </>
                          )}

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
                          <div className="flex items-center gap-2">
                            {isEditMode && (
                              <button
                                onClick={toggleEditMode}
                                className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              onClick={toggleEditMode}
                              className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                isEditMode
                                  ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                                  : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                              }`}
                            >
                              {isEditMode ? 'Save' : 'Edit'}
                            </button>
                          </div>
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
                    {poLines.length > 0 && showPO && (
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
                            <td className="hidden px-2 py-2 text-center cursor-grab active:cursor-grabbing" {...listeners}>
                              <GripVertical className="h-4 w-4 text-gray-400" />
                            </td>
                          )}
                          <td className="pl-4 pr-1.5 py-2 text-xs text-right text-gray-950">
                            {line.line_no}
                          </td>
                          {/* Icon column for smart match indicators */}
                          <td className="px-1 py-2 text-center relative group">
                            {hasSuggestion(line) ? (
                              // PRIORITY 1: Show gradient Sparkles for AI substitution suggestions
                              <Tooltip.Provider>
                                <Tooltip.Root delayDuration={200} open={openSuggestionId === (line.id || `line-${line.line_no}`) ? false : undefined}>
                                  <SubstitutionSuggestionPopover
                                    invoiceDescription={line.description}
                                    poDescription={line.suggested_po_match!.po_description}
                                    invoiceSku={line.sku}
                                    poSku={line.suggested_po_match!.po_line_id}
                                    differences={line.suggested_po_match!.differences || []}
                                    confidence={line.suggested_po_match!.confidence || 0}
                                    reason={line.suggested_po_match!.reason || ''}
                                    onAccept={() => {
                                      console.log('Accept substitution');
                                    }}
                                    onReject={() => {
                                      console.log('Reject substitution');
                                    }}
                                    open={openSuggestionId === (line.id || `line-${line.line_no}`)}
                                    onOpenChange={(open) => setOpenSuggestionId(open ? (line.id || `line-${line.line_no}`) : null)}
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
                            ) : matchedPO && (hasUomConversion(line) || hasMatchedDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
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
                                      confidence={(line as any).smart_match_confidence}
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
                                </Tooltip.Root>
                              </Tooltip.Provider>
                            ) : null}
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
                              {isNonPO ? 'Not Approved' : 'Not Matched'}
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
                            <div className={`truncate max-w-[400px] ${
                              (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                                ? 'font-bold text-red-600'
                                : ''
                            }`} title={line.description}>
                              {line.description}
                            </div>
                          )}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-gray-950">
                          {getSKU(line)}
                        </td>
                        <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.qty}
                              onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                              className={`w-14 px-2 py-1 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                  ? ''
                                  : 'border border-gray-300'
                              }`}
                            />
                          ) : (() => {
                            const qtyCorrection = getQuantityCorrection(line.line_no);
                            if (qtyCorrection) {
                              return (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-gray-400 line-through text-xs">
                                    {qtyCorrection.original_value}
                                  </span>
                                  <span className="text-gray-950 font-medium">
                                    {qtyCorrection.corrected_value}
                                  </span>
                                  <Tooltip.Provider>
                                    <Tooltip.Root delayDuration={200}>
                                      <Tooltip.Trigger asChild>
                                        <Zap className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                                      </Tooltip.Trigger>
                                      <Tooltip.Portal>
                                        <Tooltip.Content
                                          side="top"
                                          className="z-50 max-w-xs rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg"
                                          sideOffset={5}
                                        >
                                          <div className="space-y-1">
                                            <div className="font-semibold">{qtyCorrection.agent_name}</div>
                                            <div>{qtyCorrection.reason}</div>
                                          </div>
                                          <Tooltip.Arrow className="fill-gray-900" />
                                        </Tooltip.Content>
                                      </Tooltip.Portal>
                                    </Tooltip.Root>
                                  </Tooltip.Provider>
                                </div>
                              );
                            }
                            const hasVariance = matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO);
                            return <span className={hasVariance ? 'font-bold text-red-600' : ''}>{line.qty}</span>;
                          })()}
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
                        <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                          {isEditMode ? (
                            <input
                              type="number"
                              value={line.unit_price}
                              onChange={(e) => handleLineChange(lineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                              step="0.01"
                              className={`w-16 px-1 py-1 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                  ? ''
                                  : 'border border-gray-300'
                              }`}
                            />
                          ) : (
                            <span className={
                              matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO) && !line.suppress_price_variance
                                ? 'font-bold text-red-600'
                                : ''
                            }>
                              {formatCurrency(line.unit_price)}
                            </span>
                          )}
                        </td>
                        <td className="pl-1.5 pr-4 py-2 text-xs text-right font-medium text-gray-950">
                          {formatCurrency(line.line_total)}
                        </td>
                        {poLines.length > 0 && showPO && (
                          <td className="px-1.5 py-2 text-xs">
                            {matchedPO && (
                              <div className="flex flex-col items-center gap-0.5">
                                {/* Show 0 variance when custom rule matches OR UOM conversion reconciles */}
                                {(hasCustomRuleMatch(line, matchedPO) || hasMatchedUomDifference(line, matchedPO)) ? (
                                  <span className="text-green-600 font-bold text-xs">0 / {formatCurrency(0)}</span>
                                ) : (
                                  <>
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
                                      <span className="text-green-600 font-bold text-xs">0 / {formatCurrency(0)}</span>
                                    )}
                                  </>
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
                          className={`group ${hasAnyVariance(line, matchedPO) ? 'bg-red-50/30 hover:bg-red-50/40' : 'bg-white'}`}
                          isHovered={hoveredPosition === slot.position}
                          onMouseEnter={() => handleRowHover(slot.position)}
                          onMouseLeave={handleRowLeave}
                        >
                          {rowContent}
                        </DraggableDroppableRow>
                      ) : (
                        <tr
                          key={line.id || line.line_no}
                          className={`group ${
                            hoveredPosition === slot.position 
                              ? 'bg-purple-50' 
                              : hasAnyVariance(line, matchedPO)
                                ? 'bg-red-50/30 hover:bg-red-50/40'
                                : 'bg-white hover:bg-purple-50'
                          }`}
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
                  <tr className="h-[42px] bg-gray-50">
                    <td colSpan={isEditMode ? 9 : 8} className="px-1.5 py-2 text-right text-sm font-semibold text-gray-950 bg-gray-50">
                      Invoice Total:
                    </td>
                    <td className="pl-1.5 pr-4 py-2 text-right text-sm font-bold text-gray-950 bg-gray-50">
                      {formatCurrency(editableLines.reduce((sum, line) => sum + line.line_total, 0))}
                    </td>
                    {/* Empty cell for Variance column when shown */}
                    {poLines.length > 0 && showPO && <td className="bg-gray-50"></td>}
                    {/* Empty cell for actions placeholder column */}
                    <td className="bg-gray-50"></td>
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
                <div className="flex-shrink-0 flex-grow border-r border-gray-200">
                  <table className="w-full min-w-max">
                    {/* Same header as default view */}
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th colSpan={useDetailedVarianceColumns ? 10 : (showPO ? 11 : 10)} className="px-4 bg-white border-b h-[36px]">
                          <div className="flex items-center justify-between h-full">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-semibold text-gray-950">Invoice</span>
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {invoiceLines.length} {invoiceLines.length === 1 ? 'line' : 'lines'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {isEditMode && (
                                <button
                                  onClick={cancelEditMode}
                                  className="px-2 py-1 text-xs font-medium rounded border transition-colors bg-white text-purple-900 border-purple-900 hover:bg-gray-50"
                                >
                                  Cancel
                                </button>
                              )}
                              <button
                                onClick={toggleEditMode}
                                className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                                  isEditMode
                                    ? 'bg-purple-900 text-white border-purple-900 hover:bg-purple-800 hover:border-purple-800'
                                    : 'bg-white text-purple-900 border-purple-900 hover:bg-gray-50'
                                }`}
                              >
                                {isEditMode ? (Object.keys(stagedReassignments).length > 0 ? `Save (${Object.keys(stagedReassignments).length})` : 'Save') : 'Edit'}
                              </button>
                            </div>
                          </div>
                        </th>
                      </tr>
                      <tr className="h-[40px]">
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">#</th>
                        <th className="w-8"></th>
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Status</th>
                        {isMultiPO && (
                          <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">PO</th>
                        )}
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">Description</th>
                        <th className="px-1.5 text-left text-xs font-medium text-gray-800 uppercase">SKU</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Qty</th>
                        <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">UOM</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Price</th>
                        <th className="px-1.5 text-right text-xs font-medium text-gray-800 uppercase">Total</th>
                        {!useDetailedVarianceColumns && showPO && (
                          <th className="px-1.5 text-center text-xs font-medium text-gray-800 uppercase">Variance</th>
                        )}
                        {showAssignedPOColumn && (
                          <th className="px-1.5 pl-3 text-left text-xs font-medium text-gray-800 uppercase whitespace-nowrap">Assigned PO Line</th>
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
                          <tr key={`variance-${line.id || line.line_no}`} className={`h-[48px] transition-colors group ${getRowHighlightClass(line)} ${
                            hasAnyVariance(line, matchedPO) ? 'bg-red-50/30 hover:bg-red-50/40' : 'bg-white hover:bg-purple-50'
                          }`}>
                            <td className="px-1.5 py-2 text-xs text-gray-950 font-medium">{line.line_no}</td>
                            {/* Icon column for smart match indicators */}
                            <td className="px-1 py-2 text-center relative">
                              {hasSuggestion(line) ? (
                                // PRIORITY 1: Show gradient Sparkles for AI substitution suggestions
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openSuggestionId === (line.id || `line-${line.line_no}`) ? false : undefined}>
                                    <SubstitutionSuggestionPopover
                                      invoiceDescription={line.description}
                                      poDescription={line.suggested_po_match!.po_description}
                                      invoiceSku={line.sku}
                                      poSku={line.suggested_po_match!.po_line_id}
                                      differences={line.suggested_po_match!.differences || []}
                                      confidence={line.suggested_po_match!.confidence || 0}
                                      reason={line.suggested_po_match!.reason || ''}
                                      onAccept={() => console.log('Accept substitution')}
                                      onReject={() => console.log('Reject substitution')}
                                      open={openSuggestionId === (line.id || `line-${line.line_no}`)}
                                      onOpenChange={(open) => setOpenSuggestionId(open ? (line.id || `line-${line.line_no}`) : null)}
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
                              ) : matchedPO && (hasUomConversion(line) || hasMatchedDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
                                // PRIORITY 2: Show purple Zap for smart matches
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openPopoverId === `invoice-grouped-${line.id || `line-${line.line_no}`}` ? false : undefined}>
                                    {hasCustomRule(line) ? (
                                      <CustomRulePopover
                                        rule={getCustomRule(line)!}
                                        invoiceQty={line.qty}
                                        invoiceUom={line.uom}
                                        poQty={matchedPO.qty_ordered}
                                        poUom={matchedPO.uom}
                                        lineTotal={line.line_total}
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
                                        confidence={(line as any).smart_match_confidence}
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
                                      <Tooltip.Content style={{zIndex: 9999}} className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md max-w-[280px]" sideOffset={5}>
                                        <div className="space-y-1">
                                          <p className="font-semibold">Smart Match Applied</p>
                                          <p>Click to review or unmatch</p>
                                        </div>
                                        <Tooltip.Arrow className="fill-gray-900" />
                                      </Tooltip.Content>
                                    </Tooltip.Portal>
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              ) : null}
                            </td>
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
                                  {isNonPO ? 'Not Approved' : 'Not Matched'}
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
                                <span className={
                                  (matchedPO && unmatchedLines.has(line.id || `line-${line.line_no}`) && hasDescriptionDifference(line, matchedPO)) || hasSuggestion(line)
                                    ? 'font-bold text-red-600'
                                    : ''
                                }>
                                  {line.description}
                                </span>
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-gray-950">
                              {getSKU(line)}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-right text-gray-950">
                              {isEditMode ? (
                                <input
                                  type="number"
                                  value={line.qty}
                                  onChange={(e) => handleLineChange(lineIndex, 'qty', parseFloat(e.target.value) || 0)}
                                  className={`w-14 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                    matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                      ? ''
                                      : 'border border-gray-300'
                                  }`}
                                />
                              ) : (
                                <span className={
                                  matchedPO && Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                    ? 'font-bold text-red-600'
                                    : ''
                                }>
                                  {line.qty}
                                </span>
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
                                  className={`w-20 px-1 py-0.5 text-xs text-right rounded focus:outline-none focus:border-purple-500 ${
                                    matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO)
                                      ? ''
                                      : 'border border-gray-300'
                                  }`}
                                />
                              ) : (
                                <span className={
                                  matchedPO && Math.abs(line.unit_price - matchedPO.unit_price) > 0.01 && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) && !hasCustomRuleMatch(line, matchedPO) && !hasMatchedUomDifference(line, matchedPO) && !line.suppress_price_variance
                                    ? 'font-bold text-red-600'
                                    : ''
                                }>
                                  {formatCurrency(line.unit_price)}
                                </span>
                              )}
                            </td>
                            <td className="px-1.5 py-2 text-xs text-right font-medium text-gray-950">
                              {formatCurrency(line.line_total)}
                            </td>
                            {!useDetailedVarianceColumns && showPO && (
                              <td className="px-1.5 py-2 text-xs text-center">
                                {matchedPO && !manuallyMatchedLines.has(line.id || `line-${line.line_no}`) ? (
                                  <>
                                    {/* Show dash when custom rule matches OR UOM conversion reconciles - no variance */}
                                    {(hasCustomRuleMatch(line, matchedPO) || hasMatchedUomDifference(line, matchedPO)) ? (
                                      <span className="text-gray-400">—</span>
                                    ) : (Math.abs(line.qty - matchedPO.qty_ordered) > 0.01 ||
                                     Math.abs(line.unit_price - matchedPO.unit_price) > 0.01) ? (
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
                            {/* PO / Line column - conditionally visible */}
                            {showAssignedPOColumn && (
                            <td className="px-1.5 pl-3 py-2 text-xs text-left">
                              {(() => {
                                const matchedPoNumber = getMatchedPONumber(line);
                                const matchedPoLine = getMatchedPOLine(line, lineIndex);

                                // If no match, show "Unmatched"
                                if (!matchedPoNumber || !matchedPoLine) {
                                  return <span className="text-gray-400 text-xs">Unmatched</span>;
                                }

                                const badgeClasses = getPOBadgeClasses(matchedPoNumber);
                                const pillText = `${matchedPoNumber} · L${matchedPoLine.line_no}`;

                                // In edit mode: show clickable dropdown
                                if (isEditMode && poDataList && poDataList.length > 0) {
                                  const availableLines = buildAvailablePOLines(line);
                                  const filteredLines = availableLines.filter(l =>
                                    l.description.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                    l.poNumber.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                    `L${l.lineNo}`.toLowerCase().includes(poLineSearchQuery.toLowerCase())
                                  );

                                  return (
                                    <Popover.Root
                                      onOpenChange={(open) => {
                                        if (!open) setPoLineSearchQuery('');
                                      }}
                                    >
                                      <Popover.Trigger className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${badgeClasses.bg} ${badgeClasses.text}`}>
                                        {pillText}
                                        <ChevronDown className="h-3 w-3" />
                                      </Popover.Trigger>
                                      <Popover.Portal>
                                        <Popover.Content
                                          className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 w-[480px]"
                                          style={{ zIndex: 99999 }}
                                          sideOffset={5}
                                          align="start"
                                        >
                                          {/* Sticky search field */}
                                          <div className="sticky top-0 bg-white border-b border-gray-100 p-2 z-10">
                                            <input
                                              type="text"
                                              placeholder="Search lines..."
                                              value={poLineSearchQuery}
                                              onChange={(e) => setPoLineSearchQuery(e.target.value)}
                                              autoFocus
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                          </div>
                                          <div className="p-1 max-h-[280px] overflow-y-auto">
                                            {/* Clear Assignment Option */}
                                            <Popover.Close asChild>
                                              <button
                                                onClick={() => handleClearAssignment(line)}
                                                className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-red-50 text-gray-600 border-b border-gray-100 mb-1"
                                              >
                                                <X className="h-3 w-3 mr-2 text-gray-400" />
                                                <span>No PO line / Clear assignment</span>
                                              </button>
                                            </Popover.Close>
                                            {filteredLines.map((poLine) => {
                                              const lineBadgeClasses = getPOBadgeClasses(poLine.poNumber);
                                              const isCurrentMatch = poLine.poLineId === matchedPoLine.id;
                                              const isUsedByOther = poLine.usage.state === 'usedByOtherInvoice';
                                              const isUsedByThis = poLine.usage.state === 'usedByThisInvoice' && !isCurrentMatch;
                                              const invoiceNumber = isUsedByOther && poLine.usage.state === 'usedByOtherInvoice'
                                                ? poLine.usage.invoiceNumber || 'other'
                                                : undefined;

                                              // Disabled row for lines used by other invoices
                                              if (isUsedByOther) {
                                                return (
                                                  <div
                                                    key={poLine.poLineId}
                                                    className="w-full flex items-center px-2 py-1.5 text-xs rounded bg-amber-50/50 cursor-not-allowed"
                                                  >
                                                    {/* PO Badge - fixed width */}
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                      {poLine.poNumber}
                                                    </span>
                                                    {/* Line number - fixed width */}
                                                    <span className="text-gray-600 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                    {/* Description - flex grows */}
                                                    <span className="text-gray-600 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                    {/* Qty - fixed width */}
                                                    <span className="text-gray-500 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                    {/* Price - fixed width */}
                                                    <span className="text-gray-600 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                    {/* Status chip - fixed width */}
                                                    <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 truncate max-w-full" title={`Used by ${invoiceNumber}`}>
                                                        {invoiceNumber}
                                                      </span>
                                                    </span>
                                                  </div>
                                                );
                                              }

                                              // Selectable row
                                              return (
                                                <Popover.Close asChild key={poLine.poLineId}>
                                                  <button
                                                    onClick={() => {
                                                      handleReassignLine(line, poLine.poLineId, poLine.poNumber);
                                                      setPoLineSearchQuery('');
                                                    }}
                                                    className={`w-full flex items-center px-2 py-1.5 text-xs rounded outline-none cursor-pointer hover:bg-gray-100 focus:bg-gray-100 ${
                                                      isCurrentMatch ? 'bg-purple-50 border-l-2 border-purple-500' :
                                                      isUsedByThis ? 'bg-blue-50/50' : ''
                                                    }`}
                                                  >
                                                    {/* PO Badge - fixed width */}
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                      {poLine.poNumber}
                                                    </span>
                                                    {/* Line number - fixed width */}
                                                    <span className="text-gray-900 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                    {/* Description - flex grows */}
                                                    <span className="text-gray-900 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                    {/* Qty - fixed width */}
                                                    <span className="text-gray-700 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                    {/* Price - fixed width */}
                                                    <span className="text-gray-950 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                    {/* Status chip - fixed width */}
                                                    <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                      {isCurrentMatch && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                                                          <Check className="h-2.5 w-2.5" />
                                                          Selected
                                                        </span>
                                                      )}
                                                      {isUsedByThis && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
                                                          In use
                                                        </span>
                                                      )}
                                                      {!isCurrentMatch && !isUsedByThis && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-700">
                                                          Available
                                                        </span>
                                                      )}
                                                    </span>
                                                  </button>
                                                </Popover.Close>
                                              );
                                            })}
                                            {/* Add Another PO Option */}
                                            {onAddPO && (
                                              <div className="border-t border-gray-100 mt-1 pt-1">
                                                <Popover.Close asChild>
                                                  <button
                                                    onClick={() => {
                                                      setReopenDropdownForLineId(line.id || `line-${line.line_no}`);
                                                      setShowAddPODrawer(true);
                                                    }}
                                                    className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-purple-50 text-purple-700"
                                                  >
                                                    <Plus className="h-3 w-3 mr-2" />
                                                    <span>Add another PO...</span>
                                                  </button>
                                                </Popover.Close>
                                              </div>
                                            )}
                                          </div>
                                        </Popover.Content>
                                      </Popover.Portal>
                                    </Popover.Root>
                                  );
                                }

                                // View mode: static badge
                                return (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badgeClasses.bg} ${badgeClasses.text}`}>
                                    {pillText}
                                  </span>
                                );
                              })()}
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
                        colSpan={useDetailedVarianceColumns ? 10 : (showPO ? 11 : 10)}
                      />

                      {/* Render matched lines if expanded - Similar structure to variance lines but without drag handles */}
                      {matchedItemsExpanded && (displaySlots as {varianceSlots: typeof slots, matchedSlots: typeof slots}).matchedSlots.map((slot) => {
                        const line = slot.invoiceLine;
                        if (!line) return null;

                        const lineIndex = editableLines.findIndex(l => l.line_no === line.line_no);
                        const matchedPO = slot.poLine;
                        const status = getLineStatus(line, matchedPO);

                        return (
                          <tr key={`matched-${line.id || line.line_no}`} className={`h-[48px] transition-colors group ${getRowHighlightClass(line)} ${
                            hasAnyVariance(line, matchedPO) ? 'bg-red-50/30 hover:bg-red-50/40' : 'bg-white hover:bg-purple-50'
                          }`}>
                            {/* Same cell structure as variance lines */}
                            <td className="px-1.5 py-2 text-xs text-gray-950 font-medium">{line.line_no}</td>
                            {/* Icon column - same 3-priority logic as variance section */}
                            <td className="px-1 py-2 text-center relative">
                              {hasSuggestion(line) ? (
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200} open={openSuggestionId === (line.id || `line-${line.line_no}`) ? false : undefined}>
                                    <SubstitutionSuggestionPopover
                                      invoiceDescription={line.description}
                                      poDescription={line.suggested_po_match!.po_description}
                                      invoiceSku={line.sku}
                                      poSku={line.suggested_po_match!.po_line_id}
                                      differences={line.suggested_po_match!.differences || []}
                                      confidence={line.suggested_po_match!.confidence || 0}
                                      reason={line.suggested_po_match!.reason || ''}
                                      onAccept={() => console.log('Accept substitution')}
                                      onReject={() => console.log('Reject substitution')}
                                      open={openSuggestionId === (line.id || `line-${line.line_no}`)}
                                      onOpenChange={(open) => setOpenSuggestionId(open ? (line.id || `line-${line.line_no}`) : null)}
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
                              ) : matchedPO && (hasUomConversion(line) || hasMatchedDescriptionDifference(line, matchedPO) || hasCustomRule(line)) && !unmatchedLines.has(line.id || `line-${line.line_no}`) ? (
                                <Tooltip.Provider>
                                  <Tooltip.Root delayDuration={200}>
                                    {hasCustomRule(line) ? (
                                      <CustomRulePopover rule={getCustomRule(line)!} invoiceQty={line.qty} invoiceUom={line.uom} poQty={matchedPO.qty_ordered} poUom={matchedPO.uom} lineTotal={line.line_total} onRemove={() => handleRemoveRule(line.id || `line-${line.line_no}`)} open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`} onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}>
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </CustomRulePopover>
                                    ) : hasUomConversion(line) && hasUomDifference(line, matchedPO) ? (
                                      <UomMatchPopover invoiceQty={line.uom_conversion!.invoice_qty} invoiceUom={line.uom_conversion!.invoice_uom} invoiceUnitPrice={line.unit_price} poQty={line.uom_conversion!.po_qty} poUom={line.uom_conversion!.po_uom} poUnitPrice={matchedPO.unit_price} conversionFactor={line.uom_conversion!.conversion_factor} conversionExplanation={line.uom_conversion!.explanation} lineTotal={line.line_total} onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)} open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`} onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}>
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </UomMatchPopover>
                                    ) : (
                                      <SmartMatchPopover invoiceDescription={line.description} poDescription={matchedPO.item_description || matchedPO.description} invoiceLine={line} poLine={matchedPO} confidence={(line as any).smart_match_confidence} onUnmatch={() => handleUnmatch(line.id || `line-${line.line_no}`)} open={openPopoverId === `invoice-grouped-matched-${line.id || `line-${line.line_no}`}`} onOpenChange={(open) => setOpenPopoverId(open ? `invoice-grouped-matched-${line.id || `line-${line.line_no}`}` : null)}>
                                        <Tooltip.Trigger asChild>
                                          <span className="inline-flex items-center justify-center cursor-pointer flex-shrink-0">
                                            <Zap className="h-3.5 w-3.5 text-purple-600" />
                                          </span>
                                        </Tooltip.Trigger>
                                      </SmartMatchPopover>
                                    )}
                                  </Tooltip.Root>
                                </Tooltip.Provider>
                              ) : null}
                            </td>
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
                                <span>{line.description}</span>
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
                            {!useDetailedVarianceColumns && showPO && (
                              <td className="px-1.5 py-2 text-xs text-center">
                                <span className="text-gray-400">—</span>
                              </td>
                            )}
                            {/* PO / Line column - conditionally visible */}
                            {showAssignedPOColumn && (
                            <td className="px-1.5 pl-3 py-2 text-xs text-left">
                              {(() => {
                                const matchedPoNumber = getMatchedPONumber(line);
                                const matchedPoLine = getMatchedPOLine(line, lineIndex);

                                // If no match, show "Unmatched"
                                if (!matchedPoNumber || !matchedPoLine) {
                                  return <span className="text-gray-400 text-xs">Unmatched</span>;
                                }

                                const badgeClasses = getPOBadgeClasses(matchedPoNumber);
                                const pillText = `${matchedPoNumber} · L${matchedPoLine.line_no}`;

                                // In edit mode: show clickable dropdown
                                if (isEditMode && poDataList && poDataList.length > 0) {
                                  const availableLines = buildAvailablePOLines(line);
                                  const filteredLines = availableLines.filter(l =>
                                    l.description.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                    l.poNumber.toLowerCase().includes(poLineSearchQuery.toLowerCase()) ||
                                    `L${l.lineNo}`.toLowerCase().includes(poLineSearchQuery.toLowerCase())
                                  );

                                  return (
                                    <Popover.Root
                                      onOpenChange={(open) => {
                                        if (!open) setPoLineSearchQuery('');
                                      }}
                                    >
                                      <Popover.Trigger className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${badgeClasses.bg} ${badgeClasses.text}`}>
                                        {pillText}
                                        <ChevronDown className="h-3 w-3" />
                                      </Popover.Trigger>
                                      <Popover.Portal>
                                        <Popover.Content
                                          className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 w-[480px]"
                                          style={{ zIndex: 99999 }}
                                          sideOffset={5}
                                          align="start"
                                        >
                                          {/* Sticky search field */}
                                          <div className="sticky top-0 bg-white border-b border-gray-100 p-2 z-10">
                                            <input
                                              type="text"
                                              placeholder="Search lines..."
                                              value={poLineSearchQuery}
                                              onChange={(e) => setPoLineSearchQuery(e.target.value)}
                                              autoFocus
                                              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                                            />
                                          </div>
                                          <div className="p-1 max-h-[280px] overflow-y-auto">
                                            {/* Clear Assignment Option */}
                                            <Popover.Close asChild>
                                              <button
                                                onClick={() => handleClearAssignment(line)}
                                                className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-red-50 text-gray-600 border-b border-gray-100 mb-1"
                                              >
                                                <X className="h-3 w-3 mr-2 text-gray-400" />
                                                <span>No PO line / Clear assignment</span>
                                              </button>
                                            </Popover.Close>
                                            {filteredLines.map((poLine) => {
                                              const lineBadgeClasses = getPOBadgeClasses(poLine.poNumber);
                                              const isCurrentMatch = poLine.poLineId === matchedPoLine.id;
                                              const isUsedByOther = poLine.usage.state === 'usedByOtherInvoice';
                                              const isUsedByThis = poLine.usage.state === 'usedByThisInvoice' && !isCurrentMatch;
                                              const invoiceNumber = isUsedByOther && poLine.usage.state === 'usedByOtherInvoice'
                                                ? poLine.usage.invoiceNumber || 'other'
                                                : undefined;

                                              // Disabled row for lines used by other invoices
                                              if (isUsedByOther) {
                                                return (
                                                  <div
                                                    key={poLine.poLineId}
                                                    className="w-full flex items-center px-2 py-1.5 text-xs rounded bg-amber-50/50 cursor-not-allowed"
                                                  >
                                                    {/* PO Badge - fixed width */}
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                      {poLine.poNumber}
                                                    </span>
                                                    {/* Line number - fixed width */}
                                                    <span className="text-gray-600 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                    {/* Description - flex grows */}
                                                    <span className="text-gray-600 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                    {/* Qty - fixed width */}
                                                    <span className="text-gray-500 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                    {/* Price - fixed width */}
                                                    <span className="text-gray-600 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                    {/* Status chip - fixed width */}
                                                    <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 truncate max-w-full" title={`Used by ${invoiceNumber}`}>
                                                        {invoiceNumber}
                                                      </span>
                                                    </span>
                                                  </div>
                                                );
                                              }

                                              // Selectable row
                                              return (
                                                <Popover.Close asChild key={poLine.poLineId}>
                                                  <button
                                                    onClick={() => {
                                                      handleReassignLine(line, poLine.poLineId, poLine.poNumber);
                                                      setPoLineSearchQuery('');
                                                    }}
                                                    className={`w-full flex items-center px-2 py-1.5 text-xs rounded outline-none cursor-pointer hover:bg-gray-100 focus:bg-gray-100 ${
                                                      isCurrentMatch ? 'bg-purple-50 border-l-2 border-purple-500' :
                                                      isUsedByThis ? 'bg-blue-50/50' : ''
                                                    }`}
                                                  >
                                                    {/* PO Badge - fixed width */}
                                                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium w-24 shrink-0 justify-center ${lineBadgeClasses.bg} ${lineBadgeClasses.text}`}>
                                                      {poLine.poNumber}
                                                    </span>
                                                    {/* Line number - fixed width */}
                                                    <span className="text-gray-900 w-6 text-center shrink-0 ml-1">L{poLine.lineNo}</span>
                                                    {/* Description - flex grows */}
                                                    <span className="text-gray-900 truncate flex-1 mx-2 text-left">{poLine.description}</span>
                                                    {/* Qty - fixed width */}
                                                    <span className="text-gray-700 w-10 text-right shrink-0">×{poLine.qty}</span>
                                                    {/* Price - fixed width */}
                                                    <span className="text-gray-950 w-16 text-right shrink-0 ml-1">{formatCurrency(poLine.price)}</span>
                                                    {/* Status chip - fixed width */}
                                                    <span className="w-20 shrink-0 ml-2 flex justify-end">
                                                      {isCurrentMatch && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-700">
                                                          <Check className="h-2.5 w-2.5" />
                                                          Selected
                                                        </span>
                                                      )}
                                                      {isUsedByThis && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-700">
                                                          In use
                                                        </span>
                                                      )}
                                                      {!isCurrentMatch && !isUsedByThis && (
                                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-50 text-green-700">
                                                          Available
                                                        </span>
                                                      )}
                                                    </span>
                                                  </button>
                                                </Popover.Close>
                                              );
                                            })}
                                            {/* Add Another PO Option */}
                                            {onAddPO && (
                                              <div className="border-t border-gray-100 mt-1 pt-1">
                                                <Popover.Close asChild>
                                                  <button
                                                    onClick={() => {
                                                      setReopenDropdownForLineId(line.id || `line-${line.line_no}`);
                                                      setShowAddPODrawer(true);
                                                    }}
                                                    className="w-full flex items-center px-2 py-1.5 text-xs rounded hover:bg-purple-50 text-purple-700"
                                                  >
                                                    <Plus className="h-3 w-3 mr-2" />
                                                    <span>Add another PO...</span>
                                                  </button>
                                                </Popover.Close>
                                              </div>
                                            )}
                                          </div>
                                        </Popover.Content>
                                      </Popover.Portal>
                                    </Popover.Root>
                                  );
                                }

                                // View mode: static badge
                                return (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${badgeClasses.bg} ${badgeClasses.text}`}>
                                    {pillText}
                                  </span>
                                );
                              })()}
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

        {/* Add PO Drawer */}
        {onAddPO && (
          <AddPODrawer
            isOpen={showAddPODrawer}
            onClose={() => {
              setShowAddPODrawer(false);
              setReopenDropdownForLineId(null);
            }}
            onAddPO={handleAddPO}
            invoiceVendor={invoiceVendor}
            invoiceCurrency={currency}
            currentPONumbers={allPONumbers}
            invoiceId={invoiceId || ''}
          />
        )}
      </div>
    </div>
  );
}