'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, FileText, Loader2, Check, AlertCircle, X, Camera } from 'lucide-react';
import { useAnthropicVision } from '@/app/hooks/useAnthropicVision';
import type { InvoiceExtractionResult } from '@/lib/anthropic';

interface InvoiceScannerProps {
  onExtracted?: (data: InvoiceExtractionResult) => void;
  onSave?: (data: InvoiceExtractionResult) => void;
}

export function InvoiceScanner({ onExtracted, onSave }: InvoiceScannerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<InvoiceExtractionResult | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [isFileInputReady, setIsFileInputReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Ensure the file input is ready after mount
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      setIsFileInputReady(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const { loading, error, progress, extractInvoice, validateImageFile } = useAnthropicVision({
    onSuccess: (data) => {
      setExtractedData(data);
      onExtracted?.(data);
    },
    onError: (error) => {
      console.error('Extraction error:', error);
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', selectedFile.name, selectedFile.type, selectedFile.size);

    const validation = validateImageFile(selectedFile);
    if (!validation.valid) {
      alert(validation.error);
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // Set file and clear previous data
    setFile(selectedFile);
    setExtractedData(null);
    setPreview(null); // Clear old preview first

    // Create preview
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result as string;
      if (result) {
        setPreview(result);
        console.log('Preview created successfully');
      }
    };
    reader.onerror = () => {
      console.error('Error reading file');
      alert('Error reading file. Please try again.');
    };
    reader.readAsDataURL(selectedFile);
    
    // Don't reset the input value here - only reset on clear or after error
  }, [validateImageFile]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;

    const validation = validateImageFile(droppedFile);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    setFile(droppedFile);
    setExtractedData(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(droppedFile);
  }, [validateImageFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleExtract = async () => {
    if (!file) return;

    try {
      await extractInvoice(file);
    } catch (err) {
      // Error is handled by the hook
    }
  };

  const handleSave = () => {
    if (extractedData) {
      onSave?.(extractedData);
      // Reset after save
      setFile(null);
      setPreview(null);
      setExtractedData(null);
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    setExtractedData(null);
    setEditMode(false);
    // Ensure input is reset
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Area */}
      {!file && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-sm text-gray-600 mb-2">
            Drag and drop an invoice image here, or click to select
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Supports: JPEG, PNG, GIF, WebP (Max 10MB)
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Ensure input is ready and trigger click
                if (fileInputRef.current && isFileInputReady) {
                  // Reset value first to allow re-selecting the same file
                  fileInputRef.current.value = '';
                  // Small delay to ensure reset is processed
                  setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 10);
                } else {
                  console.warn('File input not ready');
                }
              }}
              disabled={!isFileInputReady}
              className="px-4 py-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="inline-block mr-2 h-4 w-4" />
              Select File
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // For camera capture on mobile devices
                if (fileInputRef.current && isFileInputReady) {
                  // Reset value first
                  fileInputRef.current.value = '';
                  fileInputRef.current.setAttribute('capture', 'environment');
                  // Small delay to ensure attribute is set
                  setTimeout(() => {
                    fileInputRef.current?.click();
                    // Remove capture attribute after triggering
                    setTimeout(() => {
                      fileInputRef.current?.removeAttribute('capture');
                    }, 100);
                  }, 10);
                } else {
                  console.warn('File input not ready for camera');
                }
              }}
              disabled={!isFileInputReady}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="inline-block mr-2 h-4 w-4" />
              Take Photo
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            multiple={false}
          />
        </div>
      )}

      {/* Preview and Actions */}
      {file && preview && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Invoice Preview</h3>
            <button
              onClick={handleClear}
              className="text-gray-500 hover:text-red-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Preview */}
            <div>
              <img
                src={preview}
                alt="Invoice preview"
                className="w-full h-auto rounded border"
              />
              <p className="text-sm text-gray-500 mt-2">{file.name}</p>
            </div>

            {/* Extraction Status/Results */}
            <div>
              {!extractedData && !loading && (
                <div className="flex flex-col items-center justify-center h-full">
                  <button
                    onClick={handleExtract}
                    className="px-6 py-3 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                  >
                    <FileText className="inline-block mr-2 h-5 w-5" />
                    Extract Invoice Data
                  </button>
                </div>
              )}

              {loading && (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-600 mb-4" />
                  <p className="text-sm text-gray-600">Analyzing invoice...</p>
                  {progress > 0 && (
                    <div className="w-full mt-4">
                      <div className="bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">{progress}%</p>
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Extraction Failed</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extracted Data */}
      {extractedData && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Extracted Invoice Data</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setEditMode(!editMode)}
                className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                {editMode ? 'View' : 'Edit'}
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                <Check className="inline-block mr-1 h-4 w-4" />
                Save
              </button>
            </div>
          </div>

          <div className="space-y-4 text-sm">
            {/* Confidence Score */}
            <div className="flex items-center gap-2">
              <span className="font-medium">Confidence:</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${(extractedData.confidence || 0) * 100}%` }}
                />
              </div>
              <span>{Math.round((extractedData.confidence || 0) * 100)}%</span>
            </div>

            {/* Vendor Information */}
            {extractedData.vendor && (
              <div>
                <h4 className="font-semibold mb-2">Vendor</h4>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <div>Name: {extractedData.vendor.name}</div>
                  {extractedData.vendor.address && <div>Address: {extractedData.vendor.address}</div>}
                  {extractedData.vendor.email && <div>Email: {extractedData.vendor.email}</div>}
                  {extractedData.vendor.phone && <div>Phone: {extractedData.vendor.phone}</div>}
                </div>
              </div>
            )}

            {/* Invoice Details */}
            {extractedData.invoice && (
              <div>
                <h4 className="font-semibold mb-2">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <div>Number: {extractedData.invoice.number}</div>
                  <div>Date: {extractedData.invoice.date}</div>
                  {extractedData.invoice.dueDate && <div>Due Date: {extractedData.invoice.dueDate}</div>}
                  {extractedData.invoice.poNumber && <div>PO Number: {extractedData.invoice.poNumber}</div>}
                </div>
              </div>
            )}

            {/* Line Items */}
            {extractedData.items && extractedData.items.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Line Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-2 py-1 text-left text-xs font-medium text-gray-500">Description</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Qty</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Unit Price</th>
                        <th className="px-2 py-1 text-right text-xs font-medium text-gray-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {extractedData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1 text-sm">{item.description}</td>
                          <td className="px-2 py-1 text-sm text-right">{item.quantity || '-'}</td>
                          <td className="px-2 py-1 text-sm text-right">
                            {item.unitPrice ? `$${item.unitPrice.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 py-1 text-sm text-right">${item.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            {extractedData.totals && (
              <div>
                <h4 className="font-semibold mb-2">Totals</h4>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <div>Subtotal: {extractedData.totals.currency} {extractedData.totals.subtotal?.toFixed(2)}</div>
                  {extractedData.totals.tax && <div>Tax: {extractedData.totals.currency} {extractedData.totals.tax.toFixed(2)}</div>}
                  {extractedData.totals.discount && <div>Discount: {extractedData.totals.currency} {extractedData.totals.discount.toFixed(2)}</div>}
                  <div className="font-semibold">Total: {extractedData.totals.currency} {extractedData.totals.total?.toFixed(2)}</div>
                </div>
              </div>
            )}

            {/* Payment Terms */}
            {extractedData.paymentTerms && (
              <div>
                <h4 className="font-semibold mb-2">Payment Terms</h4>
                <p className="pl-4">{extractedData.paymentTerms}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}