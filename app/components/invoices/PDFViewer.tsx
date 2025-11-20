'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Extend Window interface for PDF.js library loaded from CDN
declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

interface PDFViewerProps {
  url: string;
  zoom: number;
  rotation: number;
  onLoad?: () => void;
  onError?: () => void;
  onDimensionsAvailable?: (width: number, height: number) => void;
}

export function PDFViewer({ url, zoom, rotation, onLoad, onError, onDimensionsAvailable }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageRendering, setPageRendering] = useState(false);
  const [pageNumPending, setPageNumPending] = useState<number | null>(null);
  const renderTaskRef = useRef<any>(null);
  const isRenderingRef = useRef(false);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  // Load PDF.js library on client side only
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Dynamically load PDF.js to avoid SSR issues
    const loadPdfJs = async () => {
      try {
        if (window.pdfjsLib) {
          // Already loaded
          setPdfjsLib(window.pdfjsLib);
          return;
        }

        // Create script tag to load PDF.js (legacy version for script tag usage)
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;

        script.onload = () => {
          const pdfjs = window.pdfjsLib;
          if (pdfjs) {
            pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            setPdfjsLib(pdfjs);
          }
        };

        script.onerror = () => {
          console.error('Failed to load PDF.js');
          if (onError) onError();
        };

        document.head.appendChild(script);
      } catch (error) {
        console.error('Error setting up PDF.js:', error);
        if (onError) onError();
      }
    };

    loadPdfJs();
  }, [onError]);

  // Load PDF document
  useEffect(() => {
    if (!pdfjsLib || !url) return;

    let isMounted = true;

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;

        if (!isMounted) return;

        setPdfDoc(pdf);
        setPageNum(1);
        if (onLoad) onLoad();
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (isMounted && onError) onError();
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [url, pdfjsLib, onLoad, onError]);

  // Render a specific page
  const renderPage = useCallback(async (num: number, pdf: any, currentZoom: number, currentRotation: number) => {
    if (!pdf || !canvasRef.current) return;

    // If already rendering, queue this request
    if (isRenderingRef.current) {
      setPageNumPending(num);
      return;
    }

    // Cancel any existing render task
    if (renderTaskRef.current) {
      try {
        await renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      renderTaskRef.current = null;
    }

    isRenderingRef.current = true;
    setPageRendering(true);

    try {
      // Get page
      const page = await pdf.getPage(num);

      // Calculate rotation in degrees
      const rotationAngle = currentRotation % 360;
      const rotate = page.rotate + rotationAngle;

      // Get device pixel ratio for high DPI displays
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Apply device pixel ratio to scale for sharper rendering
      const scale = currentZoom * devicePixelRatio;

      // Get viewport with zoom and rotation
      const viewport = page.getViewport({ scale: scale, rotation: rotate });

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) return;

      // Set canvas dimensions with device pixel ratio
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Set CSS dimensions to maintain original size
      canvas.style.width = `${viewport.width / devicePixelRatio}px`;
      canvas.style.height = `${viewport.height / devicePixelRatio}px`;

      // Render PDF page into canvas context
      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      renderTaskRef.current = page.render(renderContext);
      await renderTaskRef.current.promise;
      renderTaskRef.current = null;

      // Calculate and report natural dimensions (at 100% zoom, no rotation)
      if (onDimensionsAvailable) {
        const naturalViewport = page.getViewport({ scale: 1.0, rotation: 0 });
        onDimensionsAvailable(naturalViewport.width, naturalViewport.height);
      }

      isRenderingRef.current = false;
      setPageRendering(false);

      // If another page rendering was requested, render it
      if (pageNumPending !== null) {
        const pending = pageNumPending;
        setPageNumPending(null);
        renderPage(pending, pdf, currentZoom, currentRotation);
      }
    } catch (error: any) {
      // Only log errors that aren't cancellations
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
      isRenderingRef.current = false;
      setPageRendering(false);
      renderTaskRef.current = null;
    }
  }, []);

  // Re-render when zoom, rotation, or pageNum changes
  useEffect(() => {
    if (pdfDoc && pageNum) {
      renderPage(pageNum, pdfDoc, zoom, rotation);
    }
  }, [zoom, rotation, pdfDoc, pageNum, renderPage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending render task when component unmounts
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        renderTaskRef.current = null;
      }
      isRenderingRef.current = false;
    };
  }, []);

  if (!pdfjsLib) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-900 mx-auto mb-2"></div>
          <p className="text-sm text-gray-950">Loading PDF viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center min-h-full overflow-auto">
      <div className="bg-white shadow-lg inline-block">
        <canvas
          ref={canvasRef}
          className="block"
        />
      </div>
    </div>
  );
}