'use client';

import { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Download } from 'lucide-react';

interface DocumentPreviewProps {
  invoiceId: string;
  hasAttachment: boolean;
}

export function DocumentPreview({ invoiceId, hasAttachment }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    setRotation(prev => (prev + 90) % 360);
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

  if (!hasAttachment) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500 mb-2">No document attached</p>
          <p className="text-sm text-gray-400">Upload a document to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden ${
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

          <button
            onClick={handleFitToScreen}
            className="p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-950"
            title="Fit to Screen"
          >
            <Maximize2 className="h-4 w-4" />
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
        </div>
      </div>

      {/* Document Display Area */}
      <div className="flex-1 overflow-auto p-4 relative">
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
        ) : (
          <div 
            className="flex items-start justify-center min-h-full"
            style={{
              paddingTop: zoom > 1 ? '20px' : '0',
              paddingBottom: zoom > 1 ? '20px' : '0',
            }}
          >
            <img
              ref={imageRef}
              src={`/api/invoices/${invoiceId}/preview`}
              alt="Invoice Document"
              className="shadow-lg transition-transform duration-200"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center top',
                maxWidth: zoom > 1 ? 'none' : '100%',
                width: zoom > 1 ? 'auto' : '100%',
                height: 'auto',
              }}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setImageError(true);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}