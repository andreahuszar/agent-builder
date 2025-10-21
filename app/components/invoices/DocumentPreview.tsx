'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Download, FileText, ChevronLeft } from 'lucide-react';
import { FakeInvoiceDocument } from './FakeInvoiceDocument';
import { PDFViewer } from './PDFViewer';
import { ResizablePanel } from './ResizablePanel';
import { LineItemsPreviewPanel } from './preview/LineItemsPreviewPanel';

interface DocumentPreviewProps {
  invoiceId: string;
  hasAttachment: boolean;
  invoiceData?: any;
  matchResults?: any[];
  poComparisonData?: any;
  hideLineComparison?: boolean;
  hideLineItems?: boolean;
  initialZoom?: number; // Allow customizing initial zoom level (default 0.75)
  onCollapseToggle?: () => void; // Callback when collapse button clicked
  isCollapsed?: boolean; // Current collapsed state
  isEditing?: boolean; // Whether details tab is in edit mode (for OCR highlights)
}

// Collapsible Document Preview for needs info mode
interface CollapsibleDocumentPreviewProps {
  documentContent: React.ReactNode;
  invoiceLines: any[];
  currency: string;
  invoiceId: string;
  matchResults: any[];
  poLines: any[];
}

function CollapsibleDocumentPreview({
  documentContent,
  invoiceLines,
  currency,
  invoiceId,
  matchResults,
  poLines
}: CollapsibleDocumentPreviewProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [expandedSize, setExpandedSize] = useState(50);
  const [isClient, setIsClient] = useState(false);

  // Load state from localStorage after mount
  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      const storedCollapsed = localStorage.getItem(`line-items-collapsed-${invoiceId}`);
      const storedSize = localStorage.getItem(`line-items-expanded-size-${invoiceId}`);

      if (storedCollapsed !== null) {
        setIsCollapsed(storedCollapsed === 'true');
      }
      if (storedSize) {
        setExpandedSize(parseInt(storedSize, 10));
      }
    }
  }, [invoiceId]);

  // Save state to localStorage when it changes
  useEffect(() => {
    if (isClient && typeof window !== 'undefined') {
      localStorage.setItem(`line-items-collapsed-${invoiceId}`, isCollapsed.toString());
      localStorage.setItem(`line-items-expanded-size-${invoiceId}`, expandedSize.toString());
    }
  }, [isCollapsed, expandedSize, invoiceId, isClient]);

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleSizeChange = (sizes: number[]) => {
    if (!isCollapsed && sizes[1]) {
      setExpandedSize(sizes[1]);
    }
  };

  if (isCollapsed) {
    // Collapsed state: fixed height layout
    return (
      <div className="h-full flex flex-col">
        {/* Document content takes up remaining space */}
        <div className="flex-1 overflow-hidden">
          {documentContent}
        </div>

        {/* Fixed height line items bar */}
        <div
          className="h-[49px] border-t border-gray-200 bg-white overflow-hidden transition-all duration-200"
        >
          <LineItemsPreviewPanel
            invoiceLines={invoiceLines}
            poLines={poLines}
            matchResults={matchResults}
            currency={currency}
            invoiceId={invoiceId}
            externallyControlled={true}
            externalCollapsed={true}
            onToggleCollapsed={handleToggle}
          />
        </div>
      </div>
    );
  }

  // Expanded state: use ResizablePanel
  return (
    <ResizablePanel
      defaultSizes={[100 - expandedSize, expandedSize]}
      minSizes={[30, 20]}
      maxSizes={[80, 70]}
      direction="vertical"
      storageKey={`invoice-preview-needs-info-expanded-${invoiceId}`}
      onSizeChange={handleSizeChange}
      className="h-full"
    >
      <div className="h-full">
        {documentContent}
      </div>
      <div className="h-full">
        <LineItemsPreviewPanel
          invoiceLines={invoiceLines}
          poLines={poLines}
          matchResults={matchResults}
          currency={currency}
          invoiceId={invoiceId}
          externallyControlled={true}
          externalCollapsed={false}
          onToggleCollapsed={handleToggle}
        />
      </div>
    </ResizablePanel>
  );
}

export function DocumentPreview({
  invoiceId,
  hasAttachment,
  invoiceData,
  matchResults = [],
  poComparisonData,
  hideLineComparison = false,
  hideLineItems = false,
  initialZoom = 0.75, // Default to 75% zoom
  onCollapseToggle,
  isCollapsed = false,
  isEditing = false
}: DocumentPreviewProps) {
  // Start with customizable zoom level (default 75%)
  const [zoom, setZoom] = useState(initialZoom);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isPdf, setIsPdf] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Zoom constraints
  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 3;
  const ZOOM_STEP = 0.25;

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 15) % 360);
  };

  const handleFitToScreen = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleDownload = () => {
    window.open(`/api/invoices/download/${invoiceId}`, '_blank');
  };

  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
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

  // Check if attachment is PDF
  useEffect(() => {
    if (hasAttachment && invoiceData?.attachments?.[0]?.media_type === 'application/pdf') {
      setIsPdf(true);
    }
  }, [hasAttachment, invoiceData]);

  // Show line items preview panel if we have invoice data and lines
  // Check both invoice_lines and lines properties for compatibility
  const invoiceLines = invoiceData?.invoice_lines || invoiceData?.lines || [];
  const showLineItemsPreview = invoiceLines && invoiceLines.length > 0;

  // In needs info mode, always show the panel to ensure consistent ResizablePanel structure
  // This prevents ResizablePanel from getting only 1 child during rendering transitions
  const shouldShowPanel = hideLineComparison || showLineItemsPreview;

  const documentContent = (
    <div
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-50 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50 bg-gray-900' : ''
      }`}
    >
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-white border-gray-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            disabled={zoom <= MIN_ZOOM}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-950"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-sm font-medium min-w-[60px] text-center text-gray-950">
            {Math.round(zoom * 100)}%
          </span>
          
          <button
            onClick={handleZoomIn}
            disabled={zoom >= MAX_ZOOM}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-gray-950"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="w-px h-6 bg-gray-300" />

          <button
            onClick={handleRotate}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-950"
            title="Rotate"
          >
            <RotateCw className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-950"
            title="Download Original"
          >
            <Download className="h-4 w-4" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-950"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            <Maximize2 className="h-4 w-4" />
          </button>

          {onCollapseToggle && !isFullscreen && (
            <>
              <div className="w-px h-6 bg-gray-300" />
              <button
                onClick={onCollapseToggle}
                className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-950"
                title="Collapse Preview Panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Document Display Area */}
      <div className="flex-1 overflow-auto p-4 relative bg-gray-100">
        {hasAttachment ? (
          <>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-950">Loading preview...</p>
                </div>
              </div>
            )}
            
            {imageError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <p className="text-red-600 mb-2">Failed to load preview</p>
                  <button
                    onClick={handleDownload}
                    className="text-sm text-purple-600 hover:text-purple-700 underline"
                  >
                    Download original document
                  </button>
                </div>
              </div>
            ) : isPdf ? (
              // Display PDF using PDFViewer with canvas
              <div 
                className="flex-1 overflow-auto"
                style={{
                  paddingTop: '20px',
                  paddingBottom: '20px',
                }}
              >
                <PDFViewer
                  url={`/api/invoices/${invoiceId}/preview`}
                  zoom={zoom}
                  rotation={rotation}
                  onLoad={() => setIsLoading(false)}
                  onError={() => {
                    setIsLoading(false);
                    setImageError(true);
                  }}
                />
              </div>
            ) : (
              // Display image with proper wrapper structure
              <div
                className="overflow-auto"
                style={{
                  height: '100%',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                {/* Positioning/zoom wrapper */}
                <div
                  style={{
                    display: 'inline-block',
                    transformOrigin: 'top center',
                    transform: `scale(${zoom})`,
                    transition: 'transform 200ms'
                  }}
                >
                  {/* Rotation wrapper */}
                  <div
                    style={{
                      transform: `rotate(${rotation}deg)`,
                      transformOrigin: 'center',
                      transition: 'transform 200ms'
                    }}
                  >
                    <img
                      ref={imageRef}
                      src={`/api/invoices/${invoiceId}/preview`}
                      alt="Invoice Document"
                      className="shadow-lg block"
                      style={{
                        maxWidth: zoom > 1 ? 'none' : '100%',
                        width: 'auto',
                        height: 'auto',
                      }}
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setIsLoading(false);
                        setImageError(true);
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // Show fake invoice document with proper wrapper structure
          <div
            className="overflow-auto"
            style={{
              height: '100%',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Positioning/zoom wrapper */}
            <div
              style={{
                display: 'inline-block',
                transformOrigin: 'top center',
                transform: `scale(${zoom})`,
                transition: 'transform 200ms'
              }}
            >
              {/* Rotation wrapper */}
              <div
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transformOrigin: 'center',
                  transition: 'transform 200ms'
                }}
              >
                {invoiceData ? (
                  <FakeInvoiceDocument invoice={invoiceData} scale={1} showOCRHighlights={isEditing} />
                ) : (
                  <div className="bg-white shadow-lg p-12 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-8 w-8 text-purple-600" />
                      <p className="text-gray-600">Invoice document will be displayed here</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // If hideLineItems is true, always just show the document
  if (hideLineItems) {
    return documentContent;
  }

  // If we have line items, wrap in resizable panel with preview at bottom
  if (shouldShowPanel) {
    // For needs info mode, use custom collapsible implementation
    if (hideLineComparison) {
      return <CollapsibleDocumentPreview
        documentContent={documentContent}
        invoiceLines={invoiceLines}
        currency={invoiceData?.currency || 'USD'}
        invoiceId={invoiceId}
        matchResults={[]}
        poLines={[]}
      />;
    }

    // For standard mode, use regular ResizablePanel
    return (
      <ResizablePanel
        defaultSizes={[85, 15]}
        minSizes={[50, 3]}
        direction="vertical"
        storageKey={`invoice-preview-${invoiceId}`}
        className="h-full"
      >
        <div className="h-full">
          {documentContent}
        </div>
        <div className="h-full">
          <LineItemsPreviewPanel
            invoiceLines={invoiceLines}
            poLines={poComparisonData?.poData?.lines || []}
            matchResults={matchResults}
            currency={invoiceData?.currency || 'USD'}
            invoiceId={invoiceId}
          />
        </div>
      </ResizablePanel>
    );
  }

  // Otherwise just return the document content
  return documentContent;
}