'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker from local file
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
}

interface PDFViewerProps {
  url: string;
  zoom: number;
  rotation: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function PDFViewer({ url, zoom, rotation, onLoad, onError }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNum, setPageNum] = useState(1);
  const [pageRendering, setPageRendering] = useState(false);
  const [pageNumPending, setPageNumPending] = useState<number | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF document
  useEffect(() => {
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        renderPage(1, pdf, zoom, rotation);
        if (onLoad) onLoad();
      } catch (error) {
        console.error('Error loading PDF:', error);
        if (onError) onError();
      }
    };

    loadPdf();
  }, [url]);

  // Render a specific page
  const renderPage = useCallback(async (num: number, pdf: any, currentZoom: number, currentRotation: number) => {
    if (!pdf || !canvasRef.current) return;

    // Cancel any existing render task
    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      renderTaskRef.current = null;
    }

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

      setPageRendering(false);

      // If another page rendering was requested, render it
      if (pageNumPending !== null) {
        renderPage(pageNumPending, pdf, currentZoom, currentRotation);
        setPageNumPending(null);
      }
    } catch (error: any) {
      // Only log errors that aren't cancellations
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
      setPageRendering(false);
      renderTaskRef.current = null;
    }
  }, []);

  // Re-render when zoom or rotation changes
  useEffect(() => {
    if (pdfDoc) {
      if (pageRendering) {
        setPageNumPending(pageNum);
      } else {
        renderPage(pageNum, pdfDoc, zoom, rotation);
      }
    }
  }, [zoom, rotation, pdfDoc, pageNum]);

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
      }
    };
  }, []);

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